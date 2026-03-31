import type { SimcProfile, CombinationSpec, SimSettings, SimResult } from './types';
import { buildProfileSetFile, parseSimCResults } from './profileset-builder';

// ── Configuration ──────────────────────────────────────────────────────────

/** Per-stage parameters for the multi-stage pipeline. */
export interface StageConfig {
  /** SimC target_error value for this stage */
  targetError: number;
  /** Fraction of combinations to keep (0-1). 1.0 = keep all (final stage). */
  survivalRate: number;
  /** Absolute minimum survivors (floor). */
  minSurvivors: number;
  /** Human-readable label for the UI. */
  label: string;
}

/** Default stage configurations for a 3-stage pipeline. */
export const DEFAULT_STAGES: StageConfig[] = [
  { targetError: 1.0, survivalRate: 0.10, minSurvivors: 10, label: 'Low Precision' },
  { targetError: 0.2, survivalRate: 0.25, minSurvivors: 4, label: 'Medium Precision' },
  { targetError: 0.05, survivalRate: 1.0, minSurvivors: 1, label: 'High Precision' },
];

// ── Public types ───────────────────────────────────────────────────────────

export interface SmartSimConfig {
  /** All combinations from the combinator. */
  combinations: CombinationSpec[];
  /** Parsed character profile. */
  profile: SimcProfile;
  /** User sim settings (iterations/targetError will be overridden per stage). */
  settings: SimSettings;
  /** Stage configurations. Defaults to DEFAULT_STAGES sliced by getStageCount(). */
  stages: StageConfig[];
}

export interface StageResult {
  /** 1-indexed stage number. */
  stage: number;
  /** target_error used for this stage. */
  targetError: number;
  /** Label for the UI. */
  label: string;
  /** Number of combinations entering this stage. */
  inputCount: number;
  /** Number of combinations surviving to the next stage (= inputCount for final). */
  outputCount: number;
  /** All results from this stage, sorted by DPS descending. */
  results: SimResult[];
  /** Combo names advancing to the next stage. */
  survivors: string[];
  /** Wall-clock time for this stage in milliseconds. */
  durationMs: number;
}

export interface SmartSimCallbacks {
  /** Called before each stage starts. */
  onStageStart: (stage: number, totalStages: number, comboCount: number, label: string) => void;
  /** Called after each stage completes. */
  onStageComplete: (result: StageResult) => void;
  /** Run a single SimC invocation. Abstracts the Tauri IPC (`run_top_gear`). */
  runSimC: (simcContent: string) => Promise<string>;
}

// ── Stage count selection ──────────────────────────────────────────────────

/**
 * Determine how many stages to use based on the combination count.
 * - < 50:  1 stage (single run, no culling overhead)
 * - 50-199: 2 stages (medium + high precision)
 * - 200+:  3 stages (full pipeline)
 */
export function getStageCount(comboCount: number): number {
  if (comboCount < 50) return 1;
  if (comboCount < 200) return 2;
  return 3;
}

/**
 * Get the stage configs for a given combo count.
 * For fewer stages, we take the *last* N stages from DEFAULT_STAGES
 * so we always finish at high precision.
 */
export function getStagesForCount(comboCount: number): StageConfig[] {
  const count = getStageCount(comboCount);
  return DEFAULT_STAGES.slice(DEFAULT_STAGES.length - count);
}

// ── Culling ────────────────────────────────────────────────────────────────

/**
 * Select which combinations survive to the next stage.
 *
 * Keeps the top N by DPS, where N = max(minSurvivors, floor(count * rate)).
 * Includes statistical ties: any combo within 2 * meanStdDev of the cutoff
 * DPS is also kept. The baseline (`combo_0000`) always survives.
 */
export function selectSurvivors(
  results: SimResult[],
  rate: number,
  minSurvivors: number,
): string[] {
  if (results.length === 0) return [];

  const sorted = [...results].sort((a, b) => b.dps - a.dps);
  const targetCount = Math.max(minSurvivors, Math.floor(sorted.length * rate));

  const survivors = new Set<string>();

  // Add top N
  for (let i = 0; i < Math.min(targetCount, sorted.length); i++) {
    survivors.add(sorted[i].name);
  }

  // Statistical tie-breaking: include combos within 2 * meanStdDev of the cutoff
  if (targetCount > 0 && targetCount < sorted.length) {
    const cutoffResult = sorted[targetCount - 1];
    const cutoffDps = cutoffResult.dps;
    const cutoffError = cutoffResult.meanStdDev;
    for (let i = targetCount; i < sorted.length; i++) {
      if (sorted[i].dps >= cutoffDps - 2 * cutoffError) {
        survivors.add(sorted[i].name);
      } else {
        break; // sorted descending, no more ties possible
      }
    }
  }

  // Baseline always survives
  survivors.add('combo_0000');

  return Array.from(survivors);
}

// ── Subset builder ─────────────────────────────────────────────────────────

/**
 * Build a .simc file for a subset of combinations with a stage-specific
 * target_error override.
 *
 * @param profile - Parsed character profile.
 * @param combinations - Full combination list from the combinator.
 * @param settings - Base sim settings (targetError/iterations will be overridden).
 * @param targetError - The target_error for this stage.
 * @param comboNames - Only include these combo names (null/undefined = all).
 */
export function buildProfileSetFileForSubset(
  profile: SimcProfile,
  combinations: CombinationSpec[],
  settings: SimSettings,
  targetError: number,
  comboNames?: Set<string> | null,
): string {
  // Filter to subset if specified
  const filteredCombos = comboNames
    ? combinations.filter((c) => comboNames.has(c.name))
    : combinations;

  // Override settings for this stage
  const stageSettings: SimSettings = {
    ...settings,
    targetError,
    iterations: 0, // target_error takes precedence when > 0
  };

  return buildProfileSetFile(profile, filteredCombos, stageSettings);
}

// ── Main pipeline ──────────────────────────────────────────────────────────

/** Error thrown when a Smart Sim is cancelled mid-stage. */
export class SmartSimCancelledError extends Error {
  /** Partial results from stages that completed before cancellation. */
  readonly stageResults: StageResult[];
  /** Best available results (from the last completed stage, or empty). */
  readonly partialResults: SimResult[];

  constructor(stageResults: StageResult[]) {
    super('Simulation cancelled');
    this.name = 'SmartSimCancelledError';
    this.stageResults = stageResults;
    this.partialResults = stageResults.length > 0
      ? stageResults[stageResults.length - 1].results
      : [];
  }
}

/**
 * Run a multi-stage Smart Sim pipeline.
 *
 * Executes one SimC invocation per stage, culling between stages.
 * Returns the final-stage results (sorted by DPS descending).
 *
 * If cancelled mid-stage, throws SmartSimCancelledError with partial
 * results from completed stages.
 */
export async function runSmartSim(
  config: SmartSimConfig,
  callbacks: SmartSimCallbacks,
): Promise<{ results: SimResult[]; stageResults: StageResult[] }> {
  const { combinations, profile, settings, stages } = config;
  const stageResults: StageResult[] = [];

  // Current set of surviving combo names (start with all)
  let survivorNames: Set<string> | null = null; // null = all

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    const stageNumber = stageIdx + 1;
    const isLastStage = stageIdx === stages.length - 1;

    // Determine which combos enter this stage
    const stageCombos = survivorNames
      ? combinations.filter((c) => survivorNames!.has(c.name))
      : combinations;

    callbacks.onStageStart(stageNumber, stages.length, stageCombos.length, stage.label);

    const startTime = Date.now();

    // Build the .simc file for this stage
    const simcContent = buildProfileSetFileForSubset(
      profile,
      combinations,
      settings,
      stage.targetError,
      survivorNames,
    );

    // Run SimC — may throw on cancellation
    let jsonText: string;
    try {
      jsonText = await callbacks.runSimC(simcContent);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Simulation cancelled') {
        throw new SmartSimCancelledError(stageResults);
      }
      throw err;
    }

    const durationMs = Date.now() - startTime;

    // Build manifest for result parsing
    const manifest = new Map<string, CombinationSpec>();
    for (const combo of stageCombos) {
      manifest.set(combo.name, combo);
    }

    // Parse results
    const results = parseSimCResults(jsonText, manifest);

    // Determine survivors
    let survivors: string[];
    if (isLastStage) {
      // Final stage: all results survive (no culling)
      survivors = results.map((r) => r.name);
    } else {
      survivors = selectSurvivors(results, stage.survivalRate, stage.minSurvivors);
    }

    const stageResult: StageResult = {
      stage: stageNumber,
      targetError: stage.targetError,
      label: stage.label,
      inputCount: stageCombos.length,
      outputCount: survivors.length,
      results,
      survivors,
      durationMs,
    };

    stageResults.push(stageResult);
    callbacks.onStageComplete(stageResult);

    // Update survivor set for next stage
    survivorNames = new Set(survivors);
  }

  // Return final stage results
  const finalResults = stageResults[stageResults.length - 1].results;
  return { results: finalResults, stageResults };
}
