/**
 * droptimizer-profileset.ts — Generates ProfileSet combinations for Droptimizer.
 *
 * Unlike Top Gear (combinatorial), Droptimizer does **single-swap** comparisons:
 * each loot item is tried in place of the currently equipped item, one at a time.
 *
 * Key behaviors:
 * - One profileset per drop item (single-swap vs baseline)
 * - Enchants inherited from the currently equipped item in the same slot (12.24)
 * - Gems/sockets inherited from equipped neck or first ring (12.25)
 * - Rings tried in both finger slots; trinkets tried in both trinket slots (12.26)
 * - Unique-Equipped: skip if the same ring/trinket is already in the other slot (12.27)
 * - Dual wield: main_hand drops tried in off_hand too (12.29)
 */

import type { SimcProfile, CombinationSpec } from './types';
import type { DroptimizerItem } from './droptimizer-items';
import { DUAL_WIELD_SPECS, SOCKET_BONUS_ID } from './presets/season-config';
import { SOCKETABLE_DROPTIMIZER_SLOTS } from './presets/loot-tables';

/** Options controlling profileset generation. */
export interface DroptimizerProfileSetOptions {
  /** Gem ID to socket into items. null = no gem. */
  preferredGemId: number | null;
  /** If true, add a vault socket (SOCKET_BONUS_ID) to all items. */
  addVaultSocket: boolean;
  /** Gear track name to upgrade items to. null = as-is. */
  upgradeTrack: string | null;
  /** If true, upgrade all equipped items to the same level in the baseline. */
  upgradeAllEquipped: boolean;
}

/** Metadata for a droptimizer profileset — links back to the source item. */
export interface DroptimizerComboMeta {
  /** The source DroptimizerItem. */
  item: DroptimizerItem;
  /** The target slot this item was placed in (e.g. 'finger1' or 'finger2'). */
  targetSlot: string;
  /** True if this is a slot-variation (e.g. ring in finger2 instead of finger1). */
  isSlotVariation: boolean;
}

/**
 * Generate Droptimizer profileset combinations from a list of resolved items.
 *
 * Returns:
 * - combinations: CombinationSpec[] ready for buildProfileSetFile / Smart Sim
 * - manifest: Map linking combo names to DroptimizerComboMeta
 */
export function generateDroptimizerCombinations(
  profile: SimcProfile,
  items: DroptimizerItem[],
  options: DroptimizerProfileSetOptions,
): {
  combinations: CombinationSpec[];
  meta: Map<string, DroptimizerComboMeta>;
} {
  const combinations: CombinationSpec[] = [];
  const meta = new Map<string, DroptimizerComboMeta>();

  const spec = profile.spec?.toLowerCase() ?? '';
  const isDualWield = DUAL_WIELD_SPECS.has(spec);

  // Check if equipped main_hand is a two-hand weapon
  const equippedMainHand = profile.gear.main_hand?.find((i) => i.isEquipped);
  const hasTwoHand = equippedMainHand?.isTwoHand === true;

  // Baseline (combo_0000) — currently equipped, no changes
  combinations.push({
    name: 'combo_0000',
    axes: {},
    overrideLines: [],
  });

  let comboIndex = 1;

  for (const item of items) {
    // If character has a two-hand weapon, skip off_hand drops entirely —
    // they can't be equipped without also changing to a one-hand main_hand.
    if (hasTwoHand && item.slot === 'off_hand') continue;

    // Determine which profile slots to try this item in
    const targetSlots = getTargetSlots(item.slot, isDualWield);

    for (let slotIdx = 0; slotIdx < targetSlots.length; slotIdx++) {
      const targetSlot = targetSlots[slotIdx];
      const isVariation = slotIdx > 0;

      // Unique-Equipped check: skip if same item is already in the other slot
      if (shouldSkipUniqueEquipped(profile, item, targetSlot)) continue;

      // Build the SimC item line for this drop
      const simcLine = buildDropItemLine(profile, item, targetSlot, options);
      const overrideLines = [simcLine];

      // When swapping main_hand, always clear off_hand to ensure SimC
      // doesn't carry over artifacts from a two-hand base profile.
      // Matches Raidbots behavior: off_hand=,
      if (targetSlot === 'main_hand') {
        overrideLines.push('off_hand=,');
      }

      const comboName = `combo_${String(comboIndex).padStart(4, '0')}`;
      combinations.push({
        name: comboName,
        axes: { [`drop:${targetSlot}`]: `item_${item.itemId}` },
        overrideLines,
      });

      meta.set(comboName, {
        item,
        targetSlot,
        isSlotVariation: isVariation,
      });

      comboIndex++;
    }
  }

  return { combinations, meta };
}

/**
 * Determine which profile slots a loot item should be tried in.
 * - 'finger' → ['finger1', 'finger2'] (rings tried in both slots)
 * - 'trinket' → ['trinket1', 'trinket2'] (trinkets tried in both slots)
 * - 'main_hand' for dual wield → ['main_hand', 'off_hand']
 * - everything else → [slot]
 */
function getTargetSlots(lootSlot: string, isDualWield: boolean): string[] {
  switch (lootSlot) {
    case 'finger':
      return ['finger1', 'finger2'];
    case 'trinket':
      return ['trinket1', 'trinket2'];
    case 'main_hand':
      return isDualWield ? ['main_hand', 'off_hand'] : ['main_hand'];
    default:
      return [lootSlot];
  }
}

/**
 * Check if equipping this item in targetSlot would violate Unique-Equipped.
 * E.g. if the same ring ID is already equipped in the other finger slot.
 */
function shouldSkipUniqueEquipped(
  profile: SimcProfile,
  item: DroptimizerItem,
  targetSlot: string,
): boolean {
  // Only applies to paired slots (rings, trinkets)
  const pairedSlots: Record<string, string> = {
    finger1: 'finger2',
    finger2: 'finger1',
    trinket1: 'trinket2',
    trinket2: 'trinket1',
  };

  const otherSlot = pairedSlots[targetSlot];
  if (!otherSlot) return false;

  const otherItems = profile.gear[otherSlot];
  if (!otherItems) return false;

  // Check if the same item ID is equipped in the other slot
  return otherItems.some((gi) => gi.isEquipped && gi.id === item.itemId);
}

/**
 * Build the SimC gear line for a drop item being placed in a target slot.
 *
 * Matches the Raidbots Droptimizer format:
 * - Uses bonus_id= (raid drop IDs + rank) instead of ilevel= for raids
 * - Falls back to ilevel= for M+/world boss items without bonus_ids
 * - Adds socket bonus_id (13668) for socketable slots (neck, ring)
 * - Inherits enchant from currently equipped item (12.24)
 * - Inherits gems per-slot from equipped item (12.25)
 */
function buildDropItemLine(
  profile: SimcProfile,
  item: DroptimizerItem,
  targetSlot: string,
  options: DroptimizerProfileSetOptions,
): string {
  const parts: string[] = [`${targetSlot}=,id=${item.itemId}`];

  // Inherit enchant from currently equipped item in this slot
  const equippedEnchant = getEquippedEnchant(profile, targetSlot);
  if (equippedEnchant != null) {
    parts.push(`enchant_id=${equippedEnchant}`);
  }

  // Build bonus_ids: raid drop IDs + rank + optional socket
  const bonusIds: number[] = [...item.bonusIds];

  // Add socket bonus for socketable slots (neck, ring) — Raidbots uses 13668
  const genericSlot = targetSlot.replace(/\d+$/, ''); // finger1 → finger
  const needsSocket = SOCKETABLE_DROPTIMIZER_SLOTS.has(genericSlot) || SOCKETABLE_DROPTIMIZER_SLOTS.has(item.slot);
  if (needsSocket) {
    bonusIds.push(13668);
  }

  // Vault socket bonus_id
  if (options.addVaultSocket && (SOCKET_BONUS_ID as number) !== 0) {
    bonusIds.push(SOCKET_BONUS_ID);
  }

  if (bonusIds.length > 0) {
    parts.push(`bonus_id=${bonusIds.join('/')}`);
  } else if (item.ilvl > 0) {
    // Fallback for items without bonus_ids (M+, world boss)
    parts.push(`ilevel=${item.ilvl}`);
  }

  // Gem: use preferred gem if set, otherwise inherit per-slot from equipped
  if (needsSocket || options.addVaultSocket) {
    if (options.preferredGemId != null) {
      parts.push(`gem_id=${options.preferredGemId}`);
    } else {
      const equippedGems = getGemsFromSlot(profile, targetSlot);
      if (equippedGems) {
        parts.push(`gem_id=${equippedGems}`);
      }
    }
  }

  return parts.join(',');
}

/**
 * Get the enchant_id from the currently equipped item in a given slot.
 * Returns undefined if no enchant is equipped.
 */
function getEquippedEnchant(profile: SimcProfile, slot: string): number | undefined {
  const items = profile.gear[slot];
  if (!items) return undefined;
  const equipped = items.find((i) => i.isEquipped);
  return equipped?.enchantId;
}

/** Get the gem_id string from the currently equipped item in a given slot. */
function getGemsFromSlot(profile: SimcProfile, slot: string): string | undefined {
  const items = profile.gear[slot];
  if (!items) return undefined;
  const equipped = items.find((i) => i.isEquipped);
  if (!equipped || equipped.gemIds.length === 0) return undefined;
  return equipped.gemIds.join('/');
}
