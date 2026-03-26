import { useState, useMemo } from 'react';
import type { SimResult, OptimizationAxis } from '../lib/types';

interface SimResultsTableProps {
  results: SimResult[];
  axes: OptimizationAxis[];
}

const COLLAPSED_LIMIT = 20;

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

type SortDir = 'desc' | 'asc';

export default function SimResultsTable({
  results,
  axes,
}: SimResultsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const optionLabels = useMemo(() => buildOptionLabelMap(axes), [axes]);

  // Axis columns to show: only axes with >1 option (meaningful variation)
  const axisColumns = useMemo(
    () => axes.filter((a) => a.options.length > 1),
    [axes],
  );

  const baseline = results.find((r) => r.isBaseline);
  const baselineDps = baseline?.dps ?? 0;

  // Sort results (original `results` is always desc by DPS)
  const sorted = useMemo(() => {
    if (sortDir === 'desc') return results;
    return [...results].reverse();
  }, [results, sortDir]);

  // Rank map: result name → rank (always based on desc DPS order)
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < results.length; i++) {
      map.set(results[i].name, i + 1);
    }
    return map;
  }, [results]);

  const needsToggle = sorted.length > COLLAPSED_LIMIT;
  const visibleResults = showAll
    ? sorted
    : sorted.slice(0, COLLAPSED_LIMIT);

  // Ensure baseline is always visible when collapsed
  const baselineInVisible =
    !baseline || visibleResults.some((r) => r.isBaseline);
  const displayResults = baselineInVisible
    ? visibleResults
    : [...visibleResults, baseline];

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/40">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          Results
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-zinc-800/40 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="text-right px-3 py-2 w-10">#</th>
              <th
                className="text-right px-3 py-2 w-24 cursor-pointer select-none hover:text-zinc-400 transition-colors"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  DPS
                  <svg
                    className="w-3 h-3 opacity-60"
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
                </span>
              </th>
              <th className="text-right px-3 py-2 w-32">vs Equipped</th>
              {axisColumns.map((axis) => (
                <th key={axis.id} className="text-left px-3 py-2">
                  {axis.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayResults.map((result, idx) => {
              const rank = rankMap.get(result.name) ?? 0;
              const isBest = rank === 1;
              const delta = result.dps - baselineDps;
              const deltaPct =
                baselineDps > 0 ? (delta / baselineDps) * 100 : 0;

              const withinNoise =
                !result.isBaseline &&
                baseline != null &&
                Math.abs(delta) <
                  result.meanStdDev + baseline.meanStdDev;

              // Separator before appended baseline
              const isAppendedBaseline =
                !baselineInVisible &&
                idx === displayResults.length - 1;

              return (
                <tr
                  key={result.name}
                  className={[
                    'border-b border-zinc-800/20 transition-colors',
                    isBest
                      ? 'bg-amber-500/[0.04]'
                      : result.isBaseline
                        ? 'bg-zinc-800/20'
                        : 'hover:bg-zinc-800/30',
                    isAppendedBaseline
                      ? 'border-t border-t-zinc-700/40'
                      : '',
                  ].join(' ')}
                >
                  {/* Rank */}
                  <td className="text-right px-3 py-1.5 tabular-nums">
                    <span
                      className={
                        isBest
                          ? 'text-amber-400 font-semibold'
                          : 'text-zinc-600'
                      }
                    >
                      {rank}
                    </span>
                  </td>

                  {/* DPS */}
                  <td className="text-right px-3 py-1.5 tabular-nums">
                    <span
                      className={
                        isBest
                          ? 'text-amber-50 font-semibold'
                          : 'text-zinc-300'
                      }
                    >
                      {formatDps(result.dps)}
                    </span>
                  </td>

                  {/* Delta */}
                  <td className="text-right px-3 py-1.5 tabular-nums">
                    {result.isBaseline ? (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/40 font-medium">
                          Equipped
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={
                            delta > 0
                              ? 'text-emerald-400'
                              : delta < 0
                                ? 'text-red-400'
                                : 'text-zinc-500'
                          }
                        >
                          {delta > 0 ? '+' : ''}
                          {formatDps(delta)}
                          <span className="text-[10px] ml-0.5 opacity-60">
                            ({delta > 0 ? '+' : ''}
                            {deltaPct.toFixed(1)}%)
                          </span>
                        </span>
                        {withinNoise && (
                          <span
                            className="text-[9px] text-zinc-600 px-1 py-0.5 rounded bg-zinc-800/60"
                            title="Within statistical noise"
                          >
                            &asymp;
                          </span>
                        )}
                      </span>
                    )}
                  </td>

                  {/* Axis options */}
                  {axisColumns.map((axis) => {
                    const optionId = result.axes[axis.id];
                    const label = optionId
                      ? optionLabels.get(axis.id)?.get(optionId) ?? optionId
                      : '\u2014';
                    return (
                      <td
                        key={axis.id}
                        className="px-3 py-1.5 text-zinc-400 truncate max-w-[180px]"
                        title={label}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show all toggle */}
      {needsToggle && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 border-t border-zinc-800/40 transition-colors"
        >
          {showAll
            ? 'Show top 20'
            : `Show all ${results.length} results`}
        </button>
      )}
    </div>
  );
}
