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
import SimResultsBarChart from './components/SimResultsBarChart';
import SimResultsTable from './components/SimResultsTable';
import { validateSimInput, hasErrors } from './lib/validate-sim-input';
import { generateCombinations, countCombinations } from './lib/combinator';
import { buildProfileSetFile, parseSimCResults } from './lib/profileset-builder';
import { parseSimcProgress } from './lib/parse-simc-progress';
import type { SimcProfile, OptimizationAxis, SimSettings, SimResult, CombinationSpec } from './lib/types';

function App() {
  const [profile, setProfile] = useState<SimcProfile | null>(null);
  const [simSettings, setSimSettings] = useState<SimSettingsValues>(DEFAULT_SIM_SETTINGS);
  const [axes, setAxes] = useState<OptimizationAxis[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<SimResult[] | null>(null);
  const [simProgress, setSimProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [simLogLines, setSimLogLines] = useState<string[]>([]);

  // Guard against stale results when a new run starts before previous finishes
  const runIdRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleProfileParsed = useCallback((p: SimcProfile | null) => {
    setProfile(p);
    setSimResults(null);
    setSimError(null);
  }, []);

  const handleAxesChange = useCallback((newAxes: OptimizationAxis[]) => {
    setAxes(newAxes);
  }, []);

  const handleBlockedChange = useCallback((blocked: boolean) => {
    setIsBlocked(blocked);
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

    const runId = ++runIdRef.current;

    try {
      // 1. Generate combinations from axes
      const combinations = generateCombinations(axes);

      // 2. Build manifest for result parsing (name → spec)
      const manifest = new Map<string, CombinationSpec>();
      for (const combo of combinations) {
        manifest.set(combo.name, combo);
      }

      // 3. Build the .simc file content
      const simcContent = buildProfileSetFile(
        profile,
        combinations,
        toSimSettings(simSettings),
      );

      // 4. Invoke Tauri backend
      const jsonText = await invoke<string>('run_top_gear', {
        simcContent,
      });

      // Guard against stale results if another run started
      if (runId !== runIdRef.current) return;

      // 5. Parse results
      const results = parseSimCResults(jsonText, manifest);
      setSimResults(results);
    } catch (err) {
      if (runId !== runIdRef.current) return;
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
  }, [profile, axes, simSettings, isBlocked, validationIssues, isRunning]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* App header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-amber-50">
              Top Gear
            </h1>
            <span className="text-xs text-zinc-600 font-medium">
              Local SimC
            </span>
          </div>
        </header>

        {/* Zone 1 — Character Import */}
        <section className="mb-8">
          <ProfileImport onProfileParsed={handleProfileParsed} />
        </section>

        {/* Zone 2 — Gear & Optimization Panel */}
        {profile && (
          <section className="mb-8">
            <GearPanel
              profile={profile}
              onBlockedChange={handleBlockedChange}
              onAxesChange={handleAxesChange}
            />
          </section>
        )}

        {/* Zone 3 — Simulation Settings + Run Controls */}
        {profile && (
          <section className="mb-8">
            <SimSettingsPanel
              settings={simSettings}
              onSettingsChange={setSimSettings}
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
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : 'bg-amber-500/8 border border-amber-500/15 text-amber-300/90',
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
                <SimResultsSummary results={simResults} elapsedMs={elapsedMs} />
                <SimResultsPaperDoll profile={profile} results={simResults} axes={axes} />
                <SimResultsBarChart results={simResults} axes={axes} />
                <SimResultsTable results={simResults} axes={axes} />
              </div>
            )}

            {/* Simulation error message */}
            {simError && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug bg-red-500/10 border border-red-500/20 text-red-300">
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
      </div>
    </div>
  );
}

export default App;
