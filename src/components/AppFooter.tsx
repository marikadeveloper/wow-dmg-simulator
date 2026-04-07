import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BinaryStatus {
  ok: boolean;
  version: string | null;
  error: string | null;
}

interface AppFooterProps {
  /** Bumped when config changes to re-validate */
  refreshKey?: number;
}

export default function AppFooter({ refreshKey }: AppFooterProps) {
  const [status, setStatus] = useState<BinaryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoke<BinaryStatus>('validate_simc_binary')
      .then((result) => setStatus(result))
      .catch(() =>
        setStatus({ ok: false, version: null, error: 'Failed to validate SimC binary' }),
      )
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <footer className="border-t border-border-primary bg-surface-inset">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
        {/* Left: SimC version */}
        <div className="flex items-center gap-2 text-[11px]">
          {loading ? (
            <span className="text-text-faint">Checking SimC binary...</span>
          ) : status?.ok ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                <span className="text-text-muted">SimC</span>
              </span>
              <span className="text-text-tertiary font-medium">{status.version}</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                <span className="text-accent-red/80">SimC not found</span>
              </span>
              {status?.error && (
                <span className="text-text-faint max-w-xs truncate" title={status.error}>
                  {status.error}
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: App info */}
        <div className="text-[11px] text-text-disabled">
          WoW Gear Sim v0.1.0
        </div>
      </div>
    </footer>
  );
}
