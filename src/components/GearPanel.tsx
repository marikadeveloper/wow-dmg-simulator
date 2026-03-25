import { useState, useCallback, useMemo } from 'react';
import type { SimcProfile } from '../lib/types';
import GearSlotCard, { SLOT_ORDER } from './GearSlotCard';
import CombinationCounter from './CombinationCounter';

interface GearPanelProps {
  profile: SimcProfile;
}

/**
 * Build the initial selection: all equipped items are pre-selected.
 * Returns a Set of keys like "head:0", "trinket1:0", "trinket1:1".
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

export default function GearPanel({ profile }: GearPanelProps) {
  const [selection, setSelection] = useState<Set<string>>(() =>
    buildInitialSelection(profile),
  );

  const toggleItem = useCallback((slot: string, index: number) => {
    setSelection((prev) => {
      const key = `${slot}:${index}`;
      const next = new Set(prev);

      if (next.has(key)) {
        // Guard: at least 1 item must remain selected per slot.
        // Count how many items are currently selected in this slot.
        const slotSelectedCount = Array.from(next).filter(
          (k) => k.startsWith(`${slot}:`),
        ).length;
        if (slotSelectedCount <= 1) return prev; // can't deselect the last one

        next.delete(key);
      } else {
        next.add(key);
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

  // Only show slots that have at least one item
  const activeSlots = SLOT_ORDER.filter((slot) => {
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
        {activeSlots.map((slot, index) => (
          <GearSlotCard
            key={slot}
            slot={slot}
            items={profile.gear[slot]}
            selectedIndices={selectionBySlot[slot] ?? new Set()}
            onToggle={toggleItem}
            delay={index * 30}
          />
        ))}
      </div>

      {/* Live combination counter */}
      <div className="mt-4">
        <CombinationCounter profile={profile} selection={selection} />
      </div>
    </div>
  );
}
