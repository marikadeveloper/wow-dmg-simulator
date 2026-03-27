import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AppConfig {
  simcBinaryPath: string | null;
  iterations: number;
  threads: number;
}

interface BinaryStatus {
  ok: boolean;
  version: string | null;
  error: string | null;
}

interface AppSettingsPanelProps {
  onConfigChange?: () => void;
}

export default function AppSettingsPanel({ onConfigChange }: AppSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [pathInput, setPathInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BinaryStatus | null>(null);
  const [saving, setSaving] = useState(false);

  // Load config on mount
  useEffect(() => {
    invoke<AppConfig>('get_config').then((cfg) => {
      setConfig(cfg);
      setPathInput(cfg.simcBinaryPath ?? '');
    }).catch(() => {
      // Ignore — defaults will be used
    });
  }, []);

  const handleValidate = useCallback(async () => {
    const trimmed = pathInput.trim();
    if (!trimmed) {
      setValidationResult(null);
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await invoke<BinaryStatus>('validate_custom_binary', { path: trimmed });
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        ok: false,
        version: null,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setValidating(false);
    }
  }, [pathInput]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    const trimmed = pathInput.trim();
    const newConfig: AppConfig = {
      ...config,
      simcBinaryPath: trimmed || null,
    };
    setSaving(true);
    try {
      await invoke('set_config', { config: newConfig });
      setConfig(newConfig);
      onConfigChange?.();
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }, [config, pathInput, onConfigChange]);

  const handleReset = useCallback(async () => {
    setPathInput('');
    setValidationResult(null);
    if (!config) return;
    const newConfig: AppConfig = { ...config, simcBinaryPath: null };
    setSaving(true);
    try {
      await invoke('set_config', { config: newConfig });
      setConfig(newConfig);
      onConfigChange?.();
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }, [config, onConfigChange]);

  const hasCustomPath = config?.simcBinaryPath != null;
  const inputChanged = pathInput.trim() !== (config?.simcBinaryPath ?? '');

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50">
      {/* Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-2.5">
          {/* Wrench icon */}
          <svg
            className="text-zinc-500 group-hover:text-zinc-400 transition-colors"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
          >
            <path
              d="M10.5 2a3.5 3.5 0 0 0-3.24 4.8L3 11.07V13h1.93l4.27-4.26A3.5 3.5 0 1 0 10.5 2z"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="11" cy="5" r="1" fill="currentColor" opacity="0.4" />
          </svg>
          <span className="text-sm font-semibold text-zinc-300 tracking-tight">
            App Settings
          </span>
          {!isOpen && hasCustomPath && (
            <span className="text-[11px] text-zinc-600 ml-1">
              Custom SimC binary
            </span>
          )}
          {!isOpen && !hasCustomPath && (
            <span className="text-[11px] text-zinc-600 ml-1">
              Using bundled SimC
            </span>
          )}
        </div>
        {/* Chevron */}
        <svg
          className={[
            'text-zinc-600 group-hover:text-zinc-400 transition-all duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
          <div className="mt-3 space-y-4">
            {/* SimC Binary Path */}
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  SimC Binary Path
                </label>
                <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
                  Override the bundled SimulationCraft binary with your own. Leave empty to use the version that ships with the app.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pathInput}
                  onChange={(e) => {
                    setPathInput(e.target.value);
                    setValidationResult(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleValidate();
                  }}
                  placeholder="/usr/local/bin/simc"
                  className={[
                    'flex-1 px-3 py-2 rounded-md text-sm text-zinc-200',
                    'bg-zinc-800/60 border border-zinc-700/50',
                    'focus:outline-none focus:border-amber-500/40 transition-colors',
                    'placeholder:text-zinc-700',
                  ].join(' ')}
                />
                <button
                  onClick={handleValidate}
                  disabled={!pathInput.trim() || validating}
                  className={[
                    'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    pathInput.trim() && !validating
                      ? 'bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                      : 'bg-zinc-800/40 border border-zinc-800/40 text-zinc-600 cursor-not-allowed',
                  ].join(' ')}
                >
                  {validating ? 'Checking...' : 'Validate'}
                </button>
              </div>

              {/* Validation result */}
              {validationResult && (
                <div
                  className={[
                    'mt-2 flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug',
                    validationResult.ok
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/20 text-red-300',
                  ].join(' ')}
                >
                  {validationResult.ok ? (
                    <>
                      <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" />
                        <path d="M4 6.5L5.8 8.3L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Valid SimC binary — version: {validationResult.version}</span>
                    </>
                  ) : (
                    <>
                      <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" />
                        <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="6.5" cy="9" r="0.6" fill="currentColor" />
                      </svg>
                      <span>{validationResult.error}</span>
                    </>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!inputChanged || saving}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    inputChanged && !saving
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25'
                      : 'bg-zinc-800/40 border border-zinc-800/40 text-zinc-600 cursor-not-allowed',
                  ].join(' ')}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {hasCustomPath && (
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Reset to bundled
                  </button>
                )}
                {!inputChanged && config?.simcBinaryPath && (
                  <span className="text-[11px] text-zinc-600">
                    Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
