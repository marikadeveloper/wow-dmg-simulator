# Smart Sim — Implementation Plan

Technical design for adding multi-stage simulation to the app, modeled after
Raidbots' Smart Sim / AutoSimC approach. See `docs/smart-sim.md` for research.

---

## Current Architecture (Single Stage)

```
UI → combinator → profileset-builder → run_top_gear (1 SimC invocation) → results
```

Today, ALL combinations run in a single SimC process at a single precision
level (either fixed `iterations` or a single `target_error`). This is fine
for small combo counts but wastes CPU on large ones.

---

## Target Architecture (Multi-Stage)

```
UI → combinator → smart-sim-runner ─┬─ Stage 1 (target_error=1.0) → cull
                                     ├─ Stage 2 (target_error=0.2) → cull
                                     └─ Stage 3 (target_error=0.05) → final results
```

The new `smart-sim-runner` orchestrates multiple SimC invocations, culling
between stages. Each stage produces a `.simc` file with only the surviving
combinations.

---

## Module Design

### New: `src/lib/smart-sim-runner.ts`

Orchestrator that manages the multi-stage pipeline. Pure logic — delegates
Tauri IPC calls to the caller via callbacks.

```typescript
interface SmartSimConfig {
  /** Combinations from the combinator */
  combinations: CombinationSpec[];
  /** Parsed profile */
  profile: SimcProfile;
  /** User sim settings (iterations/targetError will be overridden per stage) */
  settings: SimSettings;
  /** Thresholds per stage. Default: [1.0, 0.2, 0.05] */
  stageTargetErrors: number[];
  /** Fraction of combinations to keep per stage. Default: [0.1, 0.25, 1.0] */
  stageSurvivalRates: number[];
  /** Minimum combinations to keep per stage (floor). Default: [10, 4, 1] */
  stageMinSurvivors: number[];
}

interface StageResult {
  stage: number;          // 1-indexed
  targetError: number;
  inputCount: number;     // combos entering this stage
  outputCount: number;    // combos surviving to next stage
  results: SimResult[];   // all results for this stage (sorted by DPS)
  survivors: string[];    // combo names advancing to next stage
  durationMs: number;
}

interface SmartSimCallbacks {
  /** Called before each stage starts */
  onStageStart: (stage: number, totalStages: number, comboCount: number) => void;
  /** Called with SimC progress lines (forwarded from Tauri events) */
  onProgress: (line: string) => void;
  /** Called after each stage completes */
  onStageComplete: (result: StageResult) => void;
  /** Run a single SimC invocation — abstracts the Tauri IPC */
  runSimC: (simcContent: string) => Promise<string>;
}
```

**Key function:**

```typescript
async function runSmartSim(
  config: SmartSimConfig,
  callbacks: SmartSimCallbacks,
): Promise<SimResult[]>
```

### Algorithm

```
1. Start with all combinations from the combinator
2. For each stage (1, 2, 3):
   a. Build a .simc file with surviving combinations + stage's target_error
   b. Run SimC via callbacks.runSimC()
   c. Parse results
   d. If this is the last stage → return final results
   e. Otherwise, sort by DPS, compute survival cutoff:
      - survivors = max(stageMinSurvivors[i], floor(count * stageSurvivalRates[i]))
      - Statistical tie-breaking: include any combo within 1 mean_std_dev of the cutoff
   f. Filter combinations to survivors only, proceed to next stage
3. Merge baseline result across stages (it always survives)
```

### Culling Strategy

Simple top-N with statistical tie-breaking:

```typescript
function selectSurvivors(
  results: SimResult[],
  rate: number,
  minSurvivors: number,
): string[] {
  const sorted = [...results].sort((a, b) => b.dps - a.dps);
  const targetCount = Math.max(minSurvivors, Math.floor(sorted.length * rate));

  // Always keep baseline
  const survivors = new Set<string>();
  for (let i = 0; i < Math.min(targetCount, sorted.length); i++) {
    survivors.add(sorted[i].name);
  }

  // Include statistical ties with the last survivor
  if (targetCount < sorted.length) {
    const cutoffDps = sorted[targetCount - 1].dps;
    const cutoffError = sorted[targetCount - 1].meanStdDev;
    for (let i = targetCount; i < sorted.length; i++) {
      if (sorted[i].dps >= cutoffDps - 2 * cutoffError) {
        survivors.add(sorted[i].name);
      } else {
        break; // already sorted, no need to continue
      }
    }
  }

  // Baseline always survives
  survivors.add('combo_0000');

  return Array.from(survivors);
}
```

### Modified: `profileset-builder.ts`

Add a function to build a .simc file for a **subset** of combinations:

```typescript
export function buildProfileSetFileForSubset(
  profile: SimcProfile,
  combinations: CombinationSpec[],
  settings: SimSettings,
  /** Override target_error for this stage */
  targetError: number,
  /** Only include these combo names (null = all) */
  comboNames?: Set<string> | null,
): string
```

This is a thin wrapper around `buildProfileSetFile` that:
1. Filters `combinations` to only those in `comboNames`
2. Overrides `settings.targetError` with the stage's value
3. Clears `settings.iterations` (target_error takes precedence)

### Modified: `useSimulation.ts` (or equivalent hook)

The simulation hook needs to support multi-stage runs:

```typescript
interface SimulationState {
  status: 'idle' | 'running' | 'complete' | 'error' | 'cancelled';
  // Smart Sim stage tracking
  currentStage: number;      // 0 = not started, 1-3 = active stage
  totalStages: number;
  stageLabel: string;        // "Low Precision", "Medium Precision", "High Precision"
  combosInStage: number;     // how many combos are in the current stage
  combosTotal: number;       // original total combo count
  // Existing fields
  progress: number;
  results: SimResult[] | null;
  logs: string[];
}
```

---

## Stage Configuration Defaults

| Config                | Stage 1 | Stage 2 | Stage 3 |
|-----------------------|---------|---------|---------|
| `target_error`        | 1.0     | 0.2     | 0.05    |
| `survivalRate`        | 0.10    | 0.25    | 1.0     |
| `minSurvivors`        | 10      | 4       | 1       |
| Label                 | Low Precision | Medium Precision | High Precision |

**Survival logic per stage:**
- Stage 1: Keep top 10% (min 10). For 500 combos → ~50 survivors.
- Stage 2: Keep top 25% of survivors (min 4). For 50 → ~12 survivors.
- Stage 3: Keep all (final ranking). 12 combos at full precision.

---

## When to Use Smart Sim vs. Single Stage

```typescript
function shouldUseSmartSim(comboCount: number): boolean {
  return comboCount >= 50;
}

function getStageCount(comboCount: number): number {
  if (comboCount < 50) return 1;    // single stage, no culling
  if (comboCount < 200) return 2;   // skip low precision, start at medium
  return 3;                          // full pipeline
}
```

Thresholds:
- **< 50 combos:** Single SimC run at user's chosen precision. No overhead.
- **50-199 combos:** 2 stages (0.2% then 0.05%). Low precision adds more
  overhead than it saves at this scale.
- **200+ combos:** Full 3-stage pipeline. This is where the ~30x speedup
  happens.

---

## UI Changes

### Progress Panel

Replace the single progress bar with a staged progress display:

```
┌──────────────────────────────────────────────────────┐
│  Stage 1              Stage 2              Stage 3   │
│  Low Precision ✓      Medium Precision     High...   │
│  ██████████████████   ████████░░░░░░░░░   ░░░░░░░░  │
│                                                       │
│  12 of 50 combinations complete                       │
│  SimC: Generating Baseline: Smarika [====>...] 2783  │
└──────────────────────────────────────────────────────┘
```

### Sim Settings Panel

Add a toggle (collapsed in advanced settings):

```
[x] Smart Sim (recommended for 50+ combinations)
    Runs multiple stages at increasing precision to find the best
    gear faster. Eliminates bad combinations early.
```

When Smart Sim is disabled, the current single-stage behavior is preserved.
When enabled, the iteration/target_error inputs are hidden (stages control
precision automatically).

---

## Tauri Backend Changes

**No changes needed to `run_simc.rs`.** The existing `run_top_gear` command
runs a single SimC process and returns results. Smart Sim calls it multiple
times from the frontend, once per stage.

The only consideration is that the frontend must wait for each stage to
complete before starting the next one (already enforced by `SimState::child`
mutex — only one SimC process at a time).

---

## Testing Strategy

### Unit tests (`smart-sim-runner.test.ts`)

1. **Culling logic:** Given mock SimResults, verify `selectSurvivors` keeps
   the right combinations and handles statistical ties.
2. **Stage count selection:** Verify `getStageCount` returns correct values
   for different combo counts.
3. **Subset building:** Verify `buildProfileSetFileForSubset` only includes
   the specified combos and sets the correct target_error.
4. **Full pipeline (mocked):** Mock `runSimC` to return canned JSON, verify
   the pipeline calls it the right number of times with the right content.

### Integration tests

1. **Small sim (< 50):** Verify it falls through to single-stage mode.
2. **Medium sim (50-199):** Verify 2 stages, correct culling.
3. **Large sim (200+):** Verify 3 stages, verify final results match
   expectations from the mocked data.

---

## Edge Cases

1. **All combinations within noise:** If Stage 1 can't distinguish any combos,
   all survive. Stage 2 inherits the full set. This is correct — it just
   means Smart Sim doesn't save time for this particular set.

2. **User cancels mid-stage:** The existing `cancel_sim` command kills the
   SimC process. The smart-sim-runner catches the "cancelled" error and
   returns partial results from completed stages (or empty if Stage 1
   wasn't finished).

3. **Baseline is not the best:** Baseline (`combo_0000`) always survives all
   stages so it appears in the final ranking for reference.

4. **Stage produces fewer results than expected:** If SimC crashes or returns
   fewer profileset results than expected, log a warning but continue with
   what we got.
