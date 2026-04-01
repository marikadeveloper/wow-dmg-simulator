import type { GearItem, SimcProfile, CombinationSpec } from './types';
import {
  TIER_SLOT_ORDER,
  getTierSetId,
  getTierItemIdForSlot,
} from './presets/season-config';

/**
 * Generate Catalyst-converted tier copies for non-tier items in tier slots.
 *
 * For each selected item in a tier slot (head, shoulder, chest, hands, legs)
 * that is NOT already a tier piece, creates a copy with the tier item ID
 * while preserving the original bonus_ids (which encode ilvl / gear track).
 *
 * @param profile The parsed character profile (needs className for tier set lookup)
 * @param selection Current gear selection keys (e.g. "head:0")
 * @returns Map of slot → catalyst GearItem[] to append to each slot
 */
export function generateCatalystItems(
  profile: SimcProfile,
  selection: Set<string>,
): Map<string, GearItem[]> {
  const result = new Map<string, GearItem[]>();
  const className = profile.className;
  if (!className) return result;

  for (const slot of TIER_SLOT_ORDER) {
    const items = profile.gear[slot];
    if (!items) continue;

    const tierItemId = getTierItemIdForSlot(className, slot);
    if (!tierItemId) continue;

    for (let i = 0; i < items.length; i++) {
      if (!selection.has(`${slot}:${i}`)) continue;

      // Skip items that are already tier pieces
      if (getTierSetId(items[i].id)) continue;

      // Skip items that are already catalyst copies
      if (items[i].isCatalyst) continue;

      const catalystItem: GearItem = {
        ...items[i],
        id: tierItemId,
        name: undefined, // clear so UI resolves the tier piece name from cache
        isEquipped: false,
        isVault: false,
        isUpgraded: false,
        isCatalyst: true,
      };

      const existing = result.get(slot) ?? [];
      existing.push(catalystItem);
      result.set(slot, existing);
    }
  }

  return result;
}

/**
 * Count how many catalyst-converted items are used in a combination.
 *
 * Catalyst options are identified by the "catalyst_" prefix in their option ID,
 * set by gear-axes.ts when building options from isCatalyst items.
 */
export function countCatalystItemsInCombo(
  combo: CombinationSpec,
): number {
  let count = 0;
  for (const optionId of Object.values(combo.axes)) {
    if (optionId.startsWith('catalyst_')) count++;
  }
  return count;
}

/**
 * Filter combinations that exceed the catalyst charge limit.
 *
 * @param combinations All generated combinations
 * @param maxCharges Maximum number of catalyst-converted items allowed (0–5)
 * @returns Filtered combinations within the catalyst budget
 */
export function filterCombinationsByCatalystCharges(
  combinations: CombinationSpec[],
  maxCharges: number,
): CombinationSpec[] {
  if (maxCharges >= TIER_SLOT_ORDER.length) return combinations; // 5 tier slots max

  return combinations.filter((combo) => {
    return countCatalystItemsInCombo(combo) <= maxCharges;
  });
}
