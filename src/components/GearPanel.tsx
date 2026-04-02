import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { SimcProfile, GearItem } from '../lib/types';
import GearSlotCard, { SLOT_ORDER } from './GearSlotCard';
import GemOptimization from './GemOptimization';
import EnchantOptimization from './EnchantOptimization';
import TierSetFilter from './TierSetFilter';
import UpgradeBudget from './UpgradeBudget';
import CatalystCharges from './CatalystCharges';
import CombinationCounter from './CombinationCounter';
import { assembleAxes } from '../lib/optimization-assembler';
import { FEATURES } from '../lib/features';
import { ENCHANTABLE_SLOTS, DUAL_WIELD_SPECS } from '../lib/presets/season-config';
import { computeAllUpgrades, type CrestBudget } from '../lib/upgrade-calculator';
import { generateCatalystItems } from '../lib/catalyst-generator';
import type { TierSetMinimums } from '../lib/tier-set-filter';
import { getItemData } from '../lib/item-cache';
import { saveUnownedItems, loadUnownedItems } from '../lib/unowned-store';

interface GearPanelProps {
  profile: SimcProfile;
  /** Called when the combination count exceeds / drops below the hard block threshold (1000). */
  onBlockedChange?: (blocked: boolean) => void;
  /** Called whenever the assembled optimization axes change. */
  onAxesChange?: (axes: import('../lib/types').OptimizationAxis[]) => void;
  /** Called whenever tier set minimum requirements change. */
  onTierSetMinimumsChange?: (minimums: TierSetMinimums) => void;
  /** Called whenever catalyst charge count changes. null = disabled. */
  onCatalystChargesChange?: (charges: number | null) => void;
  /** Called whenever the augmented profile (with catalyst/unowned items) changes. */
  onAugmentedProfileChange?: (profile: SimcProfile) => void;
  /** Called when the user toggles the bypass-limit override. */
  onBypassLimitChange?: (bypassed: boolean) => void;
}

/**
 * Paired slots: UI display name → [simcSlotA, simcSlotB].
 * Items from both SimC slots are merged into one card.
 */
const PAIRED_SLOTS: Record<string, [string, string]> = {
  rings: ['finger1', 'finger2'],
  trinkets: ['trinket1', 'trinket2'],
};

/** Info about a merged paired item: the original slot + index in profile.gear. */
interface PairMapping {
  originalSlot: string;
  originalIndex: number;
  item: GearItem;
}

/**
 * Build the initial selection: all equipped items are pre-selected.
 * Returns a Set of keys like "head:0", "finger1:0", "finger2:0".
 */
function buildInitialSelection(profile: SimcProfile): Set<string> {
  const selected = new Set<string>();
  for (const [slot, items] of Object.entries(profile.gear)) {
    items.forEach((item, idx) => {
      if (item.isEquipped) {
        selected.add(`${slot}:${idx}`);
      }
    });
  }
  return selected;
}

export default function GearPanel({ profile, onBlockedChange, onAxesChange, onTierSetMinimumsChange, onCatalystChargesChange, onAugmentedProfileChange, onBypassLimitChange }: GearPanelProps) {
  // Selection uses original slot keys (finger1:N, trinket1:N), never merged names
  const [selection, setSelection] = useState<Set<string>>(() =>
    buildInitialSelection(profile),
  );
  const [selectedGemIds, setSelectedGemIds] = useState<Set<number>>(new Set());
  const [selectedEnchantIds, setSelectedEnchantIds] = useState<Set<number>>(new Set());
  const [tierSetMinimums, setTierSetMinimums] = useState<TierSetMinimums>(new Map());
  const [upgradeItems, setUpgradeItems] = useState<Map<string, GearItem[]>>(new Map());
  const [catalystCharges, setCatalystCharges] = useState<number | null>(null);
  const [catalystItems, setCatalystItems] = useState<Map<string, GearItem[]>>(new Map());
  const [unownedItems, setUnownedItems] = useState<Map<string, GearItem[]>>(new Map());

  // Reset all local state when the profile changes (new character imported)
  const profileIdRef = useRef(profile);
  useEffect(() => {
    if (profileIdRef.current === profile) return; // skip mount
    profileIdRef.current = profile;

    setSelection(buildInitialSelection(profile));
    setSelectedGemIds(new Set());
    setSelectedEnchantIds(new Set());
    setTierSetMinimums(new Map());
    setUpgradeItems(new Map());
    setCatalystCharges(null);
    setCatalystItems(new Map());
    setUnownedItems(new Map());
    saveUnownedItems(new Map()); // clear persisted unowned items
  }, [profile]);

  // Load persisted unowned items on mount
  useEffect(() => {
    loadUnownedItems().then((saved) => {
      if (saved.size > 0) setUnownedItems(saved);
    });
  }, []);

  // Persist unowned items whenever they change
  useEffect(() => {
    saveUnownedItems(unownedItems);
  }, [unownedItems]);

  // ── Augmented profile with upgrade + catalyst variants ────────────────

  const profileWithUpgrades = useMemo((): SimcProfile => {
    if (upgradeItems.size === 0) return profile;
    const gear: Record<string, GearItem[]> = {};
    for (const [slot, items] of Object.entries(profile.gear)) {
      const upgrades = upgradeItems.get(slot) ?? [];
      gear[slot] = upgrades.length > 0 ? [...items, ...upgrades] : items;
    }
    return { ...profile, gear };
  }, [profile, upgradeItems]);

  const profileWithCatalyst = useMemo((): SimcProfile => {
    if (catalystItems.size === 0) return profileWithUpgrades;
    const gear: Record<string, GearItem[]> = {};
    for (const [slot, items] of Object.entries(profileWithUpgrades.gear)) {
      const cats = catalystItems.get(slot) ?? [];
      gear[slot] = cats.length > 0 ? [...items, ...cats] : items;
    }
    return { ...profileWithUpgrades, gear };
  }, [profileWithUpgrades, catalystItems]);

  const augmentedProfile = useMemo((): SimcProfile => {
    if (unownedItems.size === 0) return profileWithCatalyst;
    const gear: Record<string, GearItem[]> = {};
    for (const [slot, items] of Object.entries(profileWithCatalyst.gear)) {
      const unowned = unownedItems.get(slot) ?? [];
      gear[slot] = unowned.length > 0 ? [...items, ...unowned] : items;
    }
    // Also add unowned items for slots that don't yet exist in profile
    for (const [slot, items] of unownedItems) {
      if (!gear[slot]) gear[slot] = items;
    }
    return { ...profileWithCatalyst, gear };
  }, [profileWithCatalyst, unownedItems]);

  const handleApplyUpgrades = useCallback((budget: CrestBudget) => {
    // Clear previous upgrade items from selection first
    setSelection((prev) => {
      const next = new Set(prev);
      for (const [slot, items] of upgradeItems) {
        const baseLen = profile.gear[slot]?.length ?? 0;
        items.forEach((_, i) => next.delete(`${slot}:${baseLen + i}`));
      }
      return next;
    });

    const upgrades = computeAllUpgrades(profile.gear, selection, budget);
    setUpgradeItems(upgrades);

    // Auto-select the new upgrade items
    setSelection((prev) => {
      const next = new Set(prev);
      for (const [slot, items] of upgrades) {
        const baseLen = profile.gear[slot]?.length ?? 0;
        items.forEach((_, i) => next.add(`${slot}:${baseLen + i}`));
      }
      return next;
    });
  }, [profile.gear, selection, upgradeItems]);

  const handleClearUpgrades = useCallback(() => {
    // Remove upgrade item selections
    setSelection((prev) => {
      const next = new Set(prev);
      for (const [slot, items] of upgradeItems) {
        const baseLen = profile.gear[slot]?.length ?? 0;
        items.forEach((_, i) => next.delete(`${slot}:${baseLen + i}`));
      }
      return next;
    });
    setUpgradeItems(new Map());
  }, [profile.gear, upgradeItems]);

  const handleCatalystChargesChange = useCallback((charges: number | null) => {
    // Clear old catalyst items from selection
    setSelection((prev) => {
      const next = new Set(prev);
      for (const [slot, items] of catalystItems) {
        const baseLen = profileWithUpgrades.gear[slot]?.length ?? 0;
        items.forEach((_, i) => next.delete(`${slot}:${baseLen + i}`));
      }
      return next;
    });

    setCatalystCharges(charges);

    if (charges !== null) {
      // Generate catalyst items from current base selection (excluding old catalyst items)
      const baseSelection = new Set<string>();
      for (const key of selection) {
        const [slot, idxStr] = key.split(':');
        const idx = Number(idxStr);
        const items = profileWithUpgrades.gear[slot];
        if (items && idx < items.length) baseSelection.add(key);
      }

      const newCats = generateCatalystItems(profileWithUpgrades, baseSelection);
      setCatalystItems(newCats);

      // Auto-select new catalyst items
      setSelection((prev) => {
        const next = new Set(prev);
        for (const [slot, items] of newCats) {
          const baseLen = profileWithUpgrades.gear[slot]?.length ?? 0;
          items.forEach((_, i) => next.add(`${slot}:${baseLen + i}`));
        }
        return next;
      });
    } else {
      setCatalystItems(new Map());
    }
  }, [profileWithUpgrades, selection, catalystItems]);

  // ── Unowned item search (story 10.1) ──────────────────────────────────────

  const handleAddUnownedItem = useCallback((slot: string, item: GearItem) => {
    setUnownedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(slot) ?? [];
      // Avoid duplicates by item ID
      if (existing.some((e) => e.id === item.id)) return prev;
      next.set(slot, [...existing, item]);
      return next;
    });

    // Auto-select the new unowned item
    // Need to compute its index in the augmented profile
    // It will be appended after all existing items in that slot
    setTimeout(() => {
      setSelection((prev) => {
        const next = new Set(prev);
        // Count items in the base profile + upgrades + catalyst + existing unowned
        const baseLen = profile.gear[slot]?.length ?? 0;
        const upgradeLen = upgradeItems.get(slot)?.length ?? 0;
        const catalystLen = catalystItems.get(slot)?.length ?? 0;
        const existingUnowned = unownedItems.get(slot)?.length ?? 0;
        const newIdx = baseLen + upgradeLen + catalystLen + existingUnowned;
        next.add(`${slot}:${newIdx}`);
        return next;
      });
    }, 0);

    // Prefetch item data for the tooltip
    getItemData(item.id);
  }, [profile.gear, upgradeItems, catalystItems, unownedItems]);

  // Report catalyst charges to parent
  useEffect(() => {
    onCatalystChargesChange?.(catalystCharges);
  }, [catalystCharges, onCatalystChargesChange]);

  // ── Merged paired slot data ─────────────────────────────────────────────

  /** Build merged mappings for a paired slot. */
  const pairedData = useMemo(() => {
    const result: Record<string, { mappings: PairMapping[]; items: GearItem[] }> = {};
    for (const [pairName, [slotA, slotB]] of Object.entries(PAIRED_SLOTS)) {
      const mappings: PairMapping[] = [];
      for (const slot of [slotA, slotB]) {
        const items = augmentedProfile.gear[slot];
        if (!items) continue;
        items.forEach((item, idx) => {
          mappings.push({ originalSlot: slot, originalIndex: idx, item });
        });
      }
      result[pairName] = { mappings, items: mappings.map((m) => m.item) };
    }
    return result;
  }, [augmentedProfile]);

  /** Get selected indices in the merged array for a paired slot. */
  const getPairedSelectedIndices = useCallback(
    (pairName: string): Set<number> => {
      const data = pairedData[pairName];
      if (!data) return new Set();
      const indices = new Set<number>();
      data.mappings.forEach((m, mergedIdx) => {
        if (selection.has(`${m.originalSlot}:${m.originalIndex}`)) {
          indices.add(mergedIdx);
        }
      });
      return indices;
    },
    [pairedData, selection],
  );

  // ── Toggle / select all / deselect all ──────────────────────────────────

  const toggleItem = useCallback((slot: string, index: number) => {
    const pairData = pairedData[slot];

    // Handle paired slots (rings, trinkets)
    if (pairData) {
      const mapping = pairData.mappings[index];
      if (!mapping) return;
      const origKey = `${mapping.originalSlot}:${mapping.originalIndex}`;

      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(origKey)) {
          // Guard: at least 2 items must remain selected in paired slots
          const currentCount = pairData.mappings.filter((m) =>
            next.has(`${m.originalSlot}:${m.originalIndex}`),
          ).length;
          if (currentCount <= 2) return prev;
          next.delete(origKey);
        } else {
          next.add(origKey);
        }
        return next;
      });
      return;
    }

    // Normal slot
    setSelection((prev) => {
      const key = `${slot}:${index}`;
      const next = new Set(prev);

      if (next.has(key)) {
        const slotSelectedCount = Array.from(next).filter(
          (k) => k.startsWith(`${slot}:`),
        ).length;
        if (slotSelectedCount <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [pairedData]);

  const selectAllInSlot = useCallback((slot: string) => {
    const pairData = pairedData[slot];

    if (pairData) {
      setSelection((prev) => {
        const next = new Set(prev);
        for (const m of pairData.mappings) {
          next.add(`${m.originalSlot}:${m.originalIndex}`);
        }
        return next;
      });
      return;
    }

    setSelection((prev) => {
      const items = augmentedProfile.gear[slot];
      if (!items) return prev;
      const next = new Set(prev);
      items.forEach((_, idx) => next.add(`${slot}:${idx}`));
      return next;
    });
  }, [augmentedProfile, pairedData]);

  const deselectAllInSlot = useCallback((slot: string) => {
    const pairData = pairedData[slot];

    if (pairData) {
      setSelection((prev) => {
        const next = new Set(prev);
        // Keep equipped items, deselect everything else
        const equipped: string[] = [];
        for (const m of pairData.mappings) {
          const key = `${m.originalSlot}:${m.originalIndex}`;
          if (m.item.isEquipped) equipped.push(key);
          else next.delete(key);
        }
        // Ensure equipped are selected
        for (const key of equipped) next.add(key);
        // If fewer than 2 equipped, add first non-equipped to reach 2
        if (equipped.length < 2) {
          let needed = 2 - equipped.length;
          for (const m of pairData.mappings) {
            if (needed <= 0) break;
            const key = `${m.originalSlot}:${m.originalIndex}`;
            if (!next.has(key)) {
              next.add(key);
              needed--;
            }
          }
        }
        return next;
      });
      return;
    }

    setSelection((prev) => {
      const items = augmentedProfile.gear[slot];
      if (!items) return prev;
      const next = new Set(prev);
      const equippedIdx = items.findIndex((i) => i.isEquipped);
      const keepIdx = equippedIdx >= 0 ? equippedIdx : 0;
      items.forEach((_, idx) => {
        if (idx !== keepIdx) next.delete(`${slot}:${idx}`);
      });
      next.add(`${slot}:${keepIdx}`);
      return next;
    });
  }, [augmentedProfile, pairedData]);

  const toggleGem = useCallback((gemId: number) => {
    setSelectedGemIds((prev) => {
      const next = new Set(prev);
      if (next.has(gemId)) next.delete(gemId);
      else next.add(gemId);
      return next;
    });
  }, []);

  const toggleEnchant = useCallback((enchantId: number) => {
    setSelectedEnchantIds((prev) => {
      const next = new Set(prev);
      if (next.has(enchantId)) next.delete(enchantId);
      else next.add(enchantId);
      return next;
    });
  }, []);

  // Build per-slot selected indices for fast lookup in children
  const selectionBySlot = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    for (const key of selection) {
      const [slot, idxStr] = key.split(':');
      if (!map[slot]) map[slot] = new Set();
      map[slot].add(Number(idxStr));
    }
    return map;
  }, [selection]);

  // Count total gem sockets across all selected items
  const totalSockets = useMemo(() => {
    let count = 0;
    for (const key of selection) {
      const [slot, idxStr] = key.split(':');
      const idx = Number(idxStr);
      const items = augmentedProfile.gear[slot];
      if (!items || idx >= items.length) continue;
      count += items[idx].gemIds.length;
    }
    return count;
  }, [augmentedProfile, selection]);

  // Collect equipped gem IDs (from all items marked isEquipped across all slots).
  // Include both the raw ID and the base ID (Q2 → Q1 mapping) so that chips
  // in GemOptimization show the "Equipped" badge even for Q2 quality variants.
  const equippedGemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const items of Object.values(augmentedProfile.gear)) {
      for (const item of items) {
        if (item.isEquipped) {
          for (const gid of item.gemIds) {
            if (gid > 0) {
              ids.add(gid);
              // Q2 gems have odd IDs = base even ID + 1
              if (gid % 2 === 1) ids.add(gid - 1);
            }
          }
        }
      }
    }
    return ids;
  }, [augmentedProfile]);

  // Collect equipped enchant IDs (from all items marked isEquipped across all slots)
  const equippedEnchantIds = useMemo(() => {
    const ids = new Set<number>();
    for (const items of Object.values(augmentedProfile.gear)) {
      for (const item of items) {
        if (item.isEquipped && item.enchantId != null) {
          ids.add(item.enchantId);
        }
      }
    }
    return ids;
  }, [augmentedProfile]);

  // Detect enchant consistency issues per slot group (some items have enchant, some don't)
  const enchantWarningSlots = useMemo(() => {
    const warnings = new Set<string>();
    for (const enchantableSlot of ENCHANTABLE_SLOTS) {
      // Only check selected items in this slot
      const items = augmentedProfile.gear[enchantableSlot];
      if (!items || items.length < 2) continue;

      const selectedItems = items.filter((_, idx) =>
        selection.has(`${enchantableSlot}:${idx}`),
      );
      if (selectedItems.length < 2) continue;

      const withEnchant = selectedItems.filter((i) => i.enchantId != null);
      const withoutEnchant = selectedItems.filter((i) => i.enchantId == null);

      if (withEnchant.length > 0 && withoutEnchant.length > 0) {
        // Map to enchant slot group key
        const groupKey = enchantableSlot.startsWith('finger')
          ? 'finger'
          : enchantableSlot;
        warnings.add(groupKey);
      }
    }
    return warnings;
  }, [augmentedProfile, selection]);

  // Count enchantable slots that have gear equipped/selected
  const enchantableSlotCount = useMemo(() => {
    return (ENCHANTABLE_SLOTS as readonly string[]).filter((slot) => {
      const items = augmentedProfile.gear[slot];
      return items && items.length > 0;
    }).length;
  }, [augmentedProfile]);

  // Assemble all optimization axes (gear + gems + enchants)
  const allAxes = useMemo(() => {
    const gemIds = FEATURES.GEM_OPTIMIZATION ? Array.from(selectedGemIds) : [];
    const enchantIds = FEATURES.ENCHANT_OPTIMIZATION ? Array.from(selectedEnchantIds) : [];
    return assembleAxes(augmentedProfile, selection, gemIds, enchantIds);
  }, [augmentedProfile, selection, selectedGemIds, selectedEnchantIds]);

  // Weapon validation: warn when a dual-wield spec has a selected 1H main-hand
  // but no off-hand items to pair with. Only applies to specs in DUAL_WIELD_SPECS —
  // ranged specs (e.g. BM/MM hunter) use bows/guns and never need an off-hand.
  const weaponWarning = useMemo((): string | null => {
    if (!profile.spec || !DUAL_WIELD_SPECS.has(profile.spec)) return null;

    const mhIndices = Array.from(selection)
      .filter((k) => k.startsWith('main_hand:'))
      .map((k) => Number(k.split(':')[1]));
    if (mhIndices.length === 0) return null;

    const mhItems = mhIndices
      .filter((idx) => idx < (augmentedProfile.gear.main_hand?.length ?? 0))
      .map((idx) => augmentedProfile.gear.main_hand[idx]);

    const hasOneHand = mhItems.some((i) => !i.isTwoHand);
    if (!hasOneHand) return null;

    // Check if there are any off-hand items available (selected or not)
    const ohItems = augmentedProfile.gear.off_hand ?? [];
    if (ohItems.length > 0) return null;

    const oneHandNames = mhItems
      .filter((i) => !i.isTwoHand)
      .map((i) => i.name ?? `Item #${i.id}`)
      .join(', ');
    return `${oneHandNames} ${mhItems.filter((i) => !i.isTwoHand).length === 1 ? 'is a' : 'are'} one-handed weapon${mhItems.filter((i) => !i.isTwoHand).length === 1 ? '' : 's'} and ${mhItems.filter((i) => !i.isTwoHand).length === 1 ? 'requires' : 'require'} an off-hand. Add an off-hand item or deselect the one-handed weapon${mhItems.filter((i) => !i.isTwoHand).length === 1 ? '' : 's'}.`;
  }, [augmentedProfile, selection]);

  // Report axes to parent
  useEffect(() => {
    onAxesChange?.(allAxes);
  }, [allAxes, onAxesChange]);

  // Report augmented profile to parent
  useEffect(() => {
    onAugmentedProfileChange?.(augmentedProfile);
  }, [augmentedProfile, onAugmentedProfileChange]);

  // Report tier set minimums to parent
  useEffect(() => {
    onTierSetMinimumsChange?.(tierSetMinimums);
  }, [tierSetMinimums, onTierSetMinimumsChange]);

  // Only show slots that have at least one item
  const activeSlots = SLOT_ORDER.filter((slot) => {
    if (slot in PAIRED_SLOTS) return (pairedData[slot]?.items.length ?? 0) > 0;
    const items = augmentedProfile.gear[slot];
    return items && items.length > 0;
  });

  const totalBag = Object.values(augmentedProfile.gear).reduce(
    (sum, items) => sum + items.filter((i) => !i.isEquipped && !i.isVault && !i.isUpgraded && !i.isCatalyst).length,
    0,
  );

  const totalVault = Object.values(augmentedProfile.gear).reduce(
    (sum, items) => sum + items.filter((i) => i.isVault).length,
    0,
  );

  const totalUpgraded = Object.values(augmentedProfile.gear).reduce(
    (sum, items) => sum + items.filter((i) => i.isUpgraded).length,
    0,
  );

  const totalCatalyst = Object.values(augmentedProfile.gear).reduce(
    (sum, items) => sum + items.filter((i) => i.isCatalyst).length,
    0,
  );

  const totalUnowned = Object.values(augmentedProfile.gear).reduce(
    (sum, items) => sum + items.filter((i) => i.isUnowned).length,
    0,
  );

  return (
    <div className="animate-in">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 tracking-tight">
          Gear Slots
        </h2>
        <span className="text-[11px] text-zinc-600 flex items-center gap-2">
          {totalVault > 0 && (
            <span className="text-violet-500/70">
              {totalVault} vault {totalVault === 1 ? 'item' : 'items'}
            </span>
          )}
          {totalBag > 0 && (
            <span>
              {totalBag} bag {totalBag === 1 ? 'item' : 'items'} available to compare
            </span>
          )}
          {totalUpgraded > 0 && (
            <span className="text-amber-500/70">
              {totalUpgraded} upgraded {totalUpgraded === 1 ? 'item' : 'items'}
            </span>
          )}
          {totalCatalyst > 0 && (
            <span className="text-cyan-500/70">
              {totalCatalyst} catalyst {totalCatalyst === 1 ? 'item' : 'items'}
            </span>
          )}
          {totalUnowned > 0 && (
            <span className="text-amber-500/70">
              {totalUnowned} unowned {totalUnowned === 1 ? 'item' : 'items'}
            </span>
          )}
        </span>
      </div>

      {/* Slot grid — responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeSlots.map((slot, index) => {
          const pairData = pairedData[slot];

          if (pairData) {
            const realSlots = PAIRED_SLOTS[slot];
            const isEnchantable = realSlots
              ? realSlots.some((s) => (ENCHANTABLE_SLOTS as readonly string[]).includes(s))
              : false;
            return (
              <GearSlotCard
                key={slot}
                slot={slot}
                items={pairData.items}
                selectedIndices={getPairedSelectedIndices(slot)}
                onToggle={toggleItem}
                onSelectAll={selectAllInSlot}
                onDeselectAll={deselectAllInSlot}
                isEnchantable={isEnchantable}
                delay={index * 30}
                realSlots={realSlots ? [...realSlots] : [slot]}
                onAddUnownedItem={handleAddUnownedItem}
                spec={profile.spec}
              />
            );
          }

          return (
            <GearSlotCard
              key={slot}
              slot={slot}
              items={augmentedProfile.gear[slot]}
              selectedIndices={selectionBySlot[slot] ?? new Set()}
              onToggle={toggleItem}
              onSelectAll={selectAllInSlot}
              onDeselectAll={deselectAllInSlot}
              isEnchantable={(ENCHANTABLE_SLOTS as readonly string[]).includes(slot)}
              delay={index * 30}
              realSlots={[slot]}
              onAddUnownedItem={handleAddUnownedItem}
              spec={profile.spec}
            />
          );
        })}
      </div>

      {/* Gem optimization — inline between gear grid and combination counter */}
      {FEATURES.GEM_OPTIMIZATION && (
        <div className="mt-4">
          <GemOptimization
            selectedGemIds={selectedGemIds}
            onToggleGem={toggleGem}
            totalSockets={totalSockets}
            equippedGemIds={equippedGemIds}
          />
        </div>
      )}

      {/* Enchant optimization — inline between gem optimization and combination counter */}
      {FEATURES.ENCHANT_OPTIMIZATION && (
        <div className="mt-4">
          <EnchantOptimization
            selectedEnchantIds={selectedEnchantIds}
            onToggleEnchant={toggleEnchant}
            enchantableSlotCount={enchantableSlotCount}
            equippedEnchantIds={equippedEnchantIds}
            enchantWarningSlots={enchantWarningSlots}
          />
        </div>
      )}

      {/* Tier set filter — inline between enchant optimization and combination counter */}
      {FEATURES.TIER_SET_FILTERING && (
        <div className="mt-4">
          <TierSetFilter
            profile={augmentedProfile}
            minimums={tierSetMinimums}
            onMinimumsChange={setTierSetMinimums}
          />
        </div>
      )}

      {/* Catalyst charges — tier conversion (story 5.12) */}
      {FEATURES.CATALYST_CHARGES && (
        <div className="mt-4">
          <CatalystCharges
            profile={augmentedProfile}
            selection={selection}
            catalystCharges={catalystCharges}
            onCatalystChargesChange={handleCatalystChargesChange}
          />
        </div>
      )}

      {/* Upgrade budget — item upgrade currency (story 5.11) */}
      {FEATURES.ITEM_UPGRADE_CURRENCY && (
        <div className="mt-4">
          <UpgradeBudget
            profile={profile}
            selection={selection}
            onApplyUpgrades={handleApplyUpgrades}
            onClearUpgrades={handleClearUpgrades}
            hasUpgrades={upgradeItems.size > 0}
          />
        </div>
      )}

      {/* Weapon validation warning */}
      {weaponWarning && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug bg-red-500/10 border border-red-500/20 text-red-300">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3" /><circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
          </svg>
          {weaponWarning}
        </div>
      )}

      {/* Live combination counter */}
      <div className="mt-4">
        <CombinationCounter
          axes={allAxes}
          onBlockedChange={onBlockedChange}
          onBypassLimitChange={onBypassLimitChange}
          tierSetMinimums={tierSetMinimums}
          profile={augmentedProfile}
          weaponBlocked={weaponWarning != null}
        />
      </div>
    </div>
  );
}
