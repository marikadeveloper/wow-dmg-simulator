import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import ProfileImport from './components/ProfileImport';
import GearPanel from './components/GearPanel';
import SimSettingsPanel, { DEFAULT_SIM_SETTINGS } from './components/SimSettingsPanel';
import type { SimSettingsValues } from './components/SimSettingsPanel';
import RunSimulationButton from './components/RunSimulationButton';
import SimProgressBar from './components/SimProgressBar';
import SimLogPanel from './components/SimLogPanel';
import SimResultsSummary from './components/SimResultsSummary';
import SimResultsPaperDoll from './components/SimResultsPaperDoll';
import SimResultsTopGear from './components/SimResultsTopGear';
import AppSettingsPanel from './components/AppSettingsPanel';
import AppFooter from './components/AppFooter';
import UpdateChecker from './components/UpdateChecker';
import type { UpdateCheckerHandle } from './components/UpdateChecker';
import { useTheme } from './lib/theme';
import { validateSimInput, hasErrors } from './lib/validate-sim-input';
import { generateCombinations, countCombinations } from './lib/combinator';
import { buildProfileSetFile, parseSimCResults } from './lib/profileset-builder';
import { runSmartSim, getStagesForCount, SmartSimCancelledError, DEFAULT_STAGES, type StageResult } from './lib/smart-sim-runner';
import { parseSimcProgress } from './lib/parse-simc-progress';
import type { SimcProfile, OptimizationAxis, SimSettings, SimResult, CombinationSpec } from './lib/types';
import { filterCombinationsByTierSets, type TierSetMinimums } from './lib/tier-set-filter';
import { filterCombinationsByCatalystCharges } from './lib/catalyst-generator';
import DroptimizerPanel from './components/DroptimizerPanel';
import { runDroptimizerSim, SmartSimCancelledError as DroptimizerCancelledError } from './lib/droptimizer-runner';
import type { DroptimizerItem } from './lib/droptimizer-items';
import type { DroptimizerProfileSetOptions } from './lib/droptimizer-profileset';

export type AppTab = 'topgear' | 'droptimizer';

function App() {
  const [profile, setProfile] = useState<SimcProfile | null>(null);
  const [simSettings, setSimSettings] = useState<SimSettingsValues>(DEFAULT_SIM_SETTINGS);
  const [axes, setAxes] = useState<OptimizationAxis[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [bypassLimit, setBypassLimit] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<SimResult[] | null>(null);
  const [simProgress, setSimProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [simLogLines, setSimLogLines] = useState<string[]>([]);
  const [tierSetMinimums, setTierSetMinimums] = useState<TierSetMinimums>(new Map());
  const [catalystCharges, setCatalystCharges] = useState<number | null>(null);
  const [augmentedProfile, setAugmentedProfile] = useState<SimcProfile | null>(null);
  const [footerRefreshKey, setFooterRefreshKey] = useState(0);
  // Smart Sim stage tracking
  const [smartSimStage, setSmartSimStage] = useState<{ current: number; total: number; label: string; combos: number } | null>(null);
  const [smartSimStageResults, setSmartSimStageResults] = useState<StageResult[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AppTab>('topgear');

  const updateCheckerRef = useRef<UpdateCheckerHandle>(null);

  // Guard against stale results when a new run starts before previous finishes
  const runIdRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleProfileParsed = useCallback((p: SimcProfile | null) => {
    setProfile(p);
    setAugmentedProfile(null);
    setSimResults(null);
    setSimError(null);
    setAxes([]);
    setTierSetMinimums(new Map());
    setCatalystCharges(null);
    setSimLogLines([]);
    setSmartSimStage(null);
    setSmartSimStageResults([]);
  }, []);

  const handleAxesChange = useCallback((newAxes: OptimizationAxis[]) => {
    setAxes(newAxes);
  }, []);

  const handleBlockedChange = useCallback((blocked: boolean) => {
    setIsBlocked(blocked);
  }, []);

  const handleBypassLimitChange = useCallback((bypassed: boolean) => {
    setBypassLimit(bypassed);
  }, []);

  const handleTierSetMinimumsChange = useCallback((minimums: TierSetMinimums) => {
    setTierSetMinimums(minimums);
  }, []);

  const handleAugmentedProfileChange = useCallback((p: SimcProfile) => {
    setAugmentedProfile(p);
  }, []);

  const handleCatalystChargesChange = useCallback((charges: number | null) => {
    setCatalystCharges(charges);
  }, []);

  const handleConfigChange = useCallback(() => {
    setFooterRefreshKey((k) => k + 1);
  }, []);

  // Listen for SimC progress events while running
  useEffect(() => {
    if (!isRunning) return;

    let unlisten: (() => void) | null = null;

    listen<{ line: string }>('simc-progress', (event) => {
      const text = event.payload.line;
      // Collect for log panel
      setSimLogLines((prev) => [...prev, text]);
      // Parse for progress bar
      const progress = parseSimcProgress(text);
      if (progress) {
        setSimProgress(progress);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    // Elapsed time ticker
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setSimProgress({ current: 0, total: 0 });
    setSimLogLines([]);

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 250);

    return () => {
      unlisten?.();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const validationIssues = useMemo(
    () => (profile ? validateSimInput(profile, simSettings) : []),
    [profile, simSettings],
  );

  const combinationCount = useMemo(() => countCombinations(axes), [axes]);

  /** Convert UI settings to the SimSettings shape expected by profileset-builder. */
  function toSimSettings(uiSettings: SimSettingsValues): SimSettings {
    return {
      fightStyle: uiSettings.fightStyle,
      maxTime: uiSettings.maxTime,
      varyCombatLength: uiSettings.varyCombatLength / 100, // UI is %, SimC wants fraction
      numEnemies: uiSettings.numEnemies,
      iterations: uiSettings.iterations,
      threads: uiSettings.threads,
      jsonOutputPath: '/tmp/placeholder.json', // Rust backend overrides via CLI arg
      targetError: uiSettings.useTargetError ? uiSettings.targetError : undefined,
      potion: uiSettings.potion,
      food: uiSettings.food,
      flask: uiSettings.flask,
      augmentation: uiSettings.augmentation,
      weaponRune: uiSettings.weaponRune,
      raidBuffs: uiSettings.raidBuffs,
      crucibleModes: uiSettings.crucibleModes,
    };
  }

  const handleCancelSimulation = useCallback(async () => {
    try {
      await invoke('cancel_sim');
    } catch {
      // Ignore — process may have already finished
    }
  }, []);

  const handleRunSimulation = useCallback(async () => {
    if (!profile || isBlocked || hasErrors(validationIssues) || isRunning) return;

    setIsRunning(true);
    setSimError(null);
    setSimResults(null);
    setSmartSimStage(null);
    setSmartSimStageResults([]);

    const runId = ++runIdRef.current;

    try {
      // 1. Generate combinations from axes
      let combinations = generateCombinations(axes, bypassLimit ? Infinity : undefined);

      // 1b. Apply tier set filtering if active
      const hasActiveFilters = [...tierSetMinimums.values()].some((v) => v > 0);
      if (hasActiveFilters) {
        combinations = filterCombinationsByTierSets(combinations, profile, tierSetMinimums);
        if (combinations.length === 0) {
          setSimError('No combinations meet the tier set requirements. Try lowering the minimum piece count.');
          return;
        }
      }

      // 1c. Apply catalyst charge filtering if active
      if (catalystCharges !== null) {
        combinations = filterCombinationsByCatalystCharges(combinations, catalystCharges);
        if (combinations.length === 0) {
          setSimError('No combinations fit within the catalyst charge limit. Try increasing the charge count.');
          return;
        }
      }

      // 1d. Re-number combinations after filtering
      if (hasActiveFilters || catalystCharges !== null) {
        let comboCounter = 1;
        for (const combo of combinations) {
          if (combo.name === 'combo_0000') continue;
          combo.name = `combo_${String(comboCounter).padStart(4, '0')}`;
          comboCounter++;
        }
      }

      const settings = toSimSettings(simSettings);
      let stages = getStagesForCount(combinations.length);
      // Apply user-configured target errors if set
      if (simSettings.smartSimTargetErrors) {
        const customErrors = simSettings.smartSimTargetErrors;
        stages = DEFAULT_STAGES.map((s, i) => ({ ...s, targetError: customErrors[i] }));
        stages = stages.slice(stages.length - getStagesForCount(combinations.length).length);
      }
      // Smart Sim: auto (null) uses stage count > 1, or respect explicit toggle
      const useSmartSim = simSettings.smartSimEnabled === null
        ? stages.length > 1
        : simSettings.smartSimEnabled && combinations.length > 1;

      if (useSmartSim) {
        // ── Smart Sim: multi-stage pipeline ──
        const { results } = await runSmartSim(
          { combinations, profile, settings, stages },
          {
            onStageStart: (stage, totalStages, comboCount, label) => {
              if (runId !== runIdRef.current) return;
              setSmartSimStage({ current: stage, total: totalStages, label, combos: comboCount });
              setSimProgress({ current: 0, total: 0 });
            },
            onStageComplete: (result) => {
              if (runId !== runIdRef.current) return;
              setSmartSimStageResults((prev) => [...prev, result]);
            },
            runSimC: async (simcContent: string) => {
              return invoke<string>('run_top_gear', { simcContent });
            },
          },
        );

        if (runId !== runIdRef.current) return;
        setSimResults(results);
      } else {
        // ── Single stage: direct run ──
        // Build manifest for result parsing (name → spec)
        const manifest = new Map<string, CombinationSpec>();
        for (const combo of combinations) {
          manifest.set(combo.name, combo);
        }

        const simcContent = buildProfileSetFile(profile, combinations, settings);
        const jsonText = await invoke<string>('run_top_gear', { simcContent });

        if (runId !== runIdRef.current) return;
        const results = parseSimCResults(jsonText, manifest);
        setSimResults(results);
      }
    } catch (err) {
      if (runId !== runIdRef.current) return;
      // Smart Sim cancellation: show partial results from completed stages
      if (err instanceof SmartSimCancelledError) {
        if (err.partialResults.length > 0) {
          setSimResults(err.partialResults);
        }
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      // Don't show cancellation as an error
      if (msg !== 'Simulation cancelled') {
        setSimError(msg);
      }
    } finally {
      if (runId === runIdRef.current) {
        setIsRunning(false);
      }
    }
  }, [profile, axes, simSettings, isBlocked, validationIssues, isRunning, tierSetMinimums, catalystCharges, bypassLimit]);

  // ── Droptimizer run handler ───────────────────────────────────────────────

  const handleRunDroptimizer = useCallback(async (
    items: DroptimizerItem[],
    options: DroptimizerProfileSetOptions,
  ) => {
    if (!profile || isRunning || items.length === 0) return;

    setIsRunning(true);
    setSimError(null);
    setSimResults(null);
    setSmartSimStage(null);
    setSmartSimStageResults([]);

    const runId = ++runIdRef.current;

    try {
      const settings = toSimSettings(simSettings);
      const result = await runDroptimizerSim(
        {
          profile,
          items,
          settings,
          options,
          smartSimTargetErrors: simSettings.smartSimTargetErrors,
        },
        {
          onStageStart: (stage, totalStages, comboCount, label) => {
            if (runId !== runIdRef.current) return;
            setSmartSimStage({ current: stage, total: totalStages, label, combos: comboCount });
            setSimProgress({ current: 0, total: 0 });
          },
          onStageComplete: (stageResult) => {
            if (runId !== runIdRef.current) return;
            setSmartSimStageResults((prev) => [...prev, stageResult]);
          },
          runSimC: async (simcContent: string) => {
            return invoke<string>('run_top_gear', { simcContent });
          },
        },
      );

      if (runId !== runIdRef.current) return;
      setSimResults(result.results);
    } catch (err) {
      if (runId !== runIdRef.current) return;
      if (err instanceof DroptimizerCancelledError) {
        if (err.partialResults.length > 0) {
          setSimResults(err.partialResults);
        }
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== 'Simulation cancelled') {
        setSimError(msg);
      }
    } finally {
      if (runId === runIdRef.current) {
        setIsRunning(false);
      }
    }
  }, [profile, simSettings, isRunning]);

  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <UpdateChecker ref={updateCheckerRef} />
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* App header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-text-heading">
                SimC Gear Optimizer
              </h1>
              <span className="text-xs text-text-faint font-medium">
                Local SimC
              </span>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-border-primary bg-surface-secondary p-0.5">
              <button
                onClick={() => setTheme('light')}
                className={`rounded p-1.5 transition-colors ${theme === 'light' ? 'bg-surface-page text-amber-500 shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                title="Light theme"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`rounded p-1.5 transition-colors ${theme === 'system' ? 'bg-surface-page text-amber-500 shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                title="System theme"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`rounded p-1.5 transition-colors ${theme === 'dark' ? 'bg-surface-page text-amber-500 shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                title="Dark theme"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Zone 1 — Character Import */}
        <section className="mb-8">
          <ProfileImport onProfileParsed={handleProfileParsed} />
        </section>

        {/* App Settings — always visible */}
        <section className="mb-8">
          <AppSettingsPanel
            onConfigChange={handleConfigChange}
            onCheckForUpdates={() => updateCheckerRef.current?.checkForUpdates() ?? Promise.resolve({ status: 'error' as const, message: 'Update checker not available' })}
          />
        </section>

        {/* Mode tabs — visible after character is loaded */}
        {profile && (
          <nav className="mb-8">
            <div className="flex gap-1 border-b border-border-primary">
              <button
                onClick={() => setActiveTab('topgear')}
                className={[
                  'relative px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors',
                  activeTab === 'topgear'
                    ? 'text-amber-500'
                    : 'text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                Top Gear
                {activeTab === 'topgear' && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('droptimizer')}
                className={[
                  'relative px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors',
                  activeTab === 'droptimizer'
                    ? 'text-amber-500'
                    : 'text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                Droptimizer
                {activeTab === 'droptimizer' && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            </div>
          </nav>
        )}

        {/* Zone 2 — Gear & Optimization Panel (Top Gear mode) */}
        {profile && activeTab === 'topgear' && (
          <section className="mb-8">
            <GearPanel
              profile={profile}
              onBlockedChange={handleBlockedChange}
              onBypassLimitChange={handleBypassLimitChange}
              onAxesChange={handleAxesChange}
              onTierSetMinimumsChange={handleTierSetMinimumsChange}
              onCatalystChargesChange={handleCatalystChargesChange}
              onAugmentedProfileChange={handleAugmentedProfileChange}
            />
          </section>
        )}

        {/* Zone 3 — Simulation Settings + Run Controls (Top Gear mode) */}
        {profile && activeTab === 'topgear' && (
          <section className="mb-8">

            <SimSettingsPanel
              settings={simSettings}
              onSettingsChange={setSimSettings}
              profile={profile}
            />

            {/* Validation messages */}
            {validationIssues.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {validationIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={[
                      'flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug',
                      issue.severity === 'error'
                        ? 'bg-red-500/10 border border-red-500/20 text-accent-red'
                        : 'bg-amber-500/8 border border-amber-500/15 text-accent-amber/90',
                    ].join(' ')}
                  >
                    <svg
                      className="mt-0.5 shrink-0"
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                    >
                      {issue.severity === 'error' ? (
                        <>
                          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" />
                          <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="6.5" cy="9" r="0.6" fill="currentColor" />
                        </>
                      ) : (
                        <>
                          <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                          <path d="M6.5 5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="6.5" cy="9.2" r="0.6" fill="currentColor" />
                        </>
                      )}
                    </svg>
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Run button */}
            <div className="mt-4">
              <RunSimulationButton
                onClick={handleRunSimulation}
                onCancel={handleCancelSimulation}
                isRunning={isRunning}
                isBlocked={isBlocked}
                hasErrors={hasErrors(validationIssues)}
                combinationCount={combinationCount}
              />
            </div>

            {/* Progress bar — visible while running */}
            <div className="mt-3">
              <SimProgressBar
                current={simProgress.current}
                total={simProgress.total}
                elapsedMs={elapsedMs}
                isActive={isRunning}
                smartSimStage={smartSimStage}
              />
            </div>

            {/* SimC log output */}
            {(isRunning || simLogLines.length > 0) && (
              <div className="mt-2">
                <SimLogPanel lines={simLogLines} isActive={isRunning} />
              </div>
            )}

            {/* Results — appears immediately when sim finishes */}
            {simResults && simResults.length > 0 && (
              <div className="mt-3 space-y-3">
                <SimResultsSummary results={simResults} elapsedMs={elapsedMs} smartSimStages={smartSimStageResults.length > 0 ? smartSimStageResults.length : undefined} />
                <SimResultsPaperDoll profile={augmentedProfile ?? profile} results={simResults} axes={axes} />
                <SimResultsTopGear results={simResults} axes={axes} />
              </div>
            )}

            {/* Simulation error message */}
            {simError && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug bg-red-500/10 border border-red-500/20 text-accent-red">
                <svg
                  className="mt-0.5 shrink-0"
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                >
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" />
                  <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="6.5" cy="9" r="0.6" fill="currentColor" />
                </svg>
                <span>Simulation failed: {simError}</span>
              </div>
            )}
          </section>
        )}

        {/* Droptimizer mode */}
        {profile && activeTab === 'droptimizer' && (
          <section className="mb-8">
            <DroptimizerPanel
              profile={profile}
              onRunDroptimizer={handleRunDroptimizer}
              isRunning={isRunning}
            />

            {/* Sim settings (shared with Top Gear) */}
            <div className="mt-6">
              <SimSettingsPanel
                settings={simSettings}
                onSettingsChange={setSimSettings}
                profile={profile}
              />
            </div>

            {/* Cancel button while running */}
            {isRunning && (
              <div className="mt-4">
                <button
                  onClick={handleCancelSimulation}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold uppercase tracking-wider text-accent-red hover:bg-red-500/15 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-3">
              <SimProgressBar
                current={simProgress.current}
                total={simProgress.total}
                elapsedMs={elapsedMs}
                isActive={isRunning}
                smartSimStage={smartSimStage}
              />
            </div>

            {/* SimC log output */}
            {(isRunning || simLogLines.length > 0) && (
              <div className="mt-2">
                <SimLogPanel lines={simLogLines} isActive={isRunning} />
              </div>
            )}

            {/* Results */}
            {simResults && simResults.length > 0 && (
              <div className="mt-3 space-y-3">
                <SimResultsSummary results={simResults} elapsedMs={elapsedMs} smartSimStages={smartSimStageResults.length > 0 ? smartSimStageResults.length : undefined} />
                <SimResultsTopGear results={simResults} axes={[]} />
              </div>
            )}

            {/* Error */}
            {simError && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug bg-red-500/10 border border-red-500/20 text-accent-red">
                <span>Simulation failed: {simError}</span>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer — always visible */}
      <AppFooter refreshKey={footerRefreshKey} />
    </div>
  );
}

export default App;
