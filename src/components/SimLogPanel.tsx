import { useState, useRef, useEffect } from 'react';

interface SimLogPanelProps {
  lines: string[];
  isActive: boolean;
}

export default function SimLogPanel({ lines, isActive }: SimLogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive and panel is open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length, isOpen]);

  if (lines.length === 0 && !isActive) return null;

  return (
    <div className="rounded-md border border-zinc-800/40 bg-zinc-950/80 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left group"
      >
        {/* Activity dot */}
        {isActive && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400/80" />
          </span>
        )}

        <svg
          className={[
            'w-3 h-3 text-zinc-600 transition-transform duration-150',
            isOpen ? 'rotate-90' : '',
          ].join(' ')}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 2.5L8 6L4.5 9.5" />
        </svg>

        <span className="text-[11px] text-zinc-600 group-hover:text-zinc-500 transition-colors">
          {isOpen ? 'Hide logs' : 'Show logs'}
        </span>

        {/* Line count badge */}
        {!isOpen && lines.length > 0 && (
          <span className="text-[10px] tabular-nums text-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded">
            {lines.length}
          </span>
        )}
      </button>

      {/* Log viewport */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto border-t border-zinc-800/30 px-3 py-2 scroll-smooth"
        >
          {lines.length === 0 ? (
            <p className="text-[11px] text-zinc-700 italic">
              Waiting for output...
            </p>
          ) : (
            <pre className="text-[11px] leading-relaxed font-mono text-zinc-600 whitespace-pre-wrap break-all">
              {lines.join('\n')}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
