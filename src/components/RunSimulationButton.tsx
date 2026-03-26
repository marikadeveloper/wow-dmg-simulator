interface RunSimulationButtonProps {
  onClick: () => void;
  isRunning: boolean;
  isBlocked: boolean;
  hasErrors: boolean;
  combinationCount: number;
}

export default function RunSimulationButton({
  onClick,
  isRunning,
  isBlocked,
  hasErrors,
  combinationCount,
}: RunSimulationButtonProps) {
  const isDisabled = isBlocked || hasErrors || isRunning;

  const disabledReason = isBlocked
    ? 'Too many combinations'
    : hasErrors
      ? 'Fix errors above'
      : null;

  return (
    <div className="relative">
      {/* Ambient glow behind button — only when enabled */}
      {!isDisabled && (
        <div
          className="absolute inset-0 rounded-lg blur-xl opacity-20 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(ellipse at center, #f59e0b 0%, transparent 70%)',
          }}
        />
      )}

      <button
        onClick={onClick}
        disabled={isDisabled}
        className={[
          'relative w-full rounded-lg px-6 py-3.5 font-semibold text-sm tracking-wide',
          'flex items-center justify-center gap-3',
          'transition-all duration-200 ease-out',
          'border',
          // Enabled state
          !isDisabled && [
            'bg-gradient-to-b from-amber-500/90 to-amber-600/90',
            'border-amber-400/30',
            'text-amber-950',
            'hover:from-amber-400/95 hover:to-amber-500/95',
            'hover:border-amber-300/40',
            'hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.35)]',
            'active:from-amber-500 active:to-amber-600',
            'active:scale-[0.995]',
          ].join(' '),
          // Running state
          isRunning && [
            'bg-gradient-to-b from-amber-500/60 to-amber-600/60',
            'border-amber-500/20',
            'text-amber-950/80',
            'cursor-wait',
          ].join(' '),
          // Disabled (blocked or errors)
          !isRunning && isDisabled && [
            'bg-zinc-800/60',
            'border-zinc-700/40',
            'text-zinc-500',
            'cursor-not-allowed',
          ].join(' '),
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Icon */}
        {isRunning ? (
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle
              cx="8"
              cy="8"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="32 12"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Lightning bolt */}
            <path d="M8.5 1.5L3.5 9h4l-1 5.5 6-8h-4.5l1-5z" />
          </svg>
        )}

        {/* Label */}
        <span>
          {isRunning ? 'Simulating...' : 'Run Top Gear'}
        </span>

        {/* Combo count pill — only when enabled and not running */}
        {!isDisabled && !isRunning && combinationCount > 1 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/30 text-amber-200/80 border border-amber-800/20">
            {combinationCount.toLocaleString()} {combinationCount === 1 ? 'combo' : 'combos'}
          </span>
        )}

        {/* Disabled reason — only when disabled and not running */}
        {!isRunning && isDisabled && disabledReason && (
          <span className="text-[11px] font-normal text-zinc-600">
            {disabledReason}
          </span>
        )}
      </button>
    </div>
  );
}
