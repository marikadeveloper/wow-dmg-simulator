import { useState, useCallback, useMemo } from 'react';
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
}

/** Slots that are merged into "rings" for UI + axis generation. */
const RING_SLOTS = ['finger1', 'finger2'] as const;

/**
 * Info about a merged ring item: the original slot + index in profile.gear.
 */
interface RingMapping {
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

export default function GearPanel({ profile, onBlockedChange }: GearPanelProps) {
  // Selection uses original slot keys (finger1:N, finger2:N), never "rings:N"
  const [selection, setSelection] = useState<Set<string>>(() =>
    buildInitialSelection(profile),
  );
  const [selectedGemIds, setSelectedGemIds] = useState<Set<number>>(new Set());
  const [selectedEnchantIds, setSelectedEnchantIds] = useState<Set<number>>(new Set());

  // ── Merged rings data ──────────────────────────────────────────────────

  /** Combined ring items from finger1 + finger2, with original slot mapping. */
  const ringMappings: RingMapping[] = useMemo(() => {
    const mappings: RingMapping[] = [];
    for (const slot of RING_SLOTS) {
      const items = profile.gear[slot];
      if (!items) continue;
      items.forEach((item, idx) => {
        mappings.push({ originalSlot: slot, originalIndex: idx, item });
      });
    }
    return mappings;
  }, [profile]);

  /** The merged ring items array (for GearSlotCard). */
  const ringItems: GearItem[] = useMemo(
    () => ringMappings.map((m) => m.item),
    [ringMappings],
  );

  /** Convert merged ring index → original selection key. */
  const ringIndexToKey = useCallback(
    (mergedIndex: number): string | null => {
      const mapping = ringMappings[mergedIndex];
      if (!mapping) return null;
      return `${mapping.originalSlot}:${mapping.originalIndex}`;
    },
    [ringMappings],
  );

  /** Selected indices in the merged ring array (for GearSlotCard). */
  const ringSelectedIndices: Set<number> = useMemo(() => {
    const indices = new Set<number>();
    ringMappings.forEach((m, mergedIdx) => {
      const key = `${m.originalSlot}:${m.originalIndex}`;
      if (selection.has(key)) indices.add(mergedIdx);
    });
    return indices;
  }, [ringMappings, selection]);

  /** Count of currently selected rings (across finger1 + finger2). */
  const selectedRingCount = ringSelectedIndices.size;

  // ── Toggle / select all / deselect all ──────────────────────────────────

  const toggleItem = useCallback((slot: string, index: number) => {
    // For merged rings, map the index back to the original key
    if (slot === 'rings') {
      const origKey = ringMappings[index]
        ? `${ringMappings[index].originalSlot}:${ringMappings[index].originalIndex}`
        : null;
      if (!origKey) return;

      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(origKey)) {
          // Guard: at least 2 rings must remain selected
          const currentRingCount = ringMappings.filter((m) =>
            next.has(`${m.originalSlot}:${m.originalIndex}`),
          ).length;
          if (currentRingCount <= 2) return prev;
          next.delete(origKey);
        } else {
          next.add(origKey);
        }
        return next;
      });
      return;
    }

    setSelection((prev) => {
      const key = `${slot}:${index}`;
      const next = new Set(prev);

      if (next.has(key)) {
        // Guard: at least 1 item must remain selected per slot.
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
  }, [ringMappings]);

  const selectAllInSlot = useCallback((slot: string) => {
    if (slot === 'rings') {
      setSelection((prev) => {
        const next = new Set(prev);
        for (const m of ringMappings) {
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
  }, [profile, ringMappings]);

  const deselectAllInSlot = useCallback((slot: string) => {
    if (slot === 'rings') {
      setSelection((prev) => {
        const next = new Set(prev);
        // Keep the 2 equipped rings, deselect everything else
        const equipped: string[] = [];
        const others: string[] = [];
        for (const m of ringMappings) {
          const key = `${m.originalSlot}:${m.originalIndex}`;
          if (m.item.isEquipped) equipped.push(key);
          else others.push(key);
        }
        // Deselect non-equipped
        for (const key of others) next.delete(key);
        // Ensure equipped are selected
        for (const key of equipped) next.add(key);
        // If fewer than 2 equipped, keep first items to reach 2
        if (equipped.length < 2) {
          let needed = 2 - equipped.length;
          for (const m of ringMappings) {
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

      // Find the equipped item index to keep (or first item if none equipped)
      const equippedIdx = items.findIndex((i) => i.isEquipped);
      const keepIdx = equippedIdx >= 0 ? equippedIdx : 0;

      items.forEach((_, idx) => {
        if (idx !== keepIdx) next.delete(`${slot}:${idx}`);
      });
      // Ensure the kept one is selected
      next.add(`${slot}:${keepIdx}`);
      return next;
    });
  }, [profile, ringMappings]);

  const toggleGem = useCallback((gemId: number) => {
    setSelectedGemIds((prev) => {
      const next = new Set(prev);
      if (next.has(gemId)) {
        next.delete(gemId);
      } else {
        next.add(gemId);
      }
      return next;
    });
  }, []);

  const toggleEnchant = useCallback((enchantId: number) => {
    setSelectedEnchantIds((prev) => {
      const next = new Set(prev);
      if (next.has(enchantId)) {
        next.delete(enchantId);
      } else {
        next.add(enchantId);
      }
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

  // Only show slots that have at least one item
  const activeSlots = SLOT_ORDER.filter((slot) => {
    if (slot === 'rings') return ringItems.length > 0;
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
          if (slot === 'rings') {
            return (
              <GearSlotCard
                key="rings"
                slot="rings"
                items={ringItems}
                selectedIndices={ringSelectedIndices}
                onToggle={toggleItem}
                onSelectAll={selectAllInSlot}
                onDeselectAll={deselectAllInSlot}
                isEnchantable={true}
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
