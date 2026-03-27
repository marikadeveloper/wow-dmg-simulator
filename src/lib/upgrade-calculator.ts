import type { GearItem } from './types';
import {
  getGearTrackFromBonusIds,
  getCrestForTrack,
  getIlvlForRank,
  TRACK_BONUS_RANGES,
  UPGRADE_CREST_COST_PER_RANK,
  CREST_TYPES,
  type CrestType,
} from './presets/season-config';

/** Budget of crests the user owns, keyed by crest id (e.g. "hero" → 80). */
export type CrestBudget = Record<string, number>;

/**
 * Compute the upgraded version of a single item given a crest budget.
 *
 * The budget is treated as "if I spent all my crests of this type on this item,
 * how far can it go?" — enabling the simulation to compare upgrade options.
 *
 * Returns null if the item cannot be upgraded (no track, already at max rank,
 * no budget for the required crest type).
 */
export function computeItemUpgrade(
  item: GearItem,
  budget: CrestBudget,
): GearItem | null {
  const trackInfo = getGearTrackFromBonusIds(item.bonusIds);
  if (!trackInfo || trackInfo.rank >= trackInfo.maxRank) return null;

  const crest = getCrestForTrack(trackInfo.trackName);
  if (!crest) return null;

  const available = budget[crest.id] ?? 0;
  if (available <= 0) return null;

  const maxAffordableRanks = Math.floor(available / UPGRADE_CREST_COST_PER_RANK);
  const ranksToUpgrade = Math.min(
    maxAffordableRanks,
    trackInfo.maxRank - trackInfo.rank,
  );
  if (ranksToUpgrade <= 0) return null;

  const targetRank = trackInfo.rank + ranksToUpgrade;
  const trackRange = TRACK_BONUS_RANGES.find(
    (t) => t.name === trackInfo.trackName,
  );
  if (!trackRange) return null;

  const currentBonusId = trackRange.startBonusId + (trackInfo.rank - 1);
  const targetBonusId = trackRange.startBonusId + (targetRank - 1);

  return {
    ...item,
    bonusIds: item.bonusIds.map((bid) =>
      bid === currentBonusId ? targetBonusId : bid,
    ),
    ilvl: getIlvlForRank(trackInfo.trackName, targetRank),
    isEquipped: false,
    isVault: false,
    isUpgraded: true,
  };
}

/**
 * Compute upgraded variants for all selected items across all slots.
 *
 * Returns a map of slot → upgraded GearItem[] to be appended to each slot's
 * item list. Only items that are selected AND can be upgraded appear.
 */
export function computeAllUpgrades(
  gear: Record<string, GearItem[]>,
  selection: Set<string>,
  budget: CrestBudget,
): Map<string, GearItem[]> {
  const result = new Map<string, GearItem[]>();

  for (const [slot, items] of Object.entries(gear)) {
    for (let i = 0; i < items.length; i++) {
      if (!selection.has(`${slot}:${i}`)) continue;

      const upgraded = computeItemUpgrade(items[i], budget);
      if (!upgraded) continue;

      // Preserve the slot assignment
      upgraded.slot = slot;

      const existing = result.get(slot) ?? [];
      existing.push(upgraded);
      result.set(slot, existing);
    }
  }

  return result;
}

/**
 * Determine which crest types are relevant for the user's selected gear.
 * Only returns crest types where at least one selected item can be upgraded.
 */
export function getRelevantCrestTypes(
  gear: Record<string, GearItem[]>,
  selection: Set<string>,
): CrestType[] {
  const neededTracks = new Set<string>();

  for (const [slot, items] of Object.entries(gear)) {
    for (let i = 0; i < items.length; i++) {
      if (!selection.has(`${slot}:${i}`)) continue;

      const trackInfo = getGearTrackFromBonusIds(items[i].bonusIds);
      if (trackInfo && trackInfo.rank < trackInfo.maxRank) {
        neededTracks.add(trackInfo.trackName);
      }
    }
  }

  return CREST_TYPES.filter((c) => neededTracks.has(c.track));
}

/**
 * Count how many items can be upgraded per crest type.
 */
export function countUpgradeableItems(
  gear: Record<string, GearItem[]>,
  selection: Set<string>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const [slot, items] of Object.entries(gear)) {
    for (let i = 0; i < items.length; i++) {
      if (!selection.has(`${slot}:${i}`)) continue;

      const trackInfo = getGearTrackFromBonusIds(items[i].bonusIds);
      if (!trackInfo || trackInfo.rank >= trackInfo.maxRank) continue;

      const crest = getCrestForTrack(trackInfo.trackName);
      if (!crest) continue;

      counts.set(crest.id, (counts.get(crest.id) ?? 0) + 1);
    }
  }

  return counts;
}
