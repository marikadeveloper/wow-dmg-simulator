import { useState, useMemo, useEffect, useRef } from 'react';
import type { SimResult } from '../lib/types';
import type { DroptimizerComboMeta } from '../lib/droptimizer-profileset';
import { SLOT_LABELS } from '../lib/droptimizer-items';
import { getItemData, type CachedItem } from '../lib/item-cache';
import { buildWowheadItemUrl, useWowheadTooltips } from '../lib/wowhead-tooltips';

// ── Constants ──────────────────────────────────────────────────────────────

const WOWHEAD_ICON_URL = 'https://wow.zamimg.com/images/wow/icons';
const DEFAULT_ICON = 'inv_misc_questionmark';

function iconUrl(icon: string | undefined, size: 'large' | 'medium' | 'small' = 'large'): string {
  return `${WOWHEAD_ICON_URL}/${size}/${icon ?? DEFAULT_ICON}.jpg`;
}

/** WoW item quality → border color class. */
const QUALITY_BORDER: Record<number, string> = {
  0: 'border-zinc-500/40',   // Poor
  1: 'border-zinc-400/40',   // Common
  2: 'border-green-500/50',  // Uncommon
  3: 'border-blue-400/50',   // Rare
  4: 'border-purple-400/50', // Epic
  5: 'border-orange-400/50', // Legendary
};

const QUALITY_TEXT: Record<number, string> = {
  0: 'text-zinc-500',
  1: 'text-zinc-300',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-orange-400',
};

// ── Types ──────────────────────────────────────────────────────────────────

type SortMode = 'priority' | 'boss_order' | 'ev' | 'best';
type DpsDisplay = 'absolute' | 'percent';

interface DroptimizerResultsProps {
  results: SimResult[];
  meta: Map<string, DroptimizerComboMeta>;
  elapsedMs: number;
  sourceLabel?: string;
  characterName?: string;
}

interface EnrichedResult {
  result: SimResult;
  meta: DroptimizerComboMeta | null;
  delta: number;
  deltaPct: number;
  isBaseline: boolean;
  variationKey: string | null;
}

interface SourceGroup {
  id: string;
  name: string;
  items: EnrichedResult[];
  expectedValue: number;
  bestDelta: number;
  priority: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDps(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDelta(n: number, mode: DpsDisplay, baseline: number): string {
  if (mode === 'percent') {
    const pct = baseline > 0 ? (n / baseline) * 100 : 0;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }
  return `${n >= 0 ? '+' : ''}${formatDps(n)}`;
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min > 0) return `${min}m ${rem.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-accent-emerald';
  if (delta < 0) return 'text-accent-red';
  return 'text-text-faint';
}

function deltaBgColor(delta: number): string {
  if (delta > 0) return 'bg-emerald-500';
  if (delta < 0) return 'bg-red-500';
  return 'bg-zinc-500';
}

// ── Item Icon Hook ─────────────────────────────────────────────────────────

function useItemIcons(itemIds: number[]): Map<number, CachedItem | null> {
  const [cache, setCache] = useState<Map<number, CachedItem | null>>(new Map());
  const key = itemIds.sort().join(',');

  useEffect(() => {
    let cancelled = false;
    const ids = key.split(',').filter(Boolean).map(Number);
    if (ids.length === 0) return;

    Promise.all(ids.map((id) => getItemData(id))).then((results) => {
      if (cancelled) return;
      const map = new Map<number, CachedItem | null>();
      ids.forEach((id, idx) => map.set(id, results[idx]));
      setCache(map);
    });

    return () => { cancelled = true; };
  }, [key]);

  return cache;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function DroptimizerResults({
  results,
  meta,
  elapsedMs,
  sourceLabel,
  characterName,
}: DroptimizerResultsProps) {
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [dpsDisplay, setDpsDisplay] = useState<DpsDisplay>('absolute');
  const [showAllVariations, setShowAllVariations] = useState(false);
  const equippedRef = useRef<HTMLDivElement>(null);

  // Baseline result
  const baseline = useMemo(
    () => results.find((r) => r.isBaseline) ?? results[results.length - 1],
    [results],
  );

  // Collect all item IDs for icon fetching
  const allItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const [, m] of meta) {
      ids.add(m.item.itemId);
    }
    return Array.from(ids);
  }, [meta]);

  const itemCache = useItemIcons(allItemIds);
  useWowheadTooltips([itemCache.size, results.length]);

  // Enrich results
  const enriched = useMemo<EnrichedResult[]>(() => {
    return results.map((r) => {
      const m = meta.get(r.name) ?? null;
      const delta = r.dps - baseline.dps;
      const deltaPct = baseline.dps > 0 ? (delta / baseline.dps) * 100 : 0;

      let variationKey: string | null = null;
      if (m?.isSlotVariation && m.item) {
        variationKey = `var_${m.item.itemId}_${m.item.slot}`;
      } else if (m && (m.item.slot === 'finger' || m.item.slot === 'trinket') && !m.isSlotVariation) {
        variationKey = `var_${m.item.itemId}_${m.item.slot}`;
      }

      return { result: r, meta: m, delta, deltaPct, isBaseline: r.isBaseline, variationKey };
    });
  }, [results, meta, baseline]);

  // Source groups for boss summary
  const sourceGroups = useMemo<SourceGroup[]>(() => {
    const groupMap = new Map<string, { name: string; items: EnrichedResult[] }>();

    for (const er of enriched) {
      if (er.isBaseline) continue;
      const groupId = er.meta?.item.sourceGroupId ?? 'unknown';
      const groupName = er.meta?.item.sourceGroupName ?? 'Unknown';
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { name: groupName, items: [] });
      }
      groupMap.get(groupId)!.items.push(er);
    }

    const groups: SourceGroup[] = [];
    for (const [id, { name, items }] of groupMap) {
      // Deduplicate: for slot variations, only count the best one per item
      const bestPerItem = new Map<number, EnrichedResult>();
      for (const item of items) {
        const itemId = item.meta?.item.itemId ?? 0;
        const existing = bestPerItem.get(itemId);
        if (!existing || item.delta > existing.delta) {
          bestPerItem.set(itemId, item);
        }
      }
      const dedupedItems = Array.from(bestPerItem.values());

      const positiveDeltas = dedupedItems.filter((i) => i.delta > 0).map((i) => i.delta);
      const expectedValue = positiveDeltas.length > 0
        ? positiveDeltas.reduce((a, b) => a + b, 0) / dedupedItems.length
        : 0;
      const bestDelta = dedupedItems.length > 0 ? Math.max(...dedupedItems.map((i) => i.delta)) : 0;
      groups.push({ id, name, items: dedupedItems, expectedValue, bestDelta, priority: 0 });
    }

    groups.sort((a, b) => b.expectedValue - a.expectedValue || b.bestDelta - a.bestDelta || a.name.localeCompare(b.name));
    groups.forEach((g, i) => { g.priority = i + 1; });

    return groups;
  }, [enriched]);

  // Sort source groups
  const sortedGroups = useMemo(() => {
    const copy = [...sourceGroups];
    switch (sortMode) {
      case 'priority': return copy.sort((a, b) => a.priority - b.priority);
      case 'ev': return copy.sort((a, b) => b.expectedValue - a.expectedValue);
      case 'best': return copy.sort((a, b) => b.bestDelta - a.bestDelta);
      case 'boss_order': return copy;
    }
  }, [sourceGroups, sortMode]);

  // Flat ranked items for Droptimizer DPS section
  const rankedItems = useMemo(() => {
    const nonBaseline = enriched.filter((e) => !e.isBaseline);
    const sorted = [...nonBaseline].sort((a, b) => b.delta - a.delta);

    // Group variations and keep best
    const variationBestMap = new Map<string, EnrichedResult>();
    const variationHiddenCount = new Map<string, number>();

    for (const item of sorted) {
      if (!item.variationKey) continue;
      if (!variationBestMap.has(item.variationKey)) {
        variationBestMap.set(item.variationKey, item);
        variationHiddenCount.set(item.variationKey, 0);
      } else {
        variationHiddenCount.set(item.variationKey, (variationHiddenCount.get(item.variationKey) ?? 0) + 1);
      }
    }

    return { sorted, variationBestMap, variationHiddenCount };
  }, [enriched]);

  // Stats
  const upgradeCount = enriched.filter((e) => !e.isBaseline && e.delta > 0).length;

  // DPS range for distribution bars
  const dpsRange = useMemo(() => {
    const nonBaseline = enriched.filter((e) => !e.isBaseline);
    if (nonBaseline.length === 0) return { min: 0, max: 0 };
    const deltas = nonBaseline.map((e) => e.delta);
    return { min: Math.min(...deltas), max: Math.max(...deltas) };
  }, [enriched]);

  const scrollToEquipped = () => {
    equippedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          BOSS SUMMARY
          ═══════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-heading">
            Boss Summary
          </h3>
          <div className="flex items-center gap-3">
            {/* Sort pills */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-text-faint mr-0.5">Sort</span>
              {([
                ['priority', 'Priority'],
                ['boss_order', 'Boss Order'],
                ['ev', 'Expected Value'],
                ['best', 'Best'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortMode(value)}
                  className={[
                    'px-2 py-0.5 rounded transition-colors',
                    sortMode === value
                      ? 'bg-amber-500/15 text-accent-amber font-semibold'
                      : 'text-text-muted hover:text-text-secondary',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Relative DPS toggle */}
            <label className="flex items-center gap-1.5 text-[10px] text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dpsDisplay === 'percent'}
                onChange={(e) => setDpsDisplay(e.target.checked ? 'percent' : 'absolute')}
                className="w-3 h-3 rounded border border-border-input bg-surface-secondary accent-amber-500"
              />
              Relative DPS
            </label>
          </div>
        </div>

        {/* Boss rows */}
        <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden divide-y divide-border-primary/50">
          {sortedGroups.map((group) => (
            <BossSummaryRow
              key={group.id}
              group={group}
              baseline={baseline}
              dpsDisplay={dpsDisplay}
              itemCache={itemCache}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-2 text-[10px] text-text-faint">
          DPS compared to your current gear. Highlighted icons indicate 0.05% or better DPS increase.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DROPTIMIZER (DPS)
          ═══════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-heading">
            Droptimizer
            <span className="text-text-faint font-normal"> (</span>
            <span className="text-accent-amber">DPS</span>
            <span className="text-text-faint font-normal">)</span>
            {sourceLabel && (
              <span className="text-text-faint font-normal ml-2">&middot; {sourceLabel}</span>
            )}
            {characterName && (
              <span className="text-text-faint font-normal ml-2">&middot; {characterName}</span>
            )}
          </h3>

          {/* Go to equipped button */}
          <button
            onClick={scrollToEquipped}
            className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-accent-amber border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
          >
            Go to Equipped
          </button>

          {/* Show All Variations */}
          <label className="flex items-center gap-1.5 text-[10px] text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllVariations}
              onChange={(e) => setShowAllVariations(e.target.checked)}
              className="w-3 h-3 rounded border border-border-input bg-surface-secondary accent-amber-500"
            />
            Show All Variations
          </label>

          {/* Relative DPS */}
          <label className="flex items-center gap-1.5 text-[10px] text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dpsDisplay === 'percent'}
              onChange={(e) => setDpsDisplay(e.target.checked ? 'percent' : 'absolute')}
              className="w-3 h-3 rounded border border-border-input bg-surface-secondary accent-amber-500"
            />
            Relative DPS
          </label>

          <div className="flex-1" />

          {/* Stats */}
          <div className="text-[10px] text-text-faint tabular-nums">
            {enriched.length - 1} items &middot; {upgradeCount} upgrades &middot; {formatElapsed(elapsedMs)}
          </div>
        </div>

        {/* Item list */}
        <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
          {rankedItems.sorted.map((er, idx) => {
            // Slot variation collapsing
            if (!showAllVariations && er.variationKey && er.meta?.isSlotVariation) {
              const best = rankedItems.variationBestMap.get(er.variationKey);
              if (best && best !== er) return null;
            }

            const hiddenCount = !showAllVariations && er.variationKey && !er.meta?.isSlotVariation
              ? (rankedItems.variationHiddenCount.get(er.variationKey) ?? 0)
              : 0;

            // Insert equipped marker between last upgrade and first non-upgrade
            const isEquippedRow = er.delta <= 0 && idx > 0 &&
              rankedItems.sorted[idx - 1]?.delta > 0;

            return (
              <div key={er.result.name}>
                {/* Insert equipped baseline marker */}
                {isEquippedRow && (
                  <div
                    ref={equippedRef}
                    className="flex items-center gap-3 px-4 py-2 border-b border-t border-amber-500/20 bg-amber-500/5"
                  >
                    <div className="w-9 h-9 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-accent-amber">Currently Equipped</span>
                      <span className="ml-2 text-[10px] text-text-faint">baseline</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-text-heading">
                      {formatDps(baseline.dps)}
                    </span>
                  </div>
                )}

                <DroptimizerItemRow
                  er={er}
                  baseline={baseline}
                  dpsDisplay={dpsDisplay}
                  dpsRange={dpsRange}
                  itemCache={itemCache}
                  hiddenVariationCount={hiddenCount}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Boss Summary Row ───────────────────────────────────────────────────────

function BossSummaryRow({
  group,
  baseline,
  dpsDisplay,
  itemCache,
}: {
  group: SourceGroup;
  baseline: SimResult;
  dpsDisplay: DpsDisplay;
  itemCache: Map<number, CachedItem | null>;
}) {
  const sortedItems = [...group.items].sort((a, b) => b.delta - a.delta);
  const hasUpgrade = group.bestDelta > 0;

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover/30 transition-colors">
      {/* Boss name — fixed width */}
      <div className="w-48 shrink-0">
        <span className="text-sm font-semibold text-text-heading leading-tight block truncate">
          {group.name}
        </span>
      </div>

      {/* Item icons grid */}
      <div className="flex items-center gap-1.5 flex-1 flex-wrap min-w-0">
        {sortedItems.map((er) => {
          const m = er.meta;
          if (!m) return null;
          const cached = itemCache.get(m.item.itemId);
          const pct = baseline.dps > 0 ? (er.delta / baseline.dps) * 100 : 0;
          const isUpgrade = pct >= 0.05;
          const isDowngrade = er.delta < 0;
          const quality = cached?.quality ?? 3;

          return (
            <a
              key={er.result.name}
              href={buildWowheadItemUrl(m.item.itemId, {
                bonusIds: m.item.bonusIds,
                ilvl: m.item.ilvl,
              })}
              onClick={(e) => e.preventDefault()}
              className="group/icon relative flex flex-col items-center"
              data-wh-icon-size="small"
            >
              {/* Icon with quality border */}
              <div className={[
                'relative w-10 h-10 rounded border-2 overflow-hidden transition-all',
                isUpgrade
                  ? 'border-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                  : isDowngrade
                    ? `${QUALITY_BORDER[quality] ?? QUALITY_BORDER[3]} opacity-60`
                    : QUALITY_BORDER[quality] ?? QUALITY_BORDER[3],
              ].join(' ')}>
                <img
                  src={iconUrl(cached?.icon)}
                  alt=""
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* CAT badge */}
                {m.item.isCatalyst && (
                  <span className="absolute top-0 right-0 bg-green-600 text-[7px] font-black text-white px-0.5 leading-none py-px">
                    CAT
                  </span>
                )}
              </div>
              {/* % DPS beneath icon */}
              <span className={[
                'text-[9px] font-bold tabular-nums mt-0.5 leading-none',
                isUpgrade ? 'text-accent-emerald' : isDowngrade ? 'text-accent-red' : 'text-text-faint',
              ].join(' ')}>
                {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
              </span>
            </a>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-5 shrink-0 tabular-nums">
        {/* Expected Value */}
        <div className="text-right w-24">
          <span className={[
            'text-sm font-bold',
            group.expectedValue > 0 ? 'text-accent-emerald' : 'text-text-faint',
          ].join(' ')}>
            {formatDelta(group.expectedValue, dpsDisplay, baseline.dps)}
          </span>
          <span className={[
            'ml-1 text-[10px]',
            group.expectedValue > 0 ? 'text-emerald-400/60' : 'text-text-faint',
          ].join(' ')}>
            DPS
          </span>
          <div className="text-[9px] text-text-faint uppercase tracking-wider">Expected Value</div>
        </div>

        {/* Best */}
        <div className="text-right w-24">
          <span className={[
            'text-sm font-bold',
            hasUpgrade ? 'text-accent-emerald' : 'text-text-faint',
          ].join(' ')}>
            {formatDelta(group.bestDelta, dpsDisplay, baseline.dps)}
          </span>
          <span className={[
            'ml-1 text-[10px]',
            hasUpgrade ? 'text-emerald-400/60' : 'text-text-faint',
          ].join(' ')}>
            DPS
          </span>
          <div className="text-[9px] text-text-faint uppercase tracking-wider">Best</div>
        </div>

        {/* Priority */}
        <div className="text-right w-8">
          <span className="text-lg font-bold text-text-heading">{group.priority}</span>
          <div className="text-[9px] text-text-faint uppercase tracking-wider">Priority</div>
        </div>
      </div>
    </div>
  );
}

// ── Droptimizer Item Row ───────────────────────────────────────────────────

function DroptimizerItemRow({
  er,
  baseline,
  dpsDisplay,
  dpsRange,
  itemCache,
  hiddenVariationCount,
}: {
  er: EnrichedResult;
  baseline: SimResult;
  dpsDisplay: DpsDisplay;
  dpsRange: { min: number; max: number };
  itemCache: Map<number, CachedItem | null>;
  hiddenVariationCount: number;
}) {
  const { result, meta: m, delta } = er;
  const isUpgrade = delta > 0;
  const isDowngrade = delta < 0;
  const cached = m ? itemCache.get(m.item.itemId) : undefined;
  const quality = cached?.quality ?? 3;

  // Distribution bar
  const range = dpsRange.max - dpsRange.min;
  const barPct = range > 0 ? ((delta - dpsRange.min) / range) * 100 : 50;

  // Slot label for display
  const slotLabel = m ? (SLOT_LABELS[m.targetSlot] ?? SLOT_LABELS[m.item.slot] ?? m.item.slot) : '';
  const isVariation = m?.isSlotVariation;

  return (
    <div className={[
      'group relative flex items-center gap-3 pl-0 pr-4 py-2.5 border-b border-border-primary/30 last:border-b-0 transition-colors',
      'hover:bg-surface-hover/40',
    ].join(' ')}>
      {/* Left accent bar — green for upgrades, transparent otherwise */}
      <div className={[
        'self-stretch w-[3px] shrink-0 rounded-r-sm',
        isUpgrade ? 'bg-emerald-400/80' : isDowngrade ? 'bg-transparent' : 'bg-transparent',
      ].join(' ')} />

      {/* Subtle distribution bar background */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none opacity-[0.03]"
        style={{
          width: `${Math.max(0, Math.min(100, barPct))}%`,
          background: isUpgrade
            ? 'linear-gradient(90deg, transparent, rgb(52,211,153))'
            : isDowngrade
              ? 'linear-gradient(90deg, transparent, rgb(248,113,113))'
              : 'linear-gradient(90deg, transparent, rgb(156,163,175))',
        }}
      />

      {/* Item icon */}
      {m ? (
        <a
          href={buildWowheadItemUrl(m.item.itemId, {
            bonusIds: m.item.bonusIds,
            ilvl: m.item.ilvl,
          })}
          onClick={(e) => e.preventDefault()}
          className="relative shrink-0"
          data-wh-icon-size="small"
        >
          <img
            src={iconUrl(cached?.icon)}
            alt=""
            width={36}
            height={36}
            className={[
              'rounded border-2',
              isUpgrade
                ? 'border-emerald-400/60 shadow-[0_0_6px_rgba(52,211,153,0.2)]'
                : QUALITY_BORDER[quality] ?? QUALITY_BORDER[3],
            ].join(' ')}
            loading="lazy"
          />
          {m.item.isCatalyst && (
            <span className="absolute -top-1 -right-1 bg-green-600 text-[7px] font-black text-white px-0.5 rounded-sm leading-tight">
              CAT
            </span>
          )}
        </a>
      ) : (
        <div className="w-9 h-9 rounded bg-surface-secondary border border-border-primary shrink-0" />
      )}

      {/* Item name + metadata */}
      <div className="relative flex-1 min-w-0">
        {/* Row 1: Item name */}
        <div className="flex items-center gap-1.5">
          <span className={[
            'text-sm font-semibold truncate',
            isUpgrade ? 'text-accent-emerald' : (QUALITY_TEXT[quality] ?? 'text-text-secondary'),
          ].join(' ')}>
            {m?.item.name ?? result.name}
          </span>
        </div>
        {/* Row 2: ilvl Slot · Source — Difficulty */}
        {m && (
          <div className="flex items-center gap-1 text-[10px] mt-0.5">
            <span className="font-bold text-accent-amber">{m.item.ilvl}</span>
            <span className="font-medium text-text-muted">{slotLabel}{isVariation ? ' 2' : ''}</span>
            <span className="text-text-disabled">&middot;</span>
            <span className="text-text-faint truncate">{m.item.sourceLabel}</span>
          </div>
        )}
      </div>

      {/* DPS value */}
      <div className="relative shrink-0 text-right">
        <span className="text-sm font-bold tabular-nums text-text-heading">
          {formatDps(result.dps)}
        </span>
      </div>

      {/* Delta */}
      <div className="relative shrink-0 w-20 text-right">
        <span className={[
          'text-sm font-bold tabular-nums',
          deltaColor(delta),
        ].join(' ')}>
          {formatDelta(delta, dpsDisplay, baseline.dps)}
        </span>
      </div>

      {/* Variation count */}
      <div className="relative shrink-0 w-28 text-right">
        {hiddenVariationCount > 0 && (
          <span className="text-[10px] text-text-faint italic">
            {hiddenVariationCount} variation{hiddenVariationCount > 1 ? 's' : ''} hidden
          </span>
        )}
      </div>

      {/* Mini DPS distribution bar */}
      <div className="relative shrink-0 w-16 h-3 flex items-center">
        <div className="w-full h-1 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all',
              deltaBgColor(delta),
              isUpgrade ? 'opacity-60' : 'opacity-20',
            ].join(' ')}
            style={{ width: `${Math.max(2, Math.min(100, barPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
