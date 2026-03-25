import type { SimcProfile, OptimizationAxis, OptimizationOption } from './types';

/**
 * Build OptimizationAxis[] from the current gear selection.
 *
 * A slot with N>1 selected items produces one axis with N options.
 * A slot with 0 or 1 selected items produces no axis (nothing to vary).
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

  for (const [slot, indices] of selectedBySlot) {
    const items = profile.gear[slot];
    if (!items || indices.length <= 1) continue;

    const options: OptimizationOption[] = indices
      .filter((idx) => idx < items.length)
      .map((idx) => {
        const item = items[idx];
        // Build the SimC gear line for this item
        const parts = [`${slot}=,id=${item.id}`];
        if (item.bonusIds.length > 0) {
          parts.push(`bonus_id=${item.bonusIds.join('/')}`);
        }
        if (item.gemIds.length > 0) {
          parts.push(`gem_id=${item.gemIds.join('/')}`);
        }
        if (item.enchantId != null) {
          parts.push(`enchant_id=${item.enchantId}`);
        }

        return {
          id: `item_${item.id}`,
          label: item.name ?? `Item #${item.id}`,
          simcLines: [parts.join(',')],
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
