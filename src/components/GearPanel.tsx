import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SimcProfile, GearItem } from '../lib/types';
import GearSlotCard, { SLOT_ORDER } from './GearSlotCard';
import GemOptimization from './GemOptimization';
import EnchantOptimization from './EnchantOptimization';
import CombinationCounter from './CombinationCounter';
import { assembleAxes } from '../lib/optimization-assembler';
import { FEATURES } from '../lib/features';
import { ENCHANTABLE_SLOTS } from '../lib/presets/season-config';

interface GearPanelProps {
  profile: SimcProfile;
  /** Called when the combination count exceeds / drops below the hard block threshold (1000). */
  onBlockedChange?: (blocked: boolean) => void;
  /** Called whenever the assembled optimization axes change. */
  onAxesChange?: (axes: import('../lib/types').OptimizationAxis[]) => void;
}

/**
 * Paired slots: UI display name → [simcSlotA, simcSlotB].
 * Items from both SimC slots are merged into one card.
 */
const PAIRED_SLOTS: Record<string, [string, string]> = {
  rings: ['finger1', 'finger2'],
  trinkets: ['trinket1', 'trinket2'],
};

/** Set of all real SimC slots handled by paired display. */
const ALL_PAIRED_REAL_SLOTS = new Set(Object.values(PAIRED_SLOTS).flat());

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

export default function GearPanel({ profile, onBlockedChange, onAxesChange }: GearPanelProps) {
  // Selection uses original slot keys (finger1:N, trinket1:N), never merged names
  const [selection, setSelection] = useState<Set<string>>(() =>
    buildInitialSelection(profile),
  );
  const [selectedGemIds, setSelectedGemIds] = useState<Set<number>>(new Set());
  const [selectedEnchantIds, setSelectedEnchantIds] = useState<Set<number>>(new Set());

  // ── Merged paired slot data ─────────────────────────────────────────────

  /** Build merged mappings for a paired slot. */
  const pairedData = useMemo(() => {
    const result: Record<string, { mappings: PairMapping[]; items: GearItem[] }> = {};
    for (const [pairName, [slotA, slotB]] of Object.entries(PAIRED_SLOTS)) {
      const mappings: PairMapping[] = [];
      for (const slot of [slotA, slotB]) {
        const items = profile.gear[slot];
        if (!items) continue;
        items.forEach((item, idx) => {
          mappings.push({ originalSlot: slot, originalIndex: idx, item });
        });
      }
      result[pairName] = { mappings, items: mappings.map((m) => m.item) };
    }
    return result;
  }, [profile]);

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
      const items = profile.gear[slot];
      if (!items) return prev;
      const next = new Set(prev);
      items.forEach((_, idx) => next.add(`${slot}:${idx}`));
      return next;
    });
  }, [profile, pairedData]);

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
      const items = profile.gear[slot];
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
  }, [profile, pairedData]);

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
      const items = profile.gear[slot];
      if (!items || idx >= items.length) continue;
      count += items[idx].gemIds.length;
    }
    return count;
  }, [profile, selection]);

  // Count enchantable slots that have gear equipped/selected
  const enchantableSlotCount = useMemo(() => {
    return (ENCHANTABLE_SLOTS as readonly string[]).filter((slot) => {
      const items = profile.gear[slot];
      return items && items.length > 0;
    }).length;
  }, [profile]);

  // Assemble all optimization axes (gear + gems + enchants)
  const allAxes = useMemo(() => {
    const gemIds = FEATURES.GEM_OPTIMIZATION ? Array.from(selectedGemIds) : [];
    const enchantIds = FEATURES.ENCHANT_OPTIMIZATION ? Array.from(selectedEnchantIds) : [];
    return assembleAxes(profile, selection, gemIds, enchantIds);
  }, [profile, selection, selectedGemIds, selectedEnchantIds]);

  // Report axes to parent
  useEffect(() => {
    onAxesChange?.(allAxes);
  }, [allAxes, onAxesChange]);

  // Only show slots that have at least one item
  const activeSlots = SLOT_ORDER.filter((slot) => {
    if (slot in PAIRED_SLOTS) return (pairedData[slot]?.items.length ?? 0) > 0;
    const items = profile.gear[slot];
    return items && items.length > 0;
  });

  const totalBag = Object.values(profile.gear).reduce(
    (sum, items) => sum + items.filter((i) => !i.isEquipped && !i.isVault).length,
    0,
  );

  const totalVault = Object.values(profile.gear).reduce(
    (sum, items) => sum + items.filter((i) => i.isVault).length,
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
              />
            );
          }

          return (
            <GearSlotCard
              key={slot}
              slot={slot}
              items={profile.gear[slot]}
              selectedIndices={selectionBySlot[slot] ?? new Set()}
              onToggle={toggleItem}
              onSelectAll={selectAllInSlot}
              onDeselectAll={deselectAllInSlot}
              isEnchantable={(ENCHANTABLE_SLOTS as readonly string[]).includes(slot)}
              delay={index * 30}
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
          />
        </div>
      )}

      {/* Live combination counter */}
      <div className="mt-4">
        <CombinationCounter axes={allAxes} onBlockedChange={onBlockedChange} />
      </div>
    </div>
  );
}
