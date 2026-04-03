/**
 * droptimizer-runner.ts — Orchestrates a Droptimizer simulation run.
 *
 * Takes resolved items + profile + settings, generates profileset combinations,
 * and runs them through the Smart Sim multi-stage pipeline (or single stage for
 * small item counts).
 *
 * Reuses the same Smart Sim infrastructure as Top Gear (Epic 11).
 */

import type { SimcProfile, SimSettings, SimResult, CombinationSpec } from './types';
import type { DroptimizerItem } from './droptimizer-items';
import {
  generateDroptimizerCombinations,
  type DroptimizerProfileSetOptions,
  type DroptimizerComboMeta,
} from './droptimizer-profileset';
import { buildProfileSetFile, parseSimCResults } from './profileset-builder';
import {
  runSmartSim,
  getStagesForCount,
  SmartSimCancelledError,
  DEFAULT_STAGES,
  type StageResult,
} from './smart-sim-runner';

/** Input for a Droptimizer simulation run. */
export interface DroptimizerRunConfig {
  profile: SimcProfile;
  items: DroptimizerItem[];
  settings: SimSettings;
  options: DroptimizerProfileSetOptions;
  /** Smart sim stage target errors override. null = use defaults. */
  smartSimTargetErrors: [number, number, number] | null;
}

/** Result of a Droptimizer simulation run. */
export interface DroptimizerRunResult {
  /** All sim results sorted by DPS descending. */
  results: SimResult[];
  /** Metadata linking combo names to source items. */
  meta: Map<string, DroptimizerComboMeta>;
  /** Number of Smart Sim stages used (1 = single stage). */
  stageCount: number;
}

/** Callbacks for progress/UI updates during the run. */
export interface DroptimizerRunCallbacks {
  onStageStart: (stage: number, totalStages: number, comboCount: number, label: string) => void;
  onStageComplete: (result: StageResult) => void;
  /** Calls the Tauri IPC to run SimC. */
  runSimC: (simcContent: string) => Promise<string>;
}

/**
 * Run a Droptimizer simulation.
 *
 * Generates single-swap profileset combinations from the item list,
 * then runs them through Smart Sim (multi-stage) or single stage
 * depending on the combination count.
 */
export async function runDroptimizerSim(
  config: DroptimizerRunConfig,
  callbacks: DroptimizerRunCallbacks,
): Promise<DroptimizerRunResult> {
  const { profile, items, settings, options, smartSimTargetErrors } = config;

  // 1. Generate profileset combinations
  const { combinations, meta } = generateDroptimizerCombinations(
    profile,
    items,
    options,
  );

  if (combinations.length <= 1) {
    // No items to simulate — return empty results
    return { results: [], meta, stageCount: 0 };
  }

  // 2. Determine stage count
  let stages = getStagesForCount(combinations.length);
  if (smartSimTargetErrors) {
    const customErrors = smartSimTargetErrors;
    stages = DEFAULT_STAGES.map((s, i) => ({ ...s, targetError: customErrors[i] }));
    stages = stages.slice(stages.length - getStagesForCount(combinations.length).length);
  }

  const useSmartSim = stages.length > 1;

  // 3. Run simulation
  if (useSmartSim) {
    const { results } = await runSmartSim(
      { combinations, profile, settings, stages },
      {
        onStageStart: callbacks.onStageStart,
        onStageComplete: callbacks.onStageComplete,
        runSimC: callbacks.runSimC,
      },
    );

    return { results, meta, stageCount: stages.length };
  } else {
    // Single stage: direct run
    const manifest = new Map<string, CombinationSpec>();
    for (const combo of combinations) {
      manifest.set(combo.name, combo);
    }

    const simcContent = buildProfileSetFile(profile, combinations, settings);
    const jsonText = await callbacks.runSimC(simcContent);
    const results = parseSimCResults(jsonText, manifest);

    return { results, meta, stageCount: 1 };
  }
}

/** Re-export for convenience. */
export { SmartSimCancelledError };
