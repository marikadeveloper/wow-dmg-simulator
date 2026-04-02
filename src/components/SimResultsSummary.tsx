import type { SimResult } from '../lib/types';

interface SimResultsSummaryProps {
  results: SimResult[];
  elapsedMs: number;
  /** Number of Smart Sim stages used (0 or undefined = single-stage run). */
  smartSimStages?: number;
}

function formatDps(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min > 0) return `${min}m ${rem.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function SimResultsSummary({
  results,
  elapsedMs,
  smartSimStages,
}: SimResultsSummaryProps) {
  if (results.length === 0) return null;

  const best = results[0];
  const baseline = results.find((r) => r.isBaseline) ?? results[results.length - 1];
  const isBaselineBest = best.isBaseline;

  const delta = best.dps - baseline.dps;
  const deltaPct = baseline.dps > 0 ? (delta / baseline.dps) * 100 : 0;

  // Check if best and baseline are within statistical noise
  const withinNoise =
    !isBaselineBest && Math.abs(delta) < best.meanStdDev + baseline.meanStdDev;

  return (
    <div
      className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden"
      style={{ animation: 'results-enter 0.4s ease-out both' }}
    >
      {/* Top accent — gold for upgrade, neutral for no change */}
      <div
        className={[
          'h-px',
          isBaselineBest
            ? 'bg-border-input'
            : 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent',
        ].join(' ')}
      />

      <div className="px-4 py-3">
        {isBaselineBest ? (
          /* Already optimal */
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-emerald-400/80 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M5.5 8.5L7 10l3.5-4" />
            </svg>
            <div>
              <span className="text-sm font-medium text-text-primary">
                Your current gear is already optimal
              </span>
              <span className="text-[11px] text-text-faint ml-2">
                {formatDps(best.dps)} DPS
              </span>
            </div>
          </div>
        ) : (
          /* Upgrade found */
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Upgrade arrow */}
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <svg
                  className="w-3.5 h-3.5 text-emerald-400"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 11V3" />
                  <path d="M3.5 6.5L7 3l3.5 3.5" />
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold tabular-nums text-text-heading">
                    {formatDps(best.dps)}
                  </span>
                  <span className="text-[11px] text-text-faint">DPS</span>
                  <span className="text-xs font-medium tabular-nums text-emerald-400">
                    +{formatDps(delta)} (+{deltaPct.toFixed(1)}%)
                  </span>
                  {withinNoise && (
                    <span
                      className="text-[10px] text-text-faint px-1 py-0.5 rounded bg-surface-secondary"
                      title="The difference is within statistical noise — results may be equivalent"
                    >
                      &asymp; noise
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-text-faint">
                  vs {formatDps(baseline.dps)} equipped
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border-secondary">
          <span className="text-[10px] text-text-faint">
            {results.length} {results.length === 1 ? 'combination' : 'combinations'} compared
          </span>
          <span className="text-[10px] text-text-disabled">&middot;</span>
          <span className="text-[10px] text-text-faint">
            {formatElapsed(elapsedMs)}
          </span>
          {smartSimStages != null && smartSimStages > 1 && (
            <>
              <span className="text-[10px] text-text-disabled">&middot;</span>
              <span className="text-[10px] text-amber-500/70 font-medium">
                Smart Sim ({smartSimStages} stages)
              </span>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes results-enter {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
