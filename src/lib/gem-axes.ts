import type { SimcProfile, OptimizationAxis, OptimizationOption } from './types';
import { GEM_PRESETS, type GemPreset } from './presets/season-config';

const GEM_BY_ID = new Map<number, GemPreset>(GEM_PRESETS.map((g) => [g.id, g]));

/**
 * Build conditional gem OptimizationAxis[] for all selected items that have sockets.
 *
 * Each axis is conditional on its parent item (via parentItemId) so the combinator
 * only includes gem permutations for items that are actually selected in a given combo.
 *
 * @param profile  - Parsed SimC profile
 * @param selection - Set of "slot:index" keys for selected items
 * @param gemIdsToTry - Gem IDs the user wants to compare across all sockets
 */
export function buildGemAxes(
  profile: SimcProfile,
  selection: Set<string>,
  gemIdsToTry: number[],
): OptimizationAxis[] {
  if (gemIdsToTry.length === 0) return [];

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
    if (!items) continue;

    for (const idx of indices) {
      if (idx >= items.length) continue;
      const item = items[idx];
      const socketCount = item.gemIds.length;
      if (socketCount === 0) continue;

      // Create one axis per socket on this item
      for (let s = 0; s < socketCount; s++) {
        const options: OptimizationOption[] = gemIdsToTry.map((gemId) => {
          const preset = GEM_BY_ID.get(gemId);
          return {
            id: `gem_${gemId}`,
            label: preset?.name ?? `Gem #${gemId}`,
            simcLines: [], // gems are merged into item lines by profileset builder
          };
        });

        axes.push({
          id: `gem:${slot}:${item.id}:socket_${s}`,
          label: `${slot} socket ${s + 1} (${item.name ?? `#${item.id}`})`,
          options,
          parentItemId: item.id,
          parentSlot: slot,
        });
      }
    }
  }

  return axes;
}
