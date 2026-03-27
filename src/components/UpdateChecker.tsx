import { useState, useEffect, useRef, useCallback } from 'react';

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string; body: string | null }
  | { phase: 'downloading'; percent: number }
  | { phase: 'installing' }
  | { phase: 'dismissed' };

export default function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const updateRef = useRef<Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>> | null>(null);

  useEffect(() => {
    // Don't run in browser-only dev mode
    if (!(window as any).__TAURI__) return;

    let cancelled = false;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();

        if (cancelled || !update) return;

        updateRef.current = update;
        setState({
          phase: 'available',
          version: update.version,
          body: update.body ?? null,
        });
      } catch {
        // Silently fail — expected in dev mode or if updater isn't configured
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState({ phase: 'downloading', percent: 0 });

    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          const percent = totalBytes > 0
            ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            : 0;
          setState({ phase: 'downloading', percent });
        } else if (event.event === 'Finished') {
          setState({ phase: 'installing' });
        }
      });

      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch {
      // If download fails, go back to available state so user can retry
      if (updateRef.current) {
        setState({
          phase: 'available',
          version: updateRef.current.version,
          body: updateRef.current.body ?? null,
        });
      }
    }
  }, []);

  if (state.phase === 'idle' || state.phase === 'dismissed') return null;

  return (
    <div
      className="animate-[slideDown_0.35s_ease-out] fixed top-0 left-0 right-0 z-50"
      style={{
        // Inline keyframe — avoids needing tailwind config extension
        animation: 'slideDown 0.35s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes pulseBar {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* Amber accent line at the very top */}
      <div className="h-[2px] bg-amber-500/60" />

      <div className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/80">
        <div className="mx-auto max-w-5xl px-6 py-2 flex items-center gap-3">
          {/* Status indicator dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>

          {/* Message */}
          <span className="text-xs text-zinc-300 tracking-wide flex-1 min-w-0">
            {state.phase === 'available' && (
              <>
                <span className="text-amber-200/90 font-medium">v{state.version}</span>
                <span className="text-zinc-500 mx-1.5">&mdash;</span>
                <span>Update available</span>
              </>
            )}
            {state.phase === 'downloading' && (
              <span className="text-zinc-400">
                Downloading update&hellip; {state.percent > 0 && `${state.percent}%`}
              </span>
            )}
            {state.phase === 'installing' && (
              <span className="text-amber-300/80">Installing &mdash; restarting shortly</span>
            )}
          </span>

          {/* Action area */}
          {state.phase === 'available' && (
            <button
              onClick={handleUpdate}
              className="shrink-0 px-3 py-1 text-[11px] font-medium tracking-wide
                         bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded
                         hover:bg-amber-500/25 hover:border-amber-500/40
                         active:bg-amber-500/30
                         transition-all duration-150 cursor-pointer"
            >
              Update now
            </button>
          )}

          {state.phase === 'downloading' && (
            <div className="shrink-0 w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-amber-500/70 rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${state.percent}%`,
                  animation: state.percent === 0 ? 'pulseBar 1.5s ease-in-out infinite' : undefined,
                  // Indeterminate state when percent is 0
                  ...(state.percent === 0 ? { width: '40%' } : {}),
                }}
              />
            </div>
          )}

          {/* Dismiss — only when not actively downloading/installing */}
          {state.phase === 'available' && (
            <button
              onClick={() => setState({ phase: 'dismissed' })}
              className="shrink-0 p-1 text-zinc-600 hover:text-zinc-400
                         transition-colors duration-150 cursor-pointer"
              aria-label="Dismiss update notification"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Download progress bar — full-width, paper-thin */}
        {state.phase === 'downloading' && state.percent > 0 && (
          <div className="h-px bg-zinc-800">
            <div
              className="h-full bg-amber-500/50 transition-[width] duration-300 ease-out"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
