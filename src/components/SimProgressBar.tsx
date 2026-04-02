interface SimProgressBarProps {
  current: number;
  total: number;
  elapsedMs: number;
  isActive: boolean;
  /** Smart Sim stage info (null = single-stage run). */
  smartSimStage?: {
    current: number;
    total: number;
    label: string;
    combos: number;
  } | null;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function SimProgressBar({
  current,
  total,
  elapsedMs,
  isActive,
  smartSimStage,
}: SimProgressBarProps) {
  if (!isActive) return null;

  const isIndeterminate = total <= 0;
  const pct = isIndeterminate ? 0 : Math.min(100, (current / total) * 100);

  // Estimate time remaining: (elapsed / current) * remaining
  const etaMs =
    !isIndeterminate && current > 0
      ? (elapsedMs / current) * (total - current)
      : null;

  return (
    <div className="rounded-md border border-border-primary bg-surface-primary px-3 py-2.5 animate-in">
      {/* Smart Sim stage indicators */}
      {smartSimStage && smartSimStage.total > 1 && (
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: smartSimStage.total }, (_, i) => {
            const stageNum = i + 1;
            const isComplete = stageNum < smartSimStage.current;
            const isCurrent = stageNum === smartSimStage.current;
            return (
              <div key={stageNum} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={`h-px w-3 ${isComplete ? 'bg-amber-500/50' : 'bg-border-primary'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={[
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      isComplete
                        ? 'bg-amber-500/70'
                        : isCurrent
                          ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                          : 'bg-text-disabled',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'text-[10px] font-medium tracking-wide',
                      isComplete
                        ? 'text-amber-500/50'
                        : isCurrent
                          ? 'text-amber-400/90'
                          : 'text-text-faint',
                    ].join(' ')}
                  >
                    Stage {stageNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top row: label + elapsed + ETA */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-text-tertiary tracking-wide">
          {isIndeterminate ? (
            smartSimStage ? (
              <>
                {smartSimStage.label}
                <span className="text-text-faint ml-1.5">
                  ({smartSimStage.combos} combos)
                </span>
              </>
            ) : (
              'Simulating\u2026'
            )
          ) : (
            <>
              {smartSimStage ? smartSimStage.label : 'Simulating'}
              <span className="text-amber-400/90 ml-1.5 tabular-nums">
                {current}
              </span>
              <span className="text-text-faint mx-0.5">/</span>
              <span className="text-text-muted tabular-nums">{total}</span>
              {smartSimStage && (
                <span className="text-text-faint ml-1.5">
                  ({smartSimStage.combos} combos)
                </span>
              )}
            </>
          )}
        </span>

        <span className="text-[11px] tabular-nums text-text-faint flex items-center gap-2">
          {formatElapsed(elapsedMs)}
          {etaMs != null && etaMs > 0 && (
            <>
              <span className="text-text-disabled">&middot;</span>
              <span className="text-text-muted">
                ~{formatElapsed(etaMs)} left
              </span>
            </>
          )}
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-1 rounded-full bg-bar-track overflow-hidden">
        {isIndeterminate ? (
          /* Sweeping shimmer for indeterminate state */
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(245,158,11,0.5) 50%, transparent 70%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-sweep 1.6s ease-in-out infinite',
            }}
          />
        ) : (
          /* Determinate fill */
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.85) 100%)',
              boxShadow: '0 0 8px rgba(245,158,11,0.3)',
            }}
          />
        )}
      </div>

      {/* Keyframes injected via style tag — scoped to this component */}
      <style>{`
        @keyframes shimmer-sweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
