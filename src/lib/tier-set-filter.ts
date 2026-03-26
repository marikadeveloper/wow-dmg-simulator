import type { SimcProfile, CombinationSpec } from './types';
import { getTierSetId, getTierSetById, type TierSetDefinition } from './presets/season-config';

// ── Tier set requirements ────────────────────────────────────────────────────

/** User-configured minimum piece count per tier set. */
export type TierSetMinimums = Map<string, number>; // tierSetId → minPieces (0, 2, or 4)

// ── Detection ────────────────────────────────────────────────────────────────

export interface DetectedTierSet {
  definition: TierSetDefinition;
  /** How many pieces of this set are in the user's profile (equipped + bag). */
  totalPieces: number;
  /** How many pieces are currently equipped. */
  equippedPieces: number;
}

/**
 * Scan all items in the profile to detect which tier sets are present.
 * Returns only sets where the user has at least 1 piece.
 */
export function detectTierSets(profile: SimcProfile): DetectedTierSet[] {
  const setCounts = new Map<string, { total: number; equipped: number }>();

  for (const items of Object.values(profile.gear)) {
    for (const item of items) {
      const setId = getTierSetId(item.id);
      if (!setId) continue;

      const existing = setCounts.get(setId) ?? { total: 0, equipped: 0 };
      existing.total++;
      if (item.isEquipped) existing.equipped++;
      setCounts.set(setId, existing);
    }
  }

  const results: DetectedTierSet[] = [];
  for (const [setId, counts] of setCounts) {
    const def = getTierSetById(setId);
    if (!def) continue;
    results.push({
      definition: def,
      totalPieces: counts.total,
      equippedPieces: counts.equipped,
    });
  }

  // Sort by name for stable ordering
  results.sort((a, b) => a.definition.name.localeCompare(b.definition.name));
  return results;
}

// ── Combination filtering ────────────────────────────────────────────────────

/** The tier-relevant slots in WoW: head, shoulder, chest, hands, legs. */
const TIER_SLOTS = ['head', 'shoulder', 'chest', 'hands', 'legs'] as const;

/**
 * Resolve which item ID occupies a given slot in a combination.
 *
 * Checks the combination's axes for a slot axis ("slot:<name>") and extracts
 * the item ID. If no axis exists for that slot, falls back to the equipped item.
 *
 * For paired slots (rings, trinkets), checks the pair axis option IDs.
 */
function resolveItemIdForSlot(
  slot: string,
  combo: CombinationSpec,
  profile: SimcProfile,
): number | null {
  // Check direct slot axis (e.g. "slot:head" → "item_12345")
  const directAxisValue = combo.axes[`slot:${slot}`];
  if (directAxisValue) {
    const match = directAxisValue.match(/^item_(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }

  // Check pair axes (e.g. "slot:rings" → "pair_111_222" or "slot:trinkets" → "pair_111_222")
  for (const [axisId, optionId] of Object.entries(combo.axes)) {
    if (!axisId.startsWith('slot:')) continue;
    // Pair options: "pair_<idA>_<idB>"
    const pairMatch = optionId.match(/^pair_(\d+)_(\d+)$/);
    if (!pairMatch) continue;

    const idA = parseInt(pairMatch[1], 10);
    const idB = parseInt(pairMatch[2], 10);

    // Determine which pair this axis covers
    const pairSlot = axisId.slice(5); // "rings" or "trinkets"
    if (pairSlot === 'rings') {
      if (slot === 'finger1') return idA;
      if (slot === 'finger2') return idB;
    } else if (pairSlot === 'trinkets') {
      if (slot === 'trinket1') return idA;
      if (slot === 'trinket2') return idB;
    }
  }

  // No axis for this slot — use the equipped item
  const items = profile.gear[slot];
  if (!items || items.length === 0) return null;
  const equipped = items.find((i) => i.isEquipped) ?? items[0];
  return equipped.id;
}

/**
 * Count how many pieces of each tier set are present in a combination.
 */
function countTierSetPieces(
  combo: CombinationSpec,
  profile: SimcProfile,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const slot of TIER_SLOTS) {
    const itemId = resolveItemIdForSlot(slot, combo, profile);
    if (itemId == null) continue;

    const setId = getTierSetId(itemId);
    if (!setId) continue;

    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }

  return counts;
}

/**
 * Filter combinations that don't meet tier set minimums.
 *
 * @param combinations All generated combinations
 * @param profile The parsed character profile
 * @param minimums Tier set minimum piece requirements (setId → minPieces)
 * @returns Filtered combinations that meet all tier set requirements
 */
export function filterCombinationsByTierSets(
  combinations: CombinationSpec[],
  profile: SimcProfile,
  minimums: TierSetMinimums,
): CombinationSpec[] {
  // No filters active — return all
  const activeMinimums = [...minimums.entries()].filter(([, min]) => min > 0);
  if (activeMinimums.length === 0) return combinations;

  return combinations.filter((combo) => {
    const pieces = countTierSetPieces(combo, profile);

    for (const [setId, minRequired] of activeMinimums) {
      const actual = pieces.get(setId) ?? 0;
      if (actual < minRequired) return false;
    }

    return true;
  });
}

/**
 * Count how many combinations would remain after applying tier set filters.
 * This generates all combinations internally to compute the exact count.
 */
export function countFilteredCombinations(
  allCombinations: CombinationSpec[],
  profile: SimcProfile,
  minimums: TierSetMinimums,
): number {
  const activeMinimums = [...minimums.entries()].filter(([, min]) => min > 0);
  if (activeMinimums.length === 0) return allCombinations.length;

  let count = 0;
  for (const combo of allCombinations) {
    const pieces = countTierSetPieces(combo, profile);
    let valid = true;
    for (const [setId, minRequired] of activeMinimums) {
      if ((pieces.get(setId) ?? 0) < minRequired) {
        valid = false;
        break;
      }
    }
    if (valid) count++;
  }
  return count;
}
