import { useState, useMemo, useEffect } from 'react';
import type { SimcProfile, DroptimizerSourceConfig } from '../lib/types';
import {
  resolveDroptimizerItems,
  groupDroptimizerItems,
  hasEquippedOrBetter,
  SLOT_LABELS,
  type DroptimizerItem,
  type GroupByMode,
} from '../lib/droptimizer-items';
import type { DroptimizerProfileSetOptions } from '../lib/droptimizer-profileset';
import { GEM_PRESETS, GEAR_TRACKS, getClassArmorItemId, getClassArmorItemName, CATALYST_ARMOR_SLOTS } from '../lib/presets/season-config';
import { CLASS_ARMOR_TYPE } from '../lib/presets/loot-tables';

/** Emitted whenever the resolved item list or configuration options change. */
export interface DroptimizerItemListState {
  items: DroptimizerItem[];
  options: DroptimizerProfileSetOptions;
}

interface DroptimizerItemListProps {
  profile: SimcProfile;
  sourceConfig: DroptimizerSourceConfig;
  className: string;
  /** Called whenever the resolved items or options change. */
  onStateChange?: (state: DroptimizerItemListState) => void;
}

// ── Reusable checkbox ───────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={[
        'flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors',
        checked
          ? 'border-amber-500/60 bg-amber-500/15 text-amber-500'
          : 'border-border-primary bg-surface-page text-transparent group-hover:border-text-faint',
      ].join(' ')}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 4L3.2 5.7L6.5 2.3" />
        </svg>
      </span>
      <span className="text-[11px] text-text-muted group-hover:text-text-secondary transition-colors">
        {label}
      </span>
    </label>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DroptimizerItemList({
  profile,
  sourceConfig,
  className,
  onStateChange,
}: DroptimizerItemListProps) {
  const [groupBy, setGroupBy] = useState<GroupByMode>('slot');
  const [includeCatalyst, setIncludeCatalyst] = useState(true);
  const [includeOffSpec, setIncludeOffSpec] = useState(false);
  const [preferredGemId, setPreferredGemId] = useState<number | null>(null);
  const [addVaultSocket, setAddVaultSocket] = useState(false);
  const [upgradeTrack, setUpgradeTrack] = useState<string | null>(null);
  const [upgradeAllEquipped, setUpgradeAllEquipped] = useState(false);

  const spec = profile.spec?.toLowerCase();

  // Resolve base items from source config (class-filtered)
  const baseItems = useMemo(
    () => resolveDroptimizerItems(sourceConfig, className, true, spec),
    [sourceConfig, className, spec],
  );

  // Add catalyst items if enabled (for non-catalyst sources).
  // For each armor drop in a catalyzable slot, create a variant using the
  // actual class set item ID (tier set for tier slots, class armor for others).
  // This matches Raidbots' behavior: catalyst items are simulated as the
  // class set piece, not the original item.
  const catalystItems = useMemo(() => {
    if (!includeCatalyst || sourceConfig.type === 'catalyst' || !className) return [];
    const catalyzableSet = new Set(CATALYST_ARMOR_SLOTS);
    const playerArmorType = CLASS_ARMOR_TYPE[className];
    const seen = new Set<string>(); // avoid duplicates from same slot
    const results: DroptimizerItem[] = [];

    for (const baseItem of baseItems) {
      // Only armor pieces in catalyzable slots can be catalyzed
      if (!catalyzableSet.has(baseItem.slot)) continue;
      // Must match the player's armor type (or be type-agnostic like back/neck)
      if (baseItem.armorType && baseItem.armorType !== playerArmorType) continue;

      // Look up the class set item for this slot
      const classItemId = getClassArmorItemId(className, baseItem.slot);
      if (!classItemId) continue;

      // Deduplicate: only one catalyst variant per slot per source
      const dedupeKey = `${classItemId}_${baseItem.sourceGroupId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Skip if the class set item is already the base item (already a class piece)
      if (classItemId === baseItem.itemId) continue;

      const classItemName = getClassArmorItemName(className, baseItem.slot)
        ?? `${baseItem.name} (Catalyst)`;

      results.push({
        key: `cat_${classItemId}_${baseItem.sourceGroupId}_${baseItem.slot}`,
        itemId: classItemId,
        name: classItemName,
        slot: baseItem.slot,
        ilvl: baseItem.ilvl,
        bonusIds: [...baseItem.bonusIds],
        sourceLabel: `${baseItem.sourceLabel} (Catalyst)`,
        sourceGroupId: baseItem.sourceGroupId,
        sourceGroupName: baseItem.sourceGroupName,
        sourceBossId: baseItem.sourceBossId,
        sourceBossName: baseItem.sourceBossName,
        bossOrder: baseItem.bossOrder,
        portraitSlug: baseItem.portraitSlug,
        isCatalyst: true,
        armorType: playerArmorType,
      });
    }
    return results;
  }, [baseItems, includeCatalyst, sourceConfig.type, className]);

  // Off-spec items: resolve without class filtering, then pick only new ones
  const offSpecItems = useMemo(() => {
    if (!includeOffSpec || sourceConfig.type === 'catalyst') return [];
    const allUnfiltered = resolveDroptimizerItems(sourceConfig, className, false, spec);
    const existingKeys = new Set(baseItems.map((i) => i.key));
    return allUnfiltered.filter((i) => !existingKeys.has(i.key));
  }, [includeOffSpec, sourceConfig, className, baseItems]);

  // Combine all items
  const allItems = useMemo(
    () => [...baseItems, ...catalystItems, ...offSpecItems],
    [baseItems, catalystItems, offSpecItems],
  );

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({
      items: allItems,
      options: {
        preferredGemId,
        addVaultSocket,
        upgradeTrack,
        upgradeAllEquipped,
      },
    });
  }, [allItems, preferredGemId, addVaultSocket, upgradeTrack, upgradeAllEquipped, onStateChange]);

  // Group items
  const groups = useMemo(
    () => groupDroptimizerItems(allItems, groupBy),
    [allItems, groupBy],
  );

  const totalItems = allItems.length;

  return (
    <div className="space-y-4">
      {/* Configuration toolbar */}
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
        {/* Row 1: toggles and checkboxes */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          {/* Group-by toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Group by
            </span>
            <div className="flex gap-0.5 rounded-md border border-border-primary bg-surface-page p-0.5">
              <button
                onClick={() => setGroupBy('slot')}
                className={[
                  'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                  groupBy === 'slot'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                Slot
              </button>
              <button
                onClick={() => setGroupBy('source')}
                className={[
                  'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                  groupBy === 'source'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                Source
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-border-primary" />

          {sourceConfig.type !== 'catalyst' && (
            <Checkbox checked={includeCatalyst} onChange={setIncludeCatalyst} label="Catalyst items" />
          )}
          <Checkbox checked={includeOffSpec} onChange={setIncludeOffSpec} label="Off-spec items" />
          <Checkbox checked={addVaultSocket} onChange={setAddVaultSocket} label="Vault socket" />
          <Checkbox checked={upgradeAllEquipped} onChange={setUpgradeAllEquipped} label="Upgrade all equipped" />
        </div>

        {/* Row 2: dropdowns */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2.5">
          {/* Preferred Gem */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Gem
            </span>
            <select
              value={preferredGemId ?? ''}
              onChange={(e) => setPreferredGemId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-border-primary bg-surface-page px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-amber-500/40 transition-colors max-w-[200px]"
            >
              <option value="">None (no gem)</option>
              {GEM_PRESETS.filter((g) => !g.name.includes('Diamond')).map((gem) => (
                <option key={gem.id} value={gem.id}>
                  {gem.name} ({gem.stat})
                </option>
              ))}
            </select>
          </div>

          {/* Upgrade up to */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Upgrade to
            </span>
            <select
              value={upgradeTrack ?? ''}
              onChange={(e) => setUpgradeTrack(e.target.value || null)}
              className="rounded-md border border-border-primary bg-surface-page px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-amber-500/40 transition-colors"
            >
              <option value="">As-is (no upgrade)</option>
              {GEAR_TRACKS.map((track) => (
                <option key={track.name} value={track.name}>
                  {track.name} ({track.ilvlRange[1]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item count */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          <span className="tabular-nums font-medium text-text-secondary">{totalItems}</span>
          {' '}items to simulate
        </span>
        <span className="text-text-faint tabular-nums">
          {groups.length} {groupBy === 'slot' ? 'slots' : 'sources'}
        </span>
      </div>

      {/* Grouped item list */}
      <div className="space-y-1">
        {groups.map((group) => (
          <div key={group.id}>
            {/* Group header */}
            <div className="flex items-center gap-2 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-faint">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-border-primary/50" />
              <span className="text-[10px] tabular-nums text-text-faint">
                {group.items.length}
              </span>
            </div>

            {/* Item rows */}
            <div className="space-y-px">
              {group.items.map((item) => (
                <ItemRow
                  key={item.key}
                  item={item}
                  profile={profile}
                  groupBy={groupBy}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalItems === 0 && (
        <div className="py-8 text-center text-xs text-text-faint">
          No items found for this source and class.
        </div>
      )}
    </div>
  );
}

// ── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  profile,
  groupBy,
}: {
  item: DroptimizerItem;
  profile: SimcProfile;
  groupBy: GroupByMode;
}) {
  const equippedStatus = hasEquippedOrBetter(profile, item.slot, item.itemId, item.ilvl);
  const isMuted = equippedStatus !== null;

  return (
    <div className={[
      'flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-colors',
      isMuted
        ? 'opacity-50'
        : 'hover:bg-surface-secondary/50',
    ].join(' ')}>
      {/* Item name */}
      <span className={[
        'flex-1 min-w-0 truncate font-medium',
        item.isCatalyst ? 'text-green-400/90' : 'text-text-secondary',
      ].join(' ')}>
        {item.name}
      </span>

      {/* Catalyst badge */}
      {item.isCatalyst && (
        <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400/80 border border-green-500/20">
          Cat
        </span>
      )}

      {/* Equipped indicator */}
      {equippedStatus === 'same' && (
        <span className="shrink-0 text-[10px] text-text-faint italic">
          Equipped
        </span>
      )}
      {equippedStatus === 'better' && (
        <span className="shrink-0 text-[10px] text-text-faint italic">
          Better equipped
        </span>
      )}

      {/* ilvl badge */}
      <span className="shrink-0 tabular-nums text-[11px] font-semibold text-text-muted w-8 text-right">
        {item.ilvl > 0 ? item.ilvl : '—'}
      </span>

      {/* Slot label (shown when grouped by source) */}
      {groupBy === 'source' && (
        <span className="shrink-0 text-[10px] text-text-faint w-16 text-right">
          {SLOT_LABELS[item.slot] ?? item.slot}
        </span>
      )}

      {/* Source label (shown when grouped by slot) */}
      {groupBy === 'slot' && (
        <span className="shrink-0 text-[10px] text-text-faint w-36 text-right truncate">
          {item.sourceLabel}
        </span>
      )}
    </div>
  );
}
