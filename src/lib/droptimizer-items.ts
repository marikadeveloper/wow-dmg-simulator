/**
 * droptimizer-items.ts — Resolves droppable items from a Droptimizer source config.
 *
 * Given a source configuration (raid/M+/world boss/catalyst) and a character class,
 * returns a flat list of items with computed ilvls, source labels, and slot info.
 */

import type { DroptimizerSourceConfig, SimcProfile } from './types';
import {
  RAID_INSTANCES,
  MYTHIC_PLUS_DUNGEONS,
  WORLD_BOSSES,
  RAID_ILVL_MAP,
  WORLD_BOSS_ILVL,
  RAID_DROP_BONUS_IDS,
  RAID_DIFFICULTY_TRACK,
  getItemsForClass,
  getKeystoneIlvl,
  getMplusDropBonusIds,
  type RaidDifficulty,
} from './presets/loot-tables';
import {
  TIER_SETS,
  CLASS_TO_TIER_SET_ID,
  TIER_SLOT_ORDER,
  TRACK_BONUS_RANGES,
} from './presets/season-config';

/** A resolved droptimizer item ready for display. */
export interface DroptimizerItem {
  /** Unique key for React lists (itemId + source context). */
  key: string;
  /** WoW item ID. */
  itemId: number;
  /** Display name. */
  name: string;
  /** Equip slot (generic: 'finger', 'trinket', not 'finger1'). */
  slot: string;
  /** Computed item level for this source config (for display). */
  ilvl: number;
  /**
   * Bonus IDs that SimC needs to resolve this item at the correct ilvl.
   * For raid drops: [4799, 4786, rankBonusId].
   * For M+ / world boss: may use ilevel= fallback if no bonus_ids known.
   */
  bonusIds: number[];
  /** Source label (boss name, dungeon name, "World Boss", "Catalyst"). */
  sourceLabel: string;
  /** Source group key for group-by-source (raid instance id, dungeon id, etc.). */
  sourceGroupId: string;
  /** Source group display name. */
  sourceGroupName: string;
  /** true if this is a catalyst-converted tier piece. */
  isCatalyst: boolean;
  /** Armor type, if applicable. */
  armorType?: string;
}

/** Slot display labels. */
export const SLOT_LABELS: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger: 'Ring',
  trinket: 'Trinket',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
};

/** Slot sort order for group-by-slot. */
const SLOT_SORT_ORDER = [
  'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
  'hands', 'waist', 'legs', 'feet',
  'finger', 'trinket',
  'main_hand', 'off_hand',
];

/**
 * Resolve all droppable items for a given source config and class.
 * When filterByClass is false, returns ALL items regardless of armor type (off-spec mode).
 */
export function resolveDroptimizerItems(
  config: DroptimizerSourceConfig,
  className: string,
  filterByClass = true,
): DroptimizerItem[] {
  switch (config.type) {
    case 'raid':
      return resolveRaidItems(config.difficulty, config.raidIds, className, filterByClass);
    case 'mythicplus':
      return resolveMplusItems(config.keystoneLevel, config.dungeonIds, className, filterByClass);
    case 'worldboss':
      return resolveWorldBossItems(className, filterByClass);
    case 'catalyst':
      return resolveCatalystItems(className);
  }
}

/**
 * Compute the bonus_ids for a raid drop item.
 * Format: [4799, 4786, rankBonusId] where rankBonusId encodes the ilvl.
 * Boss tier maps directly to rank within the gear track.
 * bonusRankOffset adds extra ranks for "very rare" drops (e.g. end-boss specials).
 */
function getRaidDropBonusIds(difficulty: RaidDifficulty, bossTier: number, bonusRankOffset = 0): number[] {
  const trackName = RAID_DIFFICULTY_TRACK[difficulty];
  const trackRange = TRACK_BONUS_RANGES.find((t) => t.name === trackName);
  if (!trackRange) return [];
  // Boss tier maps to rank: tier 1 → rank 1, tier 2 → rank 2, etc.
  // Very rare items get extra ranks (e.g. +2 for end-boss specials)
  const rankBonusId = trackRange.startBonusId + (bossTier - 1) + bonusRankOffset;
  return [...RAID_DROP_BONUS_IDS, rankBonusId];
}

function resolveRaidItems(
  difficulty: RaidDifficulty,
  raidIds: string[] | null,
  className: string,
  filterByClass: boolean,
): DroptimizerItem[] {
  const raids = raidIds
    ? RAID_INSTANCES.filter((r) => raidIds.includes(r.id))
    : RAID_INSTANCES;

  const items: DroptimizerItem[] = [];
  for (const raid of raids) {
    for (const enc of raid.encounters) {
      const classItems = filterByClass ? getItemsForClass(enc.items, className) : enc.items;
      for (const item of classItems) {
        const offset = item.bonusRankOffset ?? 0;
        const effectiveTier = enc.bossTier + offset;
        const ilvl = RAID_ILVL_MAP[difficulty]?.[effectiveTier]
          ?? RAID_ILVL_MAP[difficulty]?.[enc.bossTier] ?? 0;
        const bonusIds = getRaidDropBonusIds(difficulty, enc.bossTier, offset);
        items.push({
          key: `raid_${item.itemId}_${enc.id}`,
          itemId: item.itemId,
          name: item.name,
          slot: item.slot,
          ilvl,
          bonusIds,
          sourceLabel: enc.name,
          sourceGroupId: raid.id,
          sourceGroupName: raid.name,
          isCatalyst: false,
          armorType: item.armorType,
        });
      }
    }
  }
  return items;
}

function resolveMplusItems(
  keystoneLevel: number,
  dungeonIds: string[] | null,
  className: string,
  filterByClass: boolean,
): DroptimizerItem[] {
  const ilvl = getKeystoneIlvl(keystoneLevel);
  const bonusIds = getMplusDropBonusIds(keystoneLevel);
  const dungeons = dungeonIds
    ? MYTHIC_PLUS_DUNGEONS.filter((d) => dungeonIds.includes(d.id))
    : MYTHIC_PLUS_DUNGEONS;

  const items: DroptimizerItem[] = [];
  for (const dg of dungeons) {
    const classItems = filterByClass ? getItemsForClass(dg.items, className) : dg.items;
    for (const item of classItems) {
      items.push({
        key: `mplus_${item.itemId}_${dg.id}`,
        itemId: item.itemId,
        name: item.name,
        slot: item.slot,
        ilvl,
        bonusIds: [...bonusIds],
        sourceLabel: dg.name,
        sourceGroupId: dg.id,
        sourceGroupName: dg.name,
        isCatalyst: false,
        armorType: item.armorType,
      });
    }
  }
  return items;
}

function resolveWorldBossItems(className: string, filterByClass: boolean): DroptimizerItem[] {
  const items: DroptimizerItem[] = [];
  for (const wb of WORLD_BOSSES) {
    const classItems = filterByClass ? getItemsForClass(wb.items, className) : wb.items;
    for (const item of classItems) {
      items.push({
        key: `wb_${item.itemId}_${wb.id}`,
        itemId: item.itemId,
        name: item.name,
        slot: item.slot,
        ilvl: WORLD_BOSS_ILVL,
        bonusIds: [], // World boss items use ilevel= fallback
        sourceLabel: wb.name,
        sourceGroupId: wb.id,
        sourceGroupName: wb.name,
        isCatalyst: false,
        armorType: item.armorType,
      });
    }
  }
  return items;
}

function resolveCatalystItems(className: string): DroptimizerItem[] {
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return [];
  const tierSet = TIER_SETS.find((s) => s.id === setId);
  if (!tierSet) return [];

  const items: DroptimizerItem[] = [];
  for (let i = 0; i < TIER_SLOT_ORDER.length; i++) {
    const slot = TIER_SLOT_ORDER[i];
    const tierItemId = tierSet.itemIds[i];
    items.push({
      key: `catalyst_${tierItemId}_${slot}`,
      itemId: tierItemId,
      name: `${tierSet.name} (${slot})`,
      slot,
      ilvl: 0, // Catalyst ilvl depends on the source item — shown as "varies"
      bonusIds: [],
      sourceLabel: 'Catalyst',
      sourceGroupId: 'catalyst',
      sourceGroupName: 'Catalyst',
      isCatalyst: true,
    });
  }
  return items;
}

/** Group-by mode for the item list. */
export type GroupByMode = 'slot' | 'source';

/** A group of items with a header. */
export interface ItemGroup {
  id: string;
  label: string;
  items: DroptimizerItem[];
}

/**
 * Group items by slot or source.
 */
export function groupDroptimizerItems(
  items: DroptimizerItem[],
  mode: GroupByMode,
): ItemGroup[] {
  const groupMap = new Map<string, { label: string; items: DroptimizerItem[] }>();

  for (const item of items) {
    const groupId = mode === 'slot' ? item.slot : item.sourceGroupId;
    const groupLabel = mode === 'slot'
      ? (SLOT_LABELS[item.slot] ?? item.slot)
      : item.sourceGroupName;

    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, { label: groupLabel, items: [] });
    }
    groupMap.get(groupId)!.items.push(item);
  }

  // Sort groups
  const entries = [...groupMap.entries()];
  if (mode === 'slot') {
    entries.sort((a, b) => {
      const ai = SLOT_SORT_ORDER.indexOf(a[0]);
      const bi = SLOT_SORT_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }

  return entries.map(([id, { label, items: groupItems }]) => ({
    id,
    label,
    items: groupItems.sort((a, b) => b.ilvl - a.ilvl || a.name.localeCompare(b.name)),
  }));
}

/**
 * Check if the player already has an item in a given slot at or above a given ilvl.
 * Handles finger/trinket → finger1/finger2, trinket1/trinket2 mapping.
 */
export function hasEquippedOrBetter(
  profile: SimcProfile,
  slot: string,
  itemId: number,
  ilvl: number,
): 'same' | 'better' | null {
  // Map generic loot table slots to profile slots
  const profileSlots = slot === 'finger'
    ? ['finger1', 'finger2']
    : slot === 'trinket'
      ? ['trinket1', 'trinket2']
      : [slot];

  for (const pSlot of profileSlots) {
    const items = profile.gear[pSlot];
    if (!items) continue;
    for (const item of items) {
      if (!item.isEquipped) continue;
      if (item.id === itemId) return 'same';
      if ((item.ilvl ?? 0) >= ilvl && item.id !== itemId) return 'better';
    }
  }
  return null;
}
