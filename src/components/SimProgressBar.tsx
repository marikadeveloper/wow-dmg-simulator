interface SimProgressBarProps {
  current: number;
  total: number;
  elapsedMs: number;
  isActive: boolean;
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
    <div className="rounded-md border border-zinc-800/60 bg-zinc-900/50 px-3 py-2.5 animate-in">
      {/* Top row: label + elapsed + ETA */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-zinc-400 tracking-wide">
          {isIndeterminate ? (
            'Simulating\u2026'
          ) : (
            <>
              Simulating
              <span className="text-amber-400/90 ml-1.5 tabular-nums">
                {current}
              </span>
              <span className="text-zinc-600 mx-0.5">/</span>
              <span className="text-zinc-500 tabular-nums">{total}</span>
            </>
          )}
        </span>

        <span className="text-[11px] tabular-nums text-zinc-600 flex items-center gap-2">
          {formatElapsed(elapsedMs)}
          {etaMs != null && etaMs > 0 && (
            <>
              <span className="text-zinc-700">&middot;</span>
              <span className="text-zinc-500">
                ~{formatElapsed(etaMs)} left
              </span>
            </>
          )}
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-1 rounded-full bg-zinc-800/80 overflow-hidden">
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
