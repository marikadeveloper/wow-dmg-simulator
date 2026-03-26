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

    axes.push({
      id: `slot:${pairName}`,
      label: pairName,
      options,
    });
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
        return {
          id: `item_${item.id}`,
          label: item.name ?? `Item #${item.id}`,
          simcLines: [buildItemSimcLine(item, slot)],
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
