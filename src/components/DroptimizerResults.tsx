import { useState, useMemo } from 'react';
import type { SimResult } from '../lib/types';
import type { DroptimizerComboMeta } from '../lib/droptimizer-profileset';
import { SLOT_LABELS } from '../lib/droptimizer-items';

// ── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'source' | 'ranking';
type SortMode = 'priority' | 'boss_order' | 'ev' | 'best';
type DpsDisplay = 'absolute' | 'percent';

interface DroptimizerResultsProps {
  results: SimResult[];
  meta: Map<string, DroptimizerComboMeta>;
  elapsedMs: number;
  /** Source label for the header (e.g. "Heroic Raids", "M+10 All Dungeons"). */
  sourceLabel?: string;
  /** Character name for the header. */
  characterName?: string;
}

/** Enriched result row with item metadata. */
interface EnrichedResult {
  result: SimResult;
  meta: DroptimizerComboMeta | null;
  delta: number;
  deltaPct: number;
  isBaseline: boolean;
  /** Key for grouping slot variations (e.g. "item_501_finger"). */
  variationKey: string | null;
}

/** A boss/source group with aggregated metrics. */
interface SourceGroup {
  id: string;
  name: string;
  items: EnrichedResult[];
  /** Expected DPS gain across all items (mean of positive deltas). */
  expectedValue: number;
  /** Best single drop DPS gain. */
  bestDelta: number;
  /** Priority rank (lower = higher priority). */
  priority: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Main Component ──────────────────────────────────────────────────────────

export default function DroptimizerResults({
  results,
  meta,
  elapsedMs,
  sourceLabel,
  characterName,
}: DroptimizerResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('ranking');
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [dpsDisplay, setDpsDisplay] = useState<DpsDisplay>('absolute');
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());

  // Baseline result
  const baseline = useMemo(
    () => results.find((r) => r.isBaseline) ?? results[results.length - 1],
    [results],
  );

  // Enrich results with metadata and computed fields
  const enriched = useMemo<EnrichedResult[]>(() => {
    return results.map((r) => {
      const m = meta.get(r.name) ?? null;
      const delta = r.dps - baseline.dps;
      const deltaPct = baseline.dps > 0 ? (delta / baseline.dps) * 100 : 0;

      // Build variation key for ring/trinket slot grouping
      let variationKey: string | null = null;
      if (m?.isSlotVariation && m.item) {
        variationKey = `var_${m.item.itemId}_${m.item.slot}`;
      } else if (m && (m.item.slot === 'finger' || m.item.slot === 'trinket') && !m.isSlotVariation) {
        variationKey = `var_${m.item.itemId}_${m.item.slot}`;
      }

      return { result: r, meta: m, delta, deltaPct, isBaseline: r.isBaseline, variationKey };
    });
  }, [results, meta, baseline]);

  // Group by source for boss/source summary view
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
      const positiveDeltas = items.filter((i) => i.delta > 0).map((i) => i.delta);
      const expectedValue = positiveDeltas.length > 0
        ? positiveDeltas.reduce((a, b) => a + b, 0) / items.length
        : 0;
      const bestDelta = items.length > 0 ? Math.max(...items.map((i) => i.delta)) : 0;
      groups.push({ id, name, items, expectedValue, bestDelta, priority: 0 });
    }

    // Assign priority ranks (12.32: EV → best delta → name)
    groups.sort((a, b) => b.expectedValue - a.expectedValue || b.bestDelta - a.bestDelta || a.name.localeCompare(b.name));
    groups.forEach((g, i) => { g.priority = i + 1; });

    return groups;
  }, [enriched]);

  // Sort source groups based on sort mode
  const sortedGroups = useMemo(() => {
    const copy = [...sourceGroups];
    switch (sortMode) {
      case 'priority': return copy.sort((a, b) => a.priority - b.priority);
      case 'ev': return copy.sort((a, b) => b.expectedValue - a.expectedValue);
      case 'best': return copy.sort((a, b) => b.bestDelta - a.bestDelta);
      case 'boss_order': return copy; // Keep insertion order
    }
  }, [sourceGroups, sortMode]);

  // Flat ranked items for item ranking view (12.34)
  // Collapse slot variations: show best variation, hide others (12.37)
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

  const toggleVariation = (key: string) => {
    setExpandedVariations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Stats
  const upgradeCount = enriched.filter((e) => !e.isBaseline && e.delta > 0).length;
  const bestResult = enriched.find((e) => !e.isBaseline && e.delta === Math.max(...enriched.filter((x) => !x.isBaseline).map((x) => x.delta)));

  // DPS range for distribution bars
  const dpsRange = useMemo(() => {
    const nonBaseline = enriched.filter((e) => !e.isBaseline);
    if (nonBaseline.length === 0) return { min: 0, max: 0 };
    const deltas = nonBaseline.map((e) => e.delta);
    return { min: Math.min(...deltas), max: Math.max(...deltas) };
  }, [enriched]);

  return (
    <div className="space-y-3">
      {/* Results header (12.40) */}
      <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
        {/* Golden accent if upgrades found */}
        {upgradeCount > 0 && (
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-amber-500/80 to-amber-500/50" />
        )}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-faint">
                <span>Droptimizer</span>
                {sourceLabel && (
                  <>
                    <span className="text-border-primary">/</span>
                    <span>{sourceLabel}</span>
                  </>
                )}
                {characterName && (
                  <>
                    <span className="text-border-primary">/</span>
                    <span>{characterName}</span>
                  </>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-lg font-semibold tabular-nums text-text-heading">
                  {formatDps(baseline.dps)} DPS
                </span>
                {bestResult && bestResult.delta > 0 && (
                  <span className="text-sm font-semibold tabular-nums text-accent-emerald">
                    {formatDelta(bestResult.delta, dpsDisplay, baseline.dps)} best
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] text-text-faint">
              <div>{enriched.length - 1} items simulated</div>
              <div>{upgradeCount} upgrades found</div>
              <div>{formatElapsed(elapsedMs)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View mode toggle */}
        <div className="flex gap-0.5 rounded-md border border-border-primary bg-surface-secondary p-0.5">
          <button
            onClick={() => setViewMode('ranking')}
            className={[
              'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
              viewMode === 'ranking' ? 'bg-amber-500/10 text-amber-500' : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            Item Ranking
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={[
              'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
              viewMode === 'source' ? 'bg-amber-500/10 text-amber-500' : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            By Source
          </button>
        </div>

        {/* Sort mode (source view) */}
        {viewMode === 'source' && (
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-md border border-border-primary bg-surface-secondary px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-amber-500/40"
          >
            <option value="priority">Priority</option>
            <option value="boss_order">Boss Order</option>
            <option value="ev">Expected Value</option>
            <option value="best">Best Drop</option>
          </select>
        )}

        <div className="flex-1" />

        {/* DPS display toggle (12.38) */}
        <div className="flex gap-0.5 rounded-md border border-border-primary bg-surface-secondary p-0.5">
          <button
            onClick={() => setDpsDisplay('absolute')}
            className={[
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              dpsDisplay === 'absolute' ? 'bg-amber-500/10 text-amber-500' : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            DPS
          </button>
          <button
            onClick={() => setDpsDisplay('percent')}
            className={[
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              dpsDisplay === 'percent' ? 'bg-amber-500/10 text-amber-500' : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            %
          </button>
        </div>
      </div>

      {/* Item Ranking view (12.34) */}
      {viewMode === 'ranking' && (
        <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
          {/* Baseline row (12.35) */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary bg-teal-500/5">
            <span className="w-6 text-right text-[10px] font-bold text-teal-500/80">
              —
            </span>
            <span className="flex-1 text-xs font-semibold text-teal-500/80">
              Current Gear (Equipped)
            </span>
            <span className="tabular-nums text-xs font-semibold text-text-secondary">
              {formatDps(baseline.dps)}
            </span>
            <span className="w-20 text-right text-xs text-text-faint">baseline</span>
          </div>

          {/* Ranked items */}
          <div>
            {rankedItems.sorted.map((er, idx) => {
              // Slot variation collapsing (12.37)
              if (er.variationKey && er.meta?.isSlotVariation) {
                const isExpanded = expandedVariations.has(er.variationKey);
                if (!isExpanded) return null;
              }

              const hiddenCount = er.variationKey && !er.meta?.isSlotVariation
                ? (rankedItems.variationHiddenCount.get(er.variationKey) ?? 0)
                : 0;

              return (
                <div key={er.result.name}>
                  <ItemRow
                    er={er}
                    rank={idx + 1}
                    baseline={baseline}
                    dpsDisplay={dpsDisplay}
                    dpsRange={dpsRange}
                  />
                  {/* Variation toggle (12.37) */}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleVariation(er.variationKey!)}
                      className="w-full px-3 py-1 text-[10px] text-text-faint hover:text-text-muted transition-colors text-left pl-11 border-b border-border-primary/30"
                    >
                      {expandedVariations.has(er.variationKey!)
                        ? `Hide ${hiddenCount} slot variation${hiddenCount > 1 ? 's' : ''}`
                        : `${hiddenCount} slot variation${hiddenCount > 1 ? 's' : ''} hidden`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source Summary view (12.30) */}
      {viewMode === 'source' && (
        <div className="space-y-2">
          {sortedGroups.map((group) => (
            <div key={group.id} className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border-primary/50">
                <span className="text-[10px] font-bold tabular-nums text-text-faint w-5 text-right">
                  #{group.priority}
                </span>
                <span className="text-xs font-semibold text-text-heading flex-1">
                  {group.name}
                </span>
                {/* Per-boss metrics (12.31) */}
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="text-right">
                    <div className="text-text-faint uppercase tracking-wider">EV</div>
                    <div className={group.expectedValue > 0 ? 'text-accent-emerald font-semibold tabular-nums' : 'text-text-faint tabular-nums'}>
                      {formatDelta(group.expectedValue, dpsDisplay, baseline.dps)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-text-faint uppercase tracking-wider">Best</div>
                    <div className={group.bestDelta > 0 ? 'text-accent-amber font-semibold tabular-nums' : 'text-text-faint tabular-nums'}>
                      {formatDelta(group.bestDelta, dpsDisplay, baseline.dps)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-text-faint uppercase tracking-wider">Items</div>
                    <div className="text-text-secondary tabular-nums">{group.items.length}</div>
                  </div>
                </div>
              </div>

              {/* Items within this source */}
              <div>
                {group.items
                  .sort((a, b) => b.delta - a.delta)
                  .map((er, idx) => (
                    <ItemRow
                      key={er.result.name}
                      er={er}
                      rank={idx + 1}
                      baseline={baseline}
                      dpsDisplay={dpsDisplay}
                      dpsRange={dpsRange}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item Row ────────────────────────────────────────────────────────────────

function ItemRow({
  er,
  rank,
  baseline,
  dpsDisplay,
  dpsRange,
}: {
  er: EnrichedResult;
  rank: number;
  baseline: SimResult;
  dpsDisplay: DpsDisplay;
  dpsRange: { min: number; max: number };
}) {
  const { result, meta: m, delta } = er;
  const isUpgrade = delta > 0;
  const isDowngrade = delta < 0;
  const isBest = rank === 1 && isUpgrade;

  // DPS distribution bar width (12.39)
  const range = dpsRange.max - dpsRange.min;
  const barPct = range > 0
    ? ((delta - dpsRange.min) / range) * 100
    : 50;

  return (
    <div className={[
      'group relative flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border-primary/30 last:border-b-0 transition-colors',
      'hover:bg-surface-hover/50',
    ].join(' ')}>
      {/* Distribution bar background (12.39) */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none opacity-[0.04]"
        style={{
          width: `${Math.max(0, Math.min(100, barPct))}%`,
          background: isUpgrade
            ? 'linear-gradient(90deg, transparent, rgb(52,211,153))'
            : isDowngrade
              ? 'linear-gradient(90deg, transparent, rgb(248,113,113))'
              : 'linear-gradient(90deg, transparent, rgb(156,163,175))',
        }}
      />

      {/* Rank */}
      <span className={[
        'relative w-5 text-right text-[10px] font-bold tabular-nums',
        isBest ? 'text-accent-amber' : 'text-text-faint',
      ].join(' ')}>
        {rank}
      </span>

      {/* Item name */}
      <span className={[
        'relative flex-1 min-w-0 truncate font-medium',
        m?.item.isCatalyst ? 'text-green-400/90' : 'text-text-secondary',
      ].join(' ')}>
        {m?.item.name ?? result.name}
      </span>

      {/* Catalyst badge */}
      {m?.item.isCatalyst && (
        <span className="relative shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400/80 border border-green-500/20">
          Cat
        </span>
      )}

      {/* Slot label */}
      {m && (
        <span className="relative shrink-0 text-[10px] text-text-faint w-14 text-right">
          {SLOT_LABELS[m.item.slot] ?? m.item.slot}
          {m.isSlotVariation && <span className="ml-0.5 text-text-disabled">(2)</span>}
        </span>
      )}

      {/* Upgrade/downgrade indicator (12.36) */}
      <span className={[
        'relative shrink-0 w-16 text-right tabular-nums font-semibold',
        deltaColor(delta),
      ].join(' ')}>
        {formatDelta(delta, dpsDisplay, baseline.dps)}
      </span>

      {/* Absolute DPS */}
      <span className="relative shrink-0 w-14 text-right tabular-nums text-[10px] text-text-faint">
        {formatDps(result.dps)}
      </span>
    </div>
  );
}
