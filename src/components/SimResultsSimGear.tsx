import { useState, useMemo, useCallback } from 'react';
import type { SimResult, OptimizationAxis } from '../lib/types';

interface SimResultsSimGearProps {
  results: SimResult[];
  axes: OptimizationAxis[];
}

type DiffBase = 'equipped' | 'simgear';
type SortDir = 'desc' | 'asc';

const COLLAPSED_LIMIT = 10;

function formatDps(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Build a lookup: axisId → optionId → label */
function buildOptionLabelMap(
  axes: OptimizationAxis[],
): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>();
  for (const axis of axes) {
    const optMap = new Map<string, string>();
    for (const opt of axis.options) {
      optMap.set(opt.id, opt.label);
    }
    map.set(axis.id, optMap);
  }
  return map;
}

/** Find the "equipped" (baseline) option for an axis — the one with empty simcLines */
function getEquippedOptionId(axis: OptimizationAxis): string | undefined {
  const equipped = axis.options.find((o) => o.simcLines.length === 0);
  return equipped?.id;
}

/** Get items that changed relative to a reference result */
function getChangedAxes(
  result: SimResult,
  reference: SimResult | undefined,
  axes: OptimizationAxis[],
  optionLabels: Map<string, Map<string, string>>,
): { axisLabel: string; optionLabel: string }[] {
  if (!reference || result.isBaseline) return [];
  const changed: { axisLabel: string; optionLabel: string }[] = [];
  for (const axis of axes) {
    if (axis.options.length <= 1) continue;
    const resultOpt = result.axes[axis.id];
    // If the reference has no axes entry (e.g. baseline with axes: {}),
    // fall back to the equipped option (the one with empty simcLines)
    const refOpt = reference.axes[axis.id] ?? getEquippedOptionId(axis);
    if (resultOpt && resultOpt !== refOpt) {
      const label =
        optionLabels.get(axis.id)?.get(resultOpt) ?? resultOpt;
      changed.push({ axisLabel: axis.label, optionLabel: label });
    }
  }
  return changed;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function SimResultsSimGear({
  results,
  axes,
}: SimResultsSimGearProps) {
  const [showAll, setShowAll] = useState(false);
  const [diffBase, setDiffBase] = useState<DiffBase>('equipped');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);


  const optionLabels = useMemo(() => buildOptionLabelMap(axes), [axes]);

  const baseline = results.find((r) => r.isBaseline);
  const baselineDps = baseline?.dps ?? 0;
  const simGear = results.length > 0 ? results[0] : undefined;
  const simGearDps = simGear?.dps ?? 0;

  const referenceDps = diffBase === 'equipped' ? baselineDps : simGearDps;
  const referenceResult = diffBase === 'equipped' ? baseline : simGear;

  // Axis columns with >1 option (for expanded detail)
  const axisColumns = useMemo(
    () => axes.filter((a) => a.options.length > 1),
    [axes],
  );

  // Sort
  const sorted = useMemo(() => {
    if (sortDir === 'desc') return results;
    return [...results].reverse();
  }, [results, sortDir]);

  // Rank map (always based on desc DPS)
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < results.length; i++) {
      map.set(results[i].name, i + 1);
    }
    return map;
  }, [results]);

  // DPS range for bar scaling
  const maxDps = results.length > 0 ? results[0].dps : 0;
  const minDps = results.length > 0 ? results[results.length - 1].dps : 0;
  const rangeFloor = minDps - (maxDps - minDps) * 0.15;
  const dpsRange = maxDps - rangeFloor || 1;

  // Split: non-baseline ranked + baseline
  const ranked = sorted.filter((r) => !r.isBaseline);
  const needsToggle = ranked.length > COLLAPSED_LIMIT;
  const visibleRanked = showAll ? ranked : ranked.slice(0, COLLAPSED_LIMIT);

  // CSV export
  const handleExportCsv = useCallback(() => {
    const axisCols = axes.filter((a) => a.options.length > 1);
    const headers = [
      'Rank',
      'DPS',
      'Error (±)',
      'Delta',
      'Delta %',
      ...axisCols.map((a) => a.label),
    ];
    const rows = results.map((r, i) => {
      const rank = i + 1;
      const delta = r.dps - baselineDps;
      const deltaPct = baselineDps > 0 ? (delta / baselineDps) * 100 : 0;
      const axisValues = axisCols.map((axis) => {
        const optionId = r.axes[axis.id];
        return optionId
          ? optionLabels.get(axis.id)?.get(optionId) ?? optionId
          : '';
      });
      return [
        String(rank),
        r.dps.toFixed(0),
        r.meanStdDev.toFixed(1),
        delta.toFixed(0),
        deltaPct.toFixed(2) + '%',
        ...axisValues,
      ]
        .map(escapeCsvField)
        .join(',');
    });

    const csv = [headers.map(escapeCsvField).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simgear-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [results, axes, baselineDps, optionLabels]);

  const scrollToEquipped = useCallback(() => {
    const el = document.getElementById('simgear-equipped-row');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const toggleRow = (name: string) => {
    setExpandedRow((prev) => (prev === name ? null : name));
  };

  function renderRow(
    result: SimResult,
    idx: number,
    isBaselineRow: boolean,
  ) {
    const rank = rankMap.get(result.name) ?? 0;
    const isBest = rank === 1;
    const delta = result.dps - referenceDps;
    const deltaPct = referenceDps > 0 ? (delta / referenceDps) * 100 : 0;
    const barPct = Math.max(
      0,
      Math.min(100, ((result.dps - rangeFloor) / dpsRange) * 100),
    );
    const changed = getChangedAxes(result, referenceResult, axes, optionLabels);
    const isExpanded = expandedRow === result.name;

    const withinNoise =
      !result.isBaseline &&
      baseline != null &&
      Math.abs(result.dps - baselineDps) <
        result.meanStdDev + baseline.meanStdDev;

    // Hide delta for the reference row itself
    const showDelta = !(
      (diffBase === 'equipped' && result.isBaseline) ||
      (diffBase === 'simgear' && result === simGear)
    );

    return (
      <div key={result.name} id={isBaselineRow ? 'simgear-equipped-row' : undefined}>
        {/* Main row */}
        <div
          className={[
            'group relative flex items-center min-h-[36px] rounded cursor-pointer overflow-hidden transition-colors',
            isExpanded ? 'ring-1 ring-border-input' : '',
          ].join(' ')}
          onClick={() => toggleRow(result.name)}
          style={{
          }}
        >
          {/* Bar fill */}
          <div
            className="absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-out"
            style={{
              width: `${barPct}%`,
              background: isBaselineRow
                ? 'linear-gradient(90deg, rgba(94,234,212,0.06) 0%, rgba(94,234,212,0.14) 100%)'
                : isBest
                  ? 'linear-gradient(90deg, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.40) 100%)'
                  : `linear-gradient(90deg, rgba(var(--bar-neutral-rgb),0.04) 0%, rgba(var(--bar-neutral-rgb),${Math.max(0.04, 0.12 - idx * 0.004)}) 100%)`,
              boxShadow: isBest
                ? '0 0 20px -4px rgba(245,158,11,0.15), inset 0 1px 0 rgba(245,158,11,0.08)'
                : undefined,
            }}
          />

          {/* Bar edge accent for best */}
          {isBest && (
            <div
              className="absolute top-0 bottom-0 rounded-r"
              style={{
                left: `${barPct}%`,
                width: '2px',
                marginLeft: '-2px',
                background: 'rgba(245,158,11,0.5)',
                boxShadow: '0 0 6px rgba(245,158,11,0.3)',
              }}
            />
          )}

          {/* Content overlay */}
          <div className="relative z-10 flex items-center w-full px-3 py-1.5 gap-2">
            {/* Rank */}
            <span
              className={[
                'w-5 text-right text-[11px] tabular-nums shrink-0',
                isBaselineRow
                  ? 'text-teal-500/80'
                  : isBest
                    ? 'text-accent-amber font-bold'
                    : 'text-text-faint',
              ].join(' ')}
            >
              {rank}
            </span>

            {/* Change chips */}
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              {isBaselineRow ? (
                <>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] leading-none uppercase tracking-wider font-medium bg-teal-500/10 text-accent-teal/80 border border-teal-500/15">
                    Equipped
                  </span>
                  <span className="text-[10px] text-text-faint ml-0.5">
                    Current Gear
                  </span>
                </>
              ) : changed.length > 0 ? (
                <>
                  {changed.slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className={[
                        'inline-block px-1.5 py-0.5 rounded text-[9px] leading-none truncate max-w-[140px]',
                        isBest
                          ? 'bg-amber-500/10 text-accent-amber/80 border border-amber-500/15'
                          : 'bg-surface-secondary text-text-muted border border-border-input',
                      ].join(' ')}
                      title={`${c.axisLabel}: ${c.optionLabel}`}
                    >
                      {c.optionLabel}
                    </span>
                  ))}
                  {changed.length > 4 && (
                    <span className="text-[9px] text-text-faint shrink-0">
                      +{changed.length - 4}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[9px] text-text-disabled italic">
                  same as {diffBase === 'equipped' ? 'equipped' : 'sim gear'}
                </span>
              )}
            </div>

            {/* DPS */}
            <span
              className={[
                'text-[12px] tabular-nums font-mono shrink-0',
                isBaselineRow
                  ? 'text-text-tertiary'
                  : isBest
                    ? 'text-text-heading font-semibold'
                    : 'text-text-secondary',
              ].join(' ')}
            >
              {formatDps(result.dps)}
            </span>

            {/* Delta */}
            <span
              className={[
                'text-[11px] tabular-nums font-mono w-20 text-right shrink-0 inline-flex items-center justify-end gap-1',
              ].join(' ')}
            >
              {showDelta ? (
                <>
                  <span
                    className={
                      delta > 0
                        ? 'text-accent-emerald'
                        : delta < 0
                          ? 'text-accent-red'
                          : 'text-text-faint'
                    }
                  >
                    {delta > 0 ? '+' : ''}
                    {formatDps(delta)}
                  </span>
                  {withinNoise && (
                    <span
                      className="text-[8px] text-text-faint px-0.5"
                      title="Within statistical noise"
                    >
                      &asymp;
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text-disabled">&mdash;</span>
              )}
            </span>

            {/* Expand indicator */}
            <span
              className={[
                'text-text-faint group-hover:text-text-tertiary transition-transform duration-200 shrink-0 text-[10px]',
                isExpanded ? 'rotate-180' : '',
              ].join(' ')}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 3.5L5 6.5L7.5 3.5" />
              </svg>
            </span>
          </div>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div
            className="mx-1 mb-1 px-3 py-2.5 rounded-b bg-surface-hover border border-t-0 border-border-input"
          >
            <div className="flex items-center gap-4 mb-2 text-[10px] text-text-muted">
              <span>
                Error: <span className="text-text-tertiary tabular-nums">&plusmn;{formatDps(result.meanStdDev)}</span>
              </span>
              {showDelta && referenceDps > 0 && (
                <span>
                  Delta:{' '}
                  <span
                    className={[
                      'tabular-nums',
                      delta > 0
                        ? 'text-accent-emerald'
                        : delta < 0
                          ? 'text-accent-red'
                          : 'text-text-tertiary',
                    ].join(' ')}
                  >
                    {delta > 0 ? '+' : ''}
                    {deltaPct.toFixed(2)}%
                  </span>
                </span>
              )}
              {withinNoise && (
                <span className="text-text-faint italic">
                  Within statistical noise
                </span>
              )}
            </div>

            {axisColumns.length > 0 && (
              <div className="grid gap-1">
                {axisColumns.map((axis) => {
                  const optionId = result.axes[axis.id];
                  const baselineOptId = baseline?.axes[axis.id] ?? getEquippedOptionId(axis);
                  const isDiff =
                    !result.isBaseline && optionId !== baselineOptId;
                  const label = optionId
                    ? optionLabels.get(axis.id)?.get(optionId) ?? optionId
                    : '\u2014';
                  return (
                    <div
                      key={axis.id}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="text-text-faint w-24 shrink-0 truncate text-right">
                        {axis.label}
                      </span>
                      <span
                        className={[
                          'inline-flex items-center gap-1',
                          isDiff ? 'text-accent-amber/90' : 'text-text-tertiary',
                        ].join(' ')}
                      >
                        {isDiff && (
                          <span className="inline-block w-1 h-1 rounded-full bg-amber-400/70 shrink-0" />
                        )}
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border-secondary flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-text-tertiary tracking-wide">
          Sim Gear (DPS)
        </h3>

        <div className="flex items-center gap-2">
          {/* Go to Equipped button */}
          {baseline && (
            <button
              onClick={scrollToEquipped}
              className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-accent-teal/70 border border-teal-500/20 hover:border-teal-500/40 hover:text-accent-teal bg-teal-500/5 hover:bg-teal-500/10 transition-all"
            >
              Go to Equipped
            </button>
          )}

          {/* Sort toggle */}
          <button
            onClick={() =>
              setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-faint hover:text-text-tertiary hover:bg-surface-secondary transition-all"
            title={`Sort DPS ${sortDir === 'desc' ? 'ascending' : 'descending'}`}
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sortDir === 'desc' ? (
                <path d="M6 2.5v7M3 7l3 2.5L9 7" />
              ) : (
                <path d="M6 9.5v-7M3 5l3-2.5L9 5" />
              )}
            </svg>
          </button>

          {/* CSV export */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-text-muted hover:text-text-secondary hover:bg-surface-secondary border border-transparent hover:border-border-input transition-all"
            title="Export results to CSV"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2v6M3.5 5.5L6 8l2.5-2.5" />
              <path d="M2 9.5h8" />
            </svg>
            CSV
          </button>

          {/* Combination count */}
          <span className="text-[10px] text-text-faint">
            {results.length} combinations
          </span>
        </div>
      </div>

      {/* Diff base toggle */}
      <div className="px-4 py-2 border-b border-border-tertiary flex items-center gap-2 text-[10px]">
        <span className="text-text-faint">Show Gear Differences From</span>
        <div className="inline-flex rounded overflow-hidden border border-border-input">
          <button
            onClick={() => setDiffBase('equipped')}
            className={[
              'px-2.5 py-1 text-[10px] font-medium transition-all',
              diffBase === 'equipped'
                ? 'bg-border-input text-text-primary'
                : 'text-text-muted hover:text-text-tertiary hover:bg-surface-tertiary',
            ].join(' ')}
          >
            Equipped
          </button>
          <button
            onClick={() => setDiffBase('simgear')}
            className={[
              'px-2.5 py-1 text-[10px] font-medium transition-all border-l border-border-input',
              diffBase === 'simgear'
                ? 'bg-border-input text-text-primary'
                : 'text-text-muted hover:text-text-tertiary hover:bg-surface-tertiary',
            ].join(' ')}
          >
            Sim Gear
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="px-3 py-2 space-y-[3px]">
        {visibleRanked.map((result, idx) =>
          renderRow(result, idx, false),
        )}

        {/* Baseline row — separated */}
        {baseline && (
          <>
            <div className="border-t border-dashed border-border-input my-1" />
            {renderRow(baseline, visibleRanked.length, true)}
          </>
        )}
      </div>

      {/* Show all toggle */}
      {needsToggle && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full px-4 py-2 text-[11px] text-text-muted hover:text-text-secondary border-t border-border-secondary transition-colors"
        >
          {showAll ? 'Show top 10' : `Show all ${ranked.length} results`}
        </button>
      )}

    </div>
  );
}
