# Gem & Enchant Axis Generation — Detailed Rules

This document covers the non-obvious complexity in how gem and enchant
optimization axes are generated relative to gear selection. Get this wrong
and the combinations will be incorrect.

---

## The Core Problem: Gems Are Per-Item, Not Per-Slot

Enchants are per-slot (any item in that slot uses the same enchant).
Gems are per-item (different items in the same slot may have different socket counts).

### Example

```
Slot: head
  Item A (equipped): id=235602 — has 1 socket
  Item B (bag):      id=229379 — has 2 sockets
  Item C (bag):      id=219332 — has 0 sockets

Gem options to try: [Mastery gem, Haste gem]
```

When item A is selected, 1 gem axis applies: `gem:head:socket_0` with 2 options.
When item B is selected, 2 gem axes apply: `gem:head:socket_0` and `gem:head:socket_1`.
When item C is selected, 0 gem axes apply (no sockets).

The total combinations involving the head slot are:

- Item A: 2 (one gem per option)
- Item B: 2 × 2 = 4 (two independent sockets)
- Item C: 1 (no gems to vary)
  Total head axis contribution: 7 combinations

---

## How to Model This: Per-Item Gem Axes

Gems must NOT be modelled as slot-level axes. They must be modelled as
item-level axes that are only "active" when their parent item is selected.

### Updated OptimizationAxis model

```typescript
interface OptimizationAxis {
  id: string;
  label: string;
  options: OptimizationOption[];
  parentItemId?: number; // if set, this axis only applies when this item is chosen
  parentSlot?: string; // the slot this axis belongs to
}
```

### Building axes for a slot

```typescript
function buildGearAndGemAxes(
  slot: string,
  selectedItems: GearItem[],
  gemOptionsToTry: number[], // list of gem IDs the user wants to try
): OptimizationAxis[] {
  const axes: OptimizationAxis[] = [];

  // If >1 item is selected, create a gear axis for this slot
  if (selectedItems.length > 1) {
    axes.push({
      id: `slot:${slot}`,
      label: slotLabel(slot),
      options: selectedItems.map((item) => ({
        id: `item_${item.id}`,
        label: `${item.name ?? `Item #${item.id}`} (ilvl ${item.ilvl ?? '?'})`,
        simcLines: [buildItemLine(slot, item)],
      })),
    });
  }

  // For each selected item, if it has sockets, create per-socket gem axes
  for (const item of selectedItems) {
    const numSockets = item.gemIds.length;
    for (let s = 0; s < numSockets; s++) {
      axes.push({
        id: `gem:${slot}:${item.id}:socket_${s}`,
        label: `${slotLabel(slot)} socket ${s + 1} (${item.name ?? `#${item.id}`})`,
        parentItemId: item.id,
        parentSlot: slot,
        options: gemOptionsToTry.map((gemId) => ({
          id: `gem_${gemId}`,
          label:
            gemPresets.find((g) => g.id === gemId)?.name ?? `Gem #${gemId}`,
          simcLines: [], // gem lines are NOT standalone — they modify the item line
          gemId,
          socketIndex: s,
        })),
      });
    }
  }

  return axes;
}
```

### Combining item + gem options in the profileset line

Since gems are part of the item line (`gem_id=213743/213744`), the profileset
builder must combine the item selection and gem selections into a single line:

```typescript
function buildItemLineWithGems(
  slot: string,
  item: GearItem,
  selectedGems: number[], // one per socket, in order
): string {
  let line = `${slot}=,id=${item.id}`;
  if (item.bonusIds.length > 0) line += `,bonus_id=${item.bonusIds.join('/')}`;
  if (selectedGems.length > 0) line += `,gem_id=${selectedGems.join('/')}`;
  if (item.enchantId) line += `,enchant_id=${item.enchantId}`;
  return line;
}
```

---

## Combination Generator — Handling Conditional Axes

The combination generator must handle the fact that gem axes are conditional:
a gem axis for item B should only appear in combinations where item B is selected
in that slot.

### Algorithm

```
1. Separate axes into two groups:
   a. Unconditional axes (gear slot axes, enchant axes)
   b. Conditional axes (gem axes — have parentItemId)

2. For each unconditional combination (cartesian product of unconditional axes):
   a. Determine which items were selected per slot
   b. Find all conditional axes whose parentItemId matches a selected item
   c. Compute the cartesian product of THOSE conditional axes
   d. For each conditional sub-combination, merge with the unconditional combo
   e. Yield the merged combination

3. Each yielded combination has a flat dict: axisId → optionId
4. The ProfileSet builder converts this to override SimC lines
```

This sounds complex but the implementation is straightforward: it is a nested
cartesian product where the inner axes depend on the outer choices.

---

## Enchant Axes — Simple Case

Enchant axes are unconditional and per-slot. They do not depend on which item
is in the slot (the enchant applies to whatever item ends up there).

```typescript
function buildEnchantAxes(
  slot: string,
  currentEnchantId: number | undefined,
  enchantOptionsToTry: number[], // from user selection
  includeNoEnchant: boolean = true,
): OptimizationAxis | null {
  if (!ENCHANTABLE_SLOTS.includes(slot)) return null;
  if (enchantOptionsToTry.length === 0) return null;

  const options: OptimizationOption[] = [];

  // Always include "no enchant" option if requested
  if (includeNoEnchant) {
    options.push({
      id: 'enchant_none',
      label: 'No enchant',
      simcLines: [], // signal to omit enchant_id from the item line
    });
  }

  for (const enchantId of enchantOptionsToTry) {
    options.push({
      id: `enchant_${enchantId}`,
      label:
        enchantPresets.find((e) => e.id === enchantId)?.name ??
        `Enchant #${enchantId}`,
      simcLines: [], // enchant is merged into the item line by the profileset builder
      enchantId,
    });
  }

  return {
    id: `enchant:${slot}`,
    label: `${slotLabel(slot)} Enchant`,
    options,
  };
}
```

### Enchant slots (TWW / The War Within)

```typescript
export const ENCHANTABLE_SLOTS = [
  'neck',
  'back',
  'chest',
  'wrist',
  'hands',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'main_hand',
  'off_hand',
] as const;
```

Note: `head`, `shoulder`, `waist`, `trinket1`, `trinket2` are NOT enchantable.

---

## ProfileSet Line Generation — Full Rules

When building the profileset override lines for a combination, the builder must:

1. For each slot that has any change from the base profile:
   - Determine the selected item (from gear axis, or the currently-equipped item if no gear axis)
   - Determine the selected gems per socket (from gem axes, or the item's current gems)
   - Determine the selected enchant (from enchant axis, or the item's current enchant)
   - Build ONE combined item line: `slot=,id=N,bonus_id=...,gem_id=...,enchant_id=...`

2. Only include a slot in the profileset if at least one of its values differs from the base

3. A combination that has NO overrides (= the currently equipped state) is the base profile
   — it must NOT be added as a profileset entry

---

## Combination Explosion with Gems + Enchants

This is where users can easily create thousands of combinations accidentally.
The UI must show per-category contribution to the total:

```
Gear (trinkets × rings):    2 × 3 = 6
Gems (head socket 1):       × 3 = 18
Gems (head socket 2):       × 3 = 54    ← only if item B chosen, which has 2 sockets
Enchants (ring1 × ring2):   × 4 × 4 = 864
────────────────────────────────────────
Total: 864 combinations  ⚠ WARNING: will take ~72 minutes
```

The combination count display should break down contributions by category, not just
show a total, so the user knows which axis is causing the explosion.
