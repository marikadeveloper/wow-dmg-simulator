import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CURRENT_SEASON } from '../lib/presets/season-config';

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
  onCheckForUpdates?: () => Promise<void>;
}

export default function AppSettingsPanel({ onConfigChange, onCheckForUpdates }: AppSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [pathInput, setPathInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BinaryStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<string | null>(null);

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

  const handleRefreshDb = useCallback(async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const count = await invoke<number>('refresh_item_db', { branch: CURRENT_SEASON.simcBranch });
      setRefreshResult({ ok: true, message: `Updated — ${count.toLocaleString()} items` });
    } catch (err) {
      setRefreshResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    if (!onCheckForUpdates) return;
    setCheckingUpdates(true);
    setUpdateCheckResult(null);
    try {
      await onCheckForUpdates();
      setUpdateCheckResult('checked');
    } catch {
      setUpdateCheckResult('error');
    } finally {
      setCheckingUpdates(false);
    }
  }, [onCheckForUpdates]);

  const hasCustomPath = config?.simcBinaryPath != null;
  const inputChanged = pathInput.trim() !== (config?.simcBinaryPath ?? '');

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary">
      {/* Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-2.5">
          {/* Wrench icon */}
          <svg
            className="text-text-muted group-hover:text-text-tertiary transition-colors"
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
          <span className="text-sm font-semibold text-text-secondary tracking-tight">
            App Settings
          </span>
          {!isOpen && hasCustomPath && (
            <span className="text-[11px] text-text-faint ml-1">
              Custom SimC binary
            </span>
          )}
          {!isOpen && !hasCustomPath && (
            <span className="text-[11px] text-text-faint ml-1">
              Using bundled SimC
            </span>
          )}
        </div>
        {/* Chevron */}
        <svg
          className={[
            'text-text-faint group-hover:text-text-tertiary transition-all duration-200',
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
        <div className="px-4 pb-4 pt-1 border-t border-border-primary">
          <div className="mt-3 space-y-4">
            {/* SimC Binary Path */}
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-medium text-text-tertiary">
                  SimC Binary Path
                </label>
                <p className="text-[11px] text-text-faint leading-snug mt-0.5">
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
                    'flex-1 px-3 py-2 rounded-md text-sm text-text-primary',
                    'bg-surface-secondary border border-border-input',
                    'focus:outline-none focus:border-amber-500/40 transition-colors',
                    'placeholder:text-text-disabled',
                  ].join(' ')}
                />
                <button
                  onClick={handleValidate}
                  disabled={!pathInput.trim() || validating}
                  className={[
                    'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    pathInput.trim() && !validating
                      ? 'bg-surface-secondary border border-border-input text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      : 'bg-surface-tertiary border border-surface-tertiary text-text-faint cursor-not-allowed',
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
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-accent-emerald'
                      : 'bg-red-500/10 border border-red-500/20 text-accent-red',
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
                      : 'bg-surface-tertiary border border-surface-tertiary text-text-faint cursor-not-allowed',
                  ].join(' ')}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {hasCustomPath && (
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Reset to bundled
                  </button>
                )}
                {!inputChanged && config?.simcBinaryPath && (
                  <span className="text-[11px] text-text-faint">
                    Saved
                  </span>
                )}
              </div>
            </div>
            {/* Item Database */}
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-medium text-text-tertiary">
                  Item Database
                </label>
                <p className="text-[11px] text-text-faint leading-snug mt-0.5">
                  Re-download the item database from SimC source. Use this if new items were added since the app was released.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshDb}
                  disabled={refreshing}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    !refreshing
                      ? 'bg-surface-secondary border border-border-input text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      : 'bg-surface-tertiary border border-surface-tertiary text-text-faint cursor-not-allowed',
                  ].join(' ')}
                >
                  {refreshing ? 'Downloading...' : 'Refresh item database'}
                </button>
                {refreshResult && (
                  <span className={`text-[11px] ${refreshResult.ok ? 'text-accent-emerald' : 'text-accent-red'}`}>
                    {refreshResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Check for Updates */}
            {onCheckForUpdates && (
              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-medium text-text-tertiary">
                    App Updates
                  </label>
                  <p className="text-[11px] text-text-faint leading-snug mt-0.5">
                    Check if a newer version of WoW Top Gear is available.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={checkingUpdates}
                    className={[
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      !checkingUpdates
                        ? 'bg-surface-secondary border border-border-input text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        : 'bg-surface-tertiary border border-surface-tertiary text-text-faint cursor-not-allowed',
                    ].join(' ')}
                  >
                    {checkingUpdates ? 'Checking...' : 'Check for updates'}
                  </button>
                  {updateCheckResult === 'checked' && (
                    <span className="text-[11px] text-text-muted">
                      Check complete — see banner above if an update is available
                    </span>
                  )}
                  {updateCheckResult === 'error' && (
                    <span className="text-[11px] text-accent-red">
                      Could not check for updates
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
