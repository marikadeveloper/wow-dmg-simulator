import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string; body: string | null }
  | { phase: 'downloading'; percent: number }
  | { phase: 'installing' }
  | { phase: 'up-to-date' }
  | { phase: 'error'; message: string }
  | { phase: 'dismissed' };

export interface UpdateCheckerHandle {
  checkForUpdates: () => Promise<void>;
}

const UpdateChecker = forwardRef<UpdateCheckerHandle>(function UpdateChecker(_props, ref) {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const updateRef = useRef<Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>> | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!(window as any).__TAURI__) return;

    setState({ phase: 'checking' });
    updateRef.current = null;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (!update) {
        setState({ phase: 'up-to-date' });
        return;
      }

      updateRef.current = update;
      setState({
        phase: 'available',
        version: update.version,
        body: update.body ?? null,
      });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Expose checkForUpdates to parent via ref
  useImperativeHandle(ref, () => ({ checkForUpdates }), [checkForUpdates]);

  // Auto-check on mount
  useEffect(() => {
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
        // Silently fail on auto-check — expected in dev mode
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

  // Only show the banner for actionable states
  if (state.phase === 'idle' || state.phase === 'dismissed' || state.phase === 'checking' || state.phase === 'up-to-date' || state.phase === 'error') return null;

  return (
    <div
      className="animate-[slideDown_0.35s_ease-out] fixed top-0 left-0 right-0 z-50"
      style={{
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

      <div className="bg-surface-overlay/95 backdrop-blur-sm border-b border-border-primary">
        <div className="mx-auto max-w-5xl px-6 py-2 flex items-center gap-3">
          {/* Status indicator dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>

          {/* Message */}
          <span className="text-xs text-text-secondary tracking-wide flex-1 min-w-0">
            {state.phase === 'available' && (
              <>
                <span className="text-amber-200/90 font-medium">v{state.version}</span>
                <span className="text-text-muted mx-1.5">&mdash;</span>
                <span>Update available</span>
              </>
            )}
            {state.phase === 'downloading' && (
              <span className="text-text-tertiary">
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
            <div className="shrink-0 w-24 h-1.5 rounded-full bg-bar-track overflow-hidden">
              <div
                className="h-full bg-amber-500/70 rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${state.percent}%`,
                  animation: state.percent === 0 ? 'pulseBar 1.5s ease-in-out infinite' : undefined,
                  ...(state.percent === 0 ? { width: '40%' } : {}),
                }}
              />
            </div>
          )}

          {/* Dismiss — only when not actively downloading/installing */}
          {state.phase === 'available' && (
            <button
              onClick={() => setState({ phase: 'dismissed' })}
              className="shrink-0 p-1 text-text-faint hover:text-text-tertiary
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
          <div className="h-px bg-bar-track">
            <div
              className="h-full bg-amber-500/50 transition-[width] duration-300 ease-out"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default UpdateChecker;
