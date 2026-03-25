import { useState, useEffect } from 'react';
import type { GearItem } from '../lib/types';
import { getItemData, getItemDisplayName, type CachedItem } from '../lib/item-cache';
import { GEM_PRESETS, ENCHANT_PRESETS } from '../lib/presets/season-config';

/** Lookup maps built once from season presets. */
const GEM_BY_ID = new Map(GEM_PRESETS.map((g) => [g.id, g]));
const ENCHANT_BY_ID = new Map(ENCHANT_PRESETS.map((e) => [e.id, e]));

/** Wowhead icon CDN base URL. */
const WOWHEAD_ICON_URL = 'https://wow.zamimg.com/images/wow/icons/small';

/** Default gem icon for unknown gems. */
const DEFAULT_GEM_ICON = 'inv_misc_gem_01';

/** Get the icon URL for a gem ID. */
function getGemIconUrl(id: number): string {
  const icon = GEM_BY_ID.get(id)?.icon ?? DEFAULT_GEM_ICON;
  return `${WOWHEAD_ICON_URL}/${icon}.jpg`;
}

/** Get the enchant display name. Returns full name or "Enchant #ID". */
function getEnchantDisplayName(id: number): string {
  return ENCHANT_BY_ID.get(id)?.name ?? `Enchant #${id}`;
}

/** Get the enchant tooltip (stat it provides). */
function getEnchantTooltip(id: number): string {
  const preset = ENCHANT_BY_ID.get(id);
  if (!preset) return `Enchant ID: ${id}`;
  return preset.stat;
}

/** Get the gem tooltip (name + stat). */
function getGemTooltip(id: number): string {
  const preset = GEM_BY_ID.get(id);
  if (!preset) return `Gem ID: ${id}`;
  return `${preset.name}\n${preset.stat}`;
}

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
  /** Set of selected item indices within this slot */
  selectedIndices: Set<number>;
  /** Called when a user toggles an item */
  onToggle: (slot: string, index: number) => void;
  /** Called when user clicks "Select all" */
  onSelectAll: (slot: string) => void;
  /** Called when user clicks "Deselect all" */
  onDeselectAll: (slot: string) => void;
  /** Stagger animation delay in ms */
  delay?: number;
}

export default function GearSlotCard({
  slot,
  items,
  selectedIndices,
  onToggle,
  onSelectAll,
  onDeselectAll,
  delay = 0,
}: GearSlotCardProps) {
  const [itemNames, setItemNames] = useState<Record<number, CachedItem | null>>({});

  const label = SLOT_LABELS[slot] ?? slot;
  const icon = SLOT_ICONS[slot] ?? '\u{2699}';

  // Track equipped/vault/bag items with their original indices
  const equippedWithIdx: Array<[GearItem, number]> = [];
  const vaultWithIdx: Array<[GearItem, number]> = [];
  const bagWithIdx: Array<[GearItem, number]> = [];
  items.forEach((item, idx) => {
    if (item.isEquipped) equippedWithIdx.push([item, idx]);
    else if (item.isVault) vaultWithIdx.push([item, idx]);
    else bagWithIdx.push([item, idx]);
  });

  // Resolve item names from cache/Wowhead
  // Use a stable key (sorted item IDs) to avoid re-running on every render
  const itemIdKey = items.map((i) => i.id).sort().join(',');

  useEffect(() => {
    let cancelled = false;
    const ids = itemIdKey.split(',').filter(Boolean).map(Number);

    Promise.all(ids.map((id) => getItemData(id))).then((results) => {
      if (cancelled) return;
      const map: Record<number, CachedItem | null> = {};
      ids.forEach((id, idx) => {
        map[id] = results[idx];
      });
      setItemNames(map);
    });

    return () => { cancelled = true; };
  }, [itemIdKey]);

  const selectedCount = Array.from(selectedIndices).filter((i) => i < items.length).length;

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
        <span className="flex items-center gap-2 text-[10px] tabular-nums text-zinc-600 font-medium">
          <span>{selectedCount}/{items.length} selected</span>
          {items.length > 1 && (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectAll(slot); }}
                disabled={selectedCount === items.length}
                className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 disabled:cursor-default transition-colors"
                aria-label={`Select all ${label} items`}
              >
                all
              </button>
              <span className="text-zinc-700">/</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeselectAll(slot); }}
                disabled={selectedCount <= 1}
                className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 disabled:cursor-default transition-colors"
                aria-label={`Deselect all ${label} items`}
              >
                none
              </button>
            </span>
          )}
        </span>
      </div>

      {/* Items list */}
      <div className="px-3.5 py-2 space-y-0.5">
        {/* Equipped items */}
        {equippedWithIdx.map(([item, idx]) => (
          <ItemRow
            key={`eq-${item.id}`}
            item={item}
            cached={itemNames[item.id] ?? null}
            badge="equipped"
            selected={selectedIndices.has(idx)}
            onToggle={() => onToggle(slot, idx)}
          />
        ))}

        {/* Separator between equipped and vault/bag items */}
        {equippedWithIdx.length > 0 && (vaultWithIdx.length > 0 || bagWithIdx.length > 0) && (
          <div className="border-t border-zinc-800/30 my-1.5" />
        )}

        {/* Vault items */}
        {vaultWithIdx.map(([item, idx]) => (
          <ItemRow
            key={`vault-${item.id}-${idx}`}
            item={item}
            cached={itemNames[item.id] ?? null}
            badge="vault"
            selected={selectedIndices.has(idx)}
            onToggle={() => onToggle(slot, idx)}
          />
        ))}

        {/* Separator between vault and bag items */}
        {vaultWithIdx.length > 0 && bagWithIdx.length > 0 && (
          <div className="border-t border-zinc-800/30 my-1.5" />
        )}

        {/* Bag items */}
        {bagWithIdx.map(([item, idx]) => (
          <ItemRow
            key={`bag-${item.id}-${idx}`}
            item={item}
            cached={itemNames[item.id] ?? null}
            badge="bag"
            selected={selectedIndices.has(idx)}
            onToggle={() => onToggle(slot, idx)}
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

// ── Quality colors (WoW item quality) ────────────────────────────────────────

/** CSS color classes for WoW item quality tiers. */
const QUALITY_COLORS: Record<number, string> = {
  0: 'text-zinc-500',       // Poor (grey)
  1: 'text-zinc-300',       // Common (white)
  2: 'text-green-400',      // Uncommon
  3: 'text-blue-400',       // Rare
  4: 'text-purple-400',     // Epic
  5: 'text-orange-400',     // Legendary
};

// ── Item Row ────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: GearItem;
  cached: CachedItem | null;
  badge: 'equipped' | 'bag' | 'vault';
  selected: boolean;
  onToggle: () => void;
}

function ItemRow({ item, cached, badge, selected, onToggle }: ItemRowProps) {
  // Prefer parsed name from SimC string, then cached Wowhead name, then fallback
  const displayName = item.name ?? getItemDisplayName(item.id, cached);
  const isEquipped = badge === 'equipped';
  const isVault = badge === 'vault';

  // Gem socket indicators
  const socketCount = item.gemIds.length;

  // Quality color (default to common/white if no cached data)
  const quality = cached?.quality ?? 1;
  const qualityColor = QUALITY_COLORS[quality] ?? QUALITY_COLORS[1];

  // Item level — prefer parsed ilvl from SimC string, fall back to Wowhead cache
  const ilvl = item.ilvl ?? cached?.ilvl ?? null;

  // Enchant
  const hasEnchant = item.enchantId != null && item.enchantId > 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'w-full flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-md transition-all cursor-pointer',
        'hover:bg-zinc-800/40',
        selected
          ? isEquipped
            ? 'bg-amber-500/5'
            : isVault
              ? 'bg-violet-500/5'
              : 'bg-zinc-800/30'
          : 'opacity-60',
      ].join(' ')}
      aria-pressed={selected}
    >
      {/* Checkbox */}
      <span
        className={[
          'shrink-0 flex items-center justify-center w-4 h-4 rounded border transition-colors',
          selected
            ? isEquipped
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : isVault
                ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                : 'bg-zinc-600/30 border-zinc-500/50 text-zinc-300'
            : 'border-zinc-700/50 text-transparent',
        ].join(' ')}
      >
        {selected && (
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            viewBox="0 0 10 10"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 5.5 L4 7.5 L8 3" />
          </svg>
        )}
      </span>

      {/* Item name + details */}
      <div className="flex-1 min-w-0">
        {/* Primary line: name + ilvl + gems + enchant (Raidbots-style inline) */}
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'text-sm leading-tight truncate text-left',
              selected ? qualityColor : 'text-zinc-500',
              selected && (isEquipped || isVault) ? 'font-medium' : 'font-normal',
            ].join(' ')}
          >
            {displayName}
          </span>
        </div>

        {/* Detail line: ilvl + enchant name + gem icons */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Item level */}
          {ilvl != null && (
            <span
              className="shrink-0 text-[11px] tabular-nums text-zinc-400 font-semibold"
              title="Item Level"
            >
              {ilvl}
            </span>
          )}

          {/* Enchant name (green, tooltip shows stat) */}
          {hasEnchant && (
            <span
              className="text-[11px] text-emerald-400/90 truncate"
              title={getEnchantTooltip(item.enchantId!)}
            >
              {getEnchantDisplayName(item.enchantId!)}
            </span>
          )}

          {/* Gem icons (tooltip shows name + stat) */}
          {socketCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0">
              {item.gemIds.map((gemId, i) => (
                <img
                  key={i}
                  src={getGemIconUrl(gemId)}
                  alt={GEM_BY_ID.get(gemId)?.name ?? `Gem ${gemId}`}
                  title={getGemTooltip(gemId)}
                  width={16}
                  height={16}
                  className="rounded-sm"
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
            : isVault
              ? 'bg-violet-500/10 text-violet-400/80 border border-violet-500/15'
              : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30',
        ].join(' ')}
      >
        {isEquipped ? 'equipped' : isVault ? 'vault' : 'bag'}
      </span>
    </button>
  );
}
