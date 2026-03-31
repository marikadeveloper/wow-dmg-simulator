import type { SimcProfile, GearItem, OptimizationAxis, OptimizationOption } from './types';

/** Paired slots that should be merged into one axis with pair options. */
const PAIRED_SLOTS: Record<string, [string, string]> = {
  rings: ['finger1', 'finger2'],
  trinkets: ['trinket1', 'trinket2'],
};

/** The set of real SimC slots that are handled by pair axes (skip in normal axes). */
const PAIRED_REAL_SLOTS = new Set(
  Object.values(PAIRED_SLOTS).flat(),
);

/**
 * Build a SimC gear line for an item, assigning it to a specific target slot.
 */
export function buildItemSimcLine(item: GearItem, targetSlot: string): string {
  const parts = [`${targetSlot}=,id=${item.id}`];
  if (item.bonusIds.length > 0) {
    parts.push(`bonus_id=${item.bonusIds.join('/')}`);
  }
  // For unowned items, set ilevel directly so SimC uses the user-specified ilvl
  if (item.isUnowned && item.ilvl != null) {
    parts.push(`ilevel=${item.ilvl}`);
  }
  if (item.gemIds.length > 0) {
    parts.push(`gem_id=${item.gemIds.join('/')}`);
  }
  if (item.enchantId != null) {
    parts.push(`enchant_id=${item.enchantId}`);
  }
  return parts.join(',');
}

/**
 * Build OptimizationAxis[] from the current gear selection.
 *
 * A slot with N>1 selected items produces one axis with N options.
 * A slot with 0 or 1 selected items produces no axis (nothing to vary).
 *
 * Ring slots (finger1/finger2) are merged into a single "rings" axis
 * that generates all unique pair combinations.
 *
 * This is the "gear" layer of the optimization assembler.
 * Gem and enchant axes are added separately and compose with these.
 */
export function buildGearAxes(
  profile: SimcProfile,
  selection: Set<string>,
): OptimizationAxis[] {
  const axes: OptimizationAxis[] = [];

  // Group selection keys by slot
  const selectedBySlot = new Map<string, number[]>();
  for (const key of selection) {
    const [slot, idxStr] = key.split(':');
    const idx = Number(idxStr);
    if (!selectedBySlot.has(slot)) selectedBySlot.set(slot, []);
    selectedBySlot.get(slot)!.push(idx);
  }

  // ── Handle paired slots (rings) ──────────────────────────────────────────
  for (const [pairName, [slotA, slotB]] of Object.entries(PAIRED_SLOTS)) {
    const itemsA = (selectedBySlot.get(slotA) ?? [])
      .filter((idx) => idx < (profile.gear[slotA]?.length ?? 0))
      .map((idx) => profile.gear[slotA][idx]);
    const itemsB = (selectedBySlot.get(slotB) ?? [])
      .filter((idx) => idx < (profile.gear[slotB]?.length ?? 0))
      .map((idx) => profile.gear[slotB][idx]);

    const allItems = [...itemsA, ...itemsB];
    if (allItems.length < 2) continue;

    // Generate all C(N,2) unordered pairs
    const options: OptimizationOption[] = [];
    for (let i = 0; i < allItems.length; i++) {
      for (let j = i + 1; j < allItems.length; j++) {
        const a = allItems[i];
        const b = allItems[j];
        options.push({
          id: `pair_${a.id}_${b.id}`,
          label: `${a.name ?? `#${a.id}`} + ${b.name ?? `#${b.id}`}`,
          simcLines: [
            buildItemSimcLine(a, slotA),
            buildItemSimcLine(b, slotB),
          ],
        });
      }
    }

    // Only create an axis if there are 2+ pair options (something to vary)
    if (options.length >= 2) {
      axes.push({
        id: `slot:${pairName}`,
        label: pairName,
        options,
      });
    }
  }

  // ── Handle weapon slots (main_hand + off_hand) when 2H weapons are involved ─
  {
    const mhIndices = selectedBySlot.get('main_hand') ?? [];
    const ohIndices = selectedBySlot.get('off_hand') ?? [];
    const mhItems = mhIndices
      .filter((idx) => idx < (profile.gear.main_hand?.length ?? 0))
      .map((idx) => ({ item: profile.gear.main_hand[idx], idx }));
    const ohItems = ohIndices
      .filter((idx) => idx < (profile.gear.off_hand?.length ?? 0))
      .map((idx) => ({ item: profile.gear.off_hand[idx], idx }));

    const hasTwoHand = mhItems.some(({ item }) => item.isTwoHand);
    const profileHasOffHand = (profile.gear.off_hand?.length ?? 0) > 0;

    // Only need special weapon handling if we have 2H weapons AND an off_hand exists
    if (hasTwoHand && (ohItems.length > 0 || profileHasOffHand)) {
      const options: OptimizationOption[] = [];

      for (const { item: mh, idx } of mhItems) {
        if (mh.isTwoHand) {
          // 2H weapon: clear the off_hand slot
          const prefix = mh.isCatalyst ? 'catalyst' : 'item';
          options.push({
            id: `${prefix}_${mh.id}_${idx}`,
            label: mh.name ?? `Item #${mh.id}`,
            simcLines: [buildItemSimcLine(mh, 'main_hand'), 'off_hand=,'],
          });
        } else if (ohItems.length > 0) {
          // 1H weapon: pair with each selected off_hand
          for (const { item: oh, idx: ohIdx } of ohItems) {
            // If both items are equipped, this pair is the baseline — use empty
            // simcLines so the combinator can identify it as the no-override combo
            const isBaseline = mh.isEquipped && oh.isEquipped;
            options.push({
              id: `pair_${mh.id}_${idx}_${oh.id}_${ohIdx}`,
              label: `${mh.name ?? `#${mh.id}`} + ${oh.name ?? `#${oh.id}`}`,
              simcLines: isBaseline
                ? []
                : [
                    buildItemSimcLine(mh, 'main_hand'),
                    buildItemSimcLine(oh, 'off_hand'),
                  ],
            });
          }
        } else {
          // 1H weapon with no off_hand alternatives selected: just set main_hand
          const prefix = mh.isCatalyst ? 'catalyst' : 'item';
          options.push({
            id: `${prefix}_${mh.id}_${idx}`,
            label: mh.name ?? `Item #${mh.id}`,
            simcLines: [buildItemSimcLine(mh, 'main_hand')],
          });
        }
      }

      if (options.length >= 2) {
        axes.push({
          id: 'slot:weapons',
          label: 'weapons',
          options,
        });
      }

      // Mark weapon slots as handled so the normal loop skips them
      selectedBySlot.delete('main_hand');
      selectedBySlot.delete('off_hand');
    }
  }

  // ── Handle normal (non-paired) slots ─────────────────────────────────────
  for (const [slot, indices] of selectedBySlot) {
    // Skip slots that are handled by pair axes
    if (PAIRED_REAL_SLOTS.has(slot)) continue;

    const items = profile.gear[slot];
    if (!items || indices.length <= 1) continue;

    const options: OptimizationOption[] = indices
      .filter((idx) => idx < items.length)
      .map((idx) => {
        const item = items[idx];
        const prefix = item.isCatalyst ? 'catalyst' : 'item';
        return {
          id: `${prefix}_${item.id}_${idx}`,
          label: item.name ?? `Item #${item.id}`,
          // Equipped items match the base profile — empty simcLines so the
          // combinator can identify the baseline (no-override) combination
          simcLines: item.isEquipped ? [] : [buildItemSimcLine(item, slot)],
        };
      });

    axes.push({
      id: `slot:${slot}`,
      label: slot,
      options,
    });
  }

  return axes;
}
