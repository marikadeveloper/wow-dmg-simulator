import { useState, useEffect } from 'react';
import type { GearItem } from '../lib/types';
import { getItemData, getItemDisplayName, type CachedItem } from '../lib/item-cache';

/** Canonical slot display order matching the WoW paper doll. */
export const SLOT_ORDER = [
  'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
  'hands', 'waist', 'legs', 'feet',
  'finger1', 'finger2', 'trinket1', 'trinket2',
  'main_hand', 'off_hand',
] as const;

const SLOT_LABELS: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulders',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrists',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Ring 1',
  finger2: 'Ring 2',
  trinket1: 'Trinket 1',
  trinket2: 'Trinket 2',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
};

const SLOT_ICONS: Record<string, string> = {
  head: '\u{1FA96}',       // military helmet
  neck: '\u{1F4FF}',       // prayer beads
  shoulder: '\u{1F6E1}',   // shield
  back: '\u{1F9E3}',       // scarf
  chest: '\u{1F9E5}',      // goggles → coat (closest)
  wrist: '\u{26D3}',       // chains
  hands: '\u{1F9E4}',      // gloves
  waist: '\u{1F4BF}',      // disc (belt buckle)
  legs: '\u{1FA73}',       // shorts
  feet: '\u{1F97E}',       // hiking boot
  finger1: '\u{1F48D}',    // ring
  finger2: '\u{1F48D}',    // ring
  trinket1: '\u{1F4A0}',   // diamond with dot
  trinket2: '\u{1F4A0}',   // diamond with dot
  main_hand: '\u{2694}',   // crossed swords
  off_hand: '\u{1F5E1}',   // dagger
};

interface GearSlotCardProps {
  slot: string;
  items: GearItem[];
  /** Stagger animation delay in ms */
  delay?: number;
}

export default function GearSlotCard({ slot, items, delay = 0 }: GearSlotCardProps) {
  const [itemNames, setItemNames] = useState<Record<number, CachedItem | null>>({});

  const label = SLOT_LABELS[slot] ?? slot;
  const icon = SLOT_ICONS[slot] ?? '\u{2699}';
  const equipped = items.filter((i) => i.isEquipped);
  const bag = items.filter((i) => !i.isEquipped);

  // Resolve item names from cache/Wowhead
  useEffect(() => {
    let cancelled = false;
    const ids = items.map((i) => i.id);

    Promise.all(ids.map((id) => getItemData(id))).then((results) => {
      if (cancelled) return;
      const map: Record<number, CachedItem | null> = {};
      ids.forEach((id, idx) => {
        map[id] = results[idx];
      });
      setItemNames(map);
    });

    return () => { cancelled = true; };
  }, [items]);

  return (
    <div
      className="gear-card group rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/40">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70" role="img" aria-label={label}>
            {icon}
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {label}
          </h3>
        </div>
        <span className="text-[10px] tabular-nums text-zinc-600 font-medium">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Items list */}
      <div className="px-3.5 py-2 space-y-0.5">
        {/* Equipped items */}
        {equipped.map((item) => (
          <ItemRow
            key={`eq-${item.id}`}
            item={item}
            cached={itemNames[item.id] ?? null}
            badge="equipped"
          />
        ))}

        {/* Separator between equipped and bag items */}
        {equipped.length > 0 && bag.length > 0 && (
          <div className="border-t border-zinc-800/30 my-1.5" />
        )}

        {/* Bag items */}
        {bag.map((item, idx) => (
          <ItemRow
            key={`bag-${item.id}-${idx}`}
            item={item}
            cached={itemNames[item.id] ?? null}
            badge="bag"
          />
        ))}

        {/* Empty slot */}
        {items.length === 0 && (
          <div className="py-3 text-center text-xs text-zinc-700 italic">
            No items
          </div>
        )}
      </div>
    </div>
  );
}

// ── Item Row ────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: GearItem;
  cached: CachedItem | null;
  badge: 'equipped' | 'bag';
}

function ItemRow({ item, cached, badge }: ItemRowProps) {
  const displayName = getItemDisplayName(item.id, cached);
  const isEquipped = badge === 'equipped';

  // Gem socket indicators
  const socketCount = item.gemIds.length;

  return (
    <div
      className={[
        'flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-md transition-colors',
        'hover:bg-zinc-800/40',
        isEquipped ? 'text-zinc-200' : 'text-zinc-400',
      ].join(' ')}
    >
      {/* Item name + details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'text-sm leading-tight truncate',
              isEquipped ? 'font-medium' : 'font-normal',
            ].join(' ')}
          >
            {displayName}
          </span>

          {/* Socket dots */}
          {socketCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: socketCount }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500/50 ring-1 ring-amber-500/20"
                  title={`Socket ${i + 1}`}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Badge */}
      <span
        className={[
          'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded',
          isEquipped
            ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/15'
            : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30',
        ].join(' ')}
      >
        {isEquipped ? 'equipped' : 'bag'}
      </span>
    </div>
  );
}
