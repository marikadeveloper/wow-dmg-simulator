import { useState, useMemo } from 'react';
import type { SimResult, OptimizationAxis } from '../lib/types';

interface SimResultsBarChartProps {
  results: SimResult[];
  axes: OptimizationAxis[];
}

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

/** Get a compact summary of what changed vs baseline for a result */
function getDiffSummary(
  result: SimResult,
  baseline: SimResult | undefined,
  axes: OptimizationAxis[],
  optionLabels: Map<string, Map<string, string>>,
): string[] {
  if (!baseline || result.isBaseline) return [];
  const diffs: string[] = [];
  for (const axis of axes) {
    if (axis.options.length <= 1) continue;
    const resultOpt = result.axes[axis.id];
    const baselineOpt = baseline.axes[axis.id];
    if (resultOpt && resultOpt !== baselineOpt) {
      const label = optionLabels.get(axis.id)?.get(resultOpt) ?? resultOpt;
      diffs.push(label);
    }
  }
  return diffs;
}

export default function SimResultsBarChart({
  results,
  axes,
}: SimResultsBarChartProps) {
  const [showAll, setShowAll] = useState(false);

  const optionLabels = useMemo(() => buildOptionLabelMap(axes), [axes]);

  const baseline = results.find((r) => r.isBaseline);
  const baselineDps = baseline?.dps ?? 0;

  // DPS range for bar scaling — use range between min and max for visual impact
  const maxDps = results.length > 0 ? results[0].dps : 0;
  const minDps = results.length > 0 ? results[results.length - 1].dps : 0;
  // Pad the range so even the smallest bar has visible width
  const rangeFloor = minDps - (maxDps - minDps) * 0.15;
  const dpsRange = maxDps - rangeFloor || 1;

  // Split: non-baseline ranked results + baseline
  const ranked = results.filter((r) => !r.isBaseline);
  const needsToggle = ranked.length > COLLAPSED_LIMIT;
  const visibleRanked = showAll ? ranked : ranked.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          DPS Comparison
        </h3>
        <span className="text-[10px] text-zinc-600">
          {results.length} combinations
        </span>
      </div>

      {/* Bars */}
      <div className="px-3 py-2 space-y-[3px]">
        {visibleRanked.map((result, idx) => {
          const rank = results.indexOf(result) + 1;
          const isBest = rank === 1;
          const delta = result.dps - baselineDps;
          const barPct = Math.max(0, Math.min(100, ((result.dps - rangeFloor) / dpsRange) * 100));
          const diffs = getDiffSummary(result, baseline, axes, optionLabels);

          return (
            <div
              key={result.name}
              className="group relative flex items-center h-8 rounded overflow-hidden"
              style={{
                animation: `bar-slide-in 0.4s ease-out ${idx * 40}ms both`,
              }}
            >
              {/* Bar fill */}
              <div
                className="absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-out"
                style={{
                  width: `${barPct}%`,
                  background: isBest
                    ? 'linear-gradient(90deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.45) 100%)'
                    : `linear-gradient(90deg, rgba(161,161,170,0.06) 0%, rgba(161,161,170,${0.12 - idx * 0.005}) 100%)`,
                  boxShadow: isBest
                    ? '0 0 20px -4px rgba(245,158,11,0.2), inset 0 1px 0 rgba(245,158,11,0.1)'
                    : undefined,
                }}
              />

              {/* Bar edge accent */}
              {isBest && (
                <div
                  className="absolute top-0 bottom-0 rounded-r"
                  style={{
                    left: `${barPct}%`,
                    width: '2px',
                    marginLeft: '-2px',
                    background: 'rgba(245,158,11,0.6)',
                    boxShadow: '0 0 6px rgba(245,158,11,0.4)',
                  }}
                />
              )}

              {/* Content overlay */}
              <div className="relative z-10 flex items-center w-full px-2.5 gap-2.5">
                {/* Rank */}
                <span
                  className={[
                    'w-5 text-right text-[11px] tabular-nums shrink-0',
                    isBest ? 'text-amber-400 font-bold' : 'text-zinc-600',
                  ].join(' ')}
                >
                  {rank}
                </span>

                {/* Diff summary chips */}
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                  {diffs.length > 0 ? (
                    diffs.slice(0, 3).map((label, i) => (
                      <span
                        key={i}
                        className={[
                          'inline-block px-1.5 py-0.5 rounded text-[9px] leading-none truncate max-w-[120px]',
                          isBest
                            ? 'bg-amber-500/10 text-amber-300/80 border border-amber-500/15'
                            : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30',
                        ].join(' ')}
                        title={label}
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-zinc-700 italic">
                      same as equipped
                    </span>
                  )}
                  {diffs.length > 3 && (
                    <span className="text-[9px] text-zinc-600">
                      +{diffs.length - 3}
                    </span>
                  )}
                </div>

                {/* DPS value */}
                <span
                  className={[
                    'text-[12px] tabular-nums font-mono shrink-0',
                    isBest ? 'text-amber-50 font-semibold' : 'text-zinc-300',
                  ].join(' ')}
                >
                  {formatDps(result.dps)}
                </span>

                {/* Delta */}
                <span
                  className={[
                    'text-[11px] tabular-nums font-mono w-16 text-right shrink-0',
                    delta > 0
                      ? 'text-emerald-400'
                      : delta < 0
                        ? 'text-red-400'
                        : 'text-zinc-600',
                  ].join(' ')}
                >
                  {delta > 0 ? '+' : ''}
                  {formatDps(delta)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Baseline row — always visible, separated */}
        {baseline && (
          <>
            <div className="border-t border-dashed border-zinc-700/40 my-1" />
            <div
              className="group relative flex items-center h-8 rounded overflow-hidden"
              style={{
                animation: `bar-slide-in 0.4s ease-out ${(visibleRanked.length) * 40}ms both`,
              }}
            >
              {/* Baseline bar fill — teal tint */}
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${Math.max(0, Math.min(100, ((baseline.dps - rangeFloor) / dpsRange) * 100))}%`,
                  background: 'linear-gradient(90deg, rgba(94,234,212,0.06) 0%, rgba(94,234,212,0.12) 100%)',
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center w-full px-2.5 gap-2.5">
                <span className="w-5 text-right text-[11px] text-zinc-600 tabular-nums shrink-0">
                  {results.indexOf(baseline) + 1}
                </span>

                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] leading-none uppercase tracking-wider font-medium bg-teal-500/10 text-teal-400/80 border border-teal-500/15">
                    Equipped
                  </span>
                </div>

                <span className="text-[12px] tabular-nums font-mono text-zinc-400 shrink-0">
                  {formatDps(baseline.dps)}
                </span>

                <span className="text-[11px] tabular-nums font-mono w-16 text-right text-zinc-700 shrink-0">
                  &mdash;
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Show all toggle */}
      {needsToggle && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 border-t border-zinc-800/40 transition-colors"
        >
          {showAll
            ? 'Show top 10'
            : `Show all ${ranked.length} results`}
        </button>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes bar-slide-in {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
