import { describe, it, expect, vi } from 'vitest';
import {
  selectSurvivors,
  getStageCount,
  getStagesForCount,
  buildProfileSetFileForSubset,
  runSmartSim,
  SmartSimCancelledError,
  DEFAULT_STAGES,
} from './smart-sim-runner';
import type { SimResult, SimcProfile, CombinationSpec, SimSettings } from './types';

// ── Helper factories ───────────────────────────────────────────────────────

function makeResult(name: string, dps: number, meanStdDev = 50): SimResult {
  return {
    name,
    isBaseline: name === 'combo_0000',
    dps,
    stdDev: meanStdDev * 10,
    meanStdDev,
    axes: {},
  };
}

function makeCombo(name: string): CombinationSpec {
  return { name, axes: {}, overrideLines: name === 'combo_0000' ? [] : [`head=,id=999`] };
}

const MOCK_PROFILE: SimcProfile = {
  characterName: 'Test',
  realm: 'TestRealm',
  region: 'us',
  race: 'human',
  spec: 'frost',
  level: 80,
  talentString: 'test_talents',
  gear: {},
  rawLines: ['mage="Test"', 'level=80', 'race=human', 'spec=frost'],
};

const MOCK_SETTINGS: SimSettings = {
  fightStyle: 'Patchwerk',
  maxTime: 300,
  varyCombatLength: 0.2,
  numEnemies: 1,
  iterations: 10000,
  threads: 4,
  jsonOutputPath: '/tmp/test.json',
  potion: '',
  food: '',
  flask: '',
  augmentation: '',
  weaponRune: '',
  raidBuffs: {},
  crucibleModes: {},
};

// ── selectSurvivors ────────────────────────────────────────────────────────

describe('selectSurvivors', () => {
  it('keeps top N by DPS based on survival rate', () => {
    const results = [
      makeResult('combo_0000', 100000),
      makeResult('combo_0001', 95000),
      makeResult('combo_0002', 90000),
      makeResult('combo_0003', 85000),
      makeResult('combo_0004', 80000),
      makeResult('combo_0005', 75000),
      makeResult('combo_0006', 70000),
      makeResult('combo_0007', 65000),
      makeResult('combo_0008', 60000),
      makeResult('combo_0009', 55000),
    ];

    // 50% rate = keep top 5
    const survivors = selectSurvivors(results, 0.5, 1);
    expect(survivors).toContain('combo_0000');
    expect(survivors).toContain('combo_0001');
    expect(survivors).toContain('combo_0002');
    expect(survivors).toContain('combo_0003');
    expect(survivors).toContain('combo_0004');
    expect(survivors).not.toContain('combo_0009');
  });

  it('respects minSurvivors floor', () => {
    const results = [
      makeResult('combo_0000', 100000),
      makeResult('combo_0001', 95000),
      makeResult('combo_0002', 90000),
      makeResult('combo_0003', 85000),
    ];

    // 10% of 4 = 0, but minSurvivors = 3
    const survivors = selectSurvivors(results, 0.1, 3);
    expect(survivors.length).toBeGreaterThanOrEqual(3);
  });

  it('always includes combo_0000 (baseline)', () => {
    const results = [
      makeResult('combo_0001', 100000),
      makeResult('combo_0002', 95000),
      makeResult('combo_0000', 10000), // baseline is worst
    ];

    const survivors = selectSurvivors(results, 0.5, 1);
    expect(survivors).toContain('combo_0000');
  });

  it('includes statistical ties near the cutoff', () => {
    // cutoff is combo_0002 at 90000 with meanStdDev=50
    // combo_0003 at 89950 is within 2*50=100 of cutoff → should survive
    // combo_0004 at 89800 is NOT within 100 → should not survive
    const results = [
      makeResult('combo_0000', 100000, 50),
      makeResult('combo_0001', 95000, 50),
      makeResult('combo_0002', 90000, 50),
      makeResult('combo_0003', 89950, 50), // within 2*meanStdDev of cutoff
      makeResult('combo_0004', 89800, 50), // outside range
    ];

    // rate=0.6, 5*0.6=3 → keep top 3 (combo_0000,0001,0002)
    const survivors = selectSurvivors(results, 0.6, 1);
    expect(survivors).toContain('combo_0003'); // statistical tie
    expect(survivors).not.toContain('combo_0004'); // too far
  });

  it('returns empty array for empty results', () => {
    expect(selectSurvivors([], 0.5, 1)).toEqual([]);
  });
});

// ── getStageCount ──────────────────────────────────────────────────────────

describe('getStageCount', () => {
  it('returns 1 for < 50 combos', () => {
    expect(getStageCount(1)).toBe(1);
    expect(getStageCount(49)).toBe(1);
  });

  it('returns 2 for 50-199 combos', () => {
    expect(getStageCount(50)).toBe(2);
    expect(getStageCount(199)).toBe(2);
  });

  it('returns 3 for 200+ combos', () => {
    expect(getStageCount(200)).toBe(3);
    expect(getStageCount(1000)).toBe(3);
  });
});

// ── getStagesForCount ──────────────────────────────────────────────────────

describe('getStagesForCount', () => {
  it('returns only High Precision for < 50 combos', () => {
    const stages = getStagesForCount(10);
    expect(stages).toHaveLength(1);
    expect(stages[0].label).toBe('High Precision');
  });

  it('returns Medium + High for 50-199 combos', () => {
    const stages = getStagesForCount(100);
    expect(stages).toHaveLength(2);
    expect(stages[0].label).toBe('Medium Precision');
    expect(stages[1].label).toBe('High Precision');
  });

  it('returns all 3 stages for 200+ combos', () => {
    const stages = getStagesForCount(500);
    expect(stages).toHaveLength(3);
    expect(stages[0].label).toBe('Low Precision');
    expect(stages[1].label).toBe('Medium Precision');
    expect(stages[2].label).toBe('High Precision');
  });
});

// ── buildProfileSetFileForSubset ───────────────────────────────────────────

describe('buildProfileSetFileForSubset', () => {
  it('sets target_error and clears iterations', () => {
    const combos = [makeCombo('combo_0000'), makeCombo('combo_0001')];
    const output = buildProfileSetFileForSubset(MOCK_PROFILE, combos, MOCK_SETTINGS, 1.0);

    expect(output).toContain('target_error=1');
    expect(output).not.toMatch(/^iterations=/m);
  });

  it('filters to subset when comboNames provided', () => {
    const combos = [
      makeCombo('combo_0000'),
      makeCombo('combo_0001'),
      makeCombo('combo_0002'),
    ];
    const subset = new Set(['combo_0000', 'combo_0001']);
    const output = buildProfileSetFileForSubset(MOCK_PROFILE, combos, MOCK_SETTINGS, 0.2, subset);

    expect(output).toContain('combo_0001');
    expect(output).not.toContain('combo_0002');
  });

  it('includes all combos when comboNames is null', () => {
    const combos = [
      makeCombo('combo_0000'),
      makeCombo('combo_0001'),
      makeCombo('combo_0002'),
    ];
    const output = buildProfileSetFileForSubset(MOCK_PROFILE, combos, MOCK_SETTINGS, 0.05, null);

    expect(output).toContain('combo_0001');
    expect(output).toContain('combo_0002');
  });
});

// ── runSmartSim (full pipeline, mocked) ────────────────────────────────────

describe('runSmartSim', () => {
  /** Create a mock runSimC that returns canned results for each stage. */
  function createMockRunSimC(stageResults: SimResult[][]) {
    let callIdx = 0;
    return vi.fn(async () => {
      const results = stageResults[callIdx] ?? [];
      callIdx++;

      // Build a fake json2 output matching parseSimCResults expectations
      const baseline = results.find((r) => r.isBaseline) ?? results[0];
      const profilesets = results.filter((r) => !r.isBaseline);

      return JSON.stringify({
        sim: {
          players: [{
            collected_data: {
              dps: {
                mean: baseline.dps,
                std_dev: baseline.stdDev,
                mean_std_dev: baseline.meanStdDev,
              },
            },
          }],
          profilesets: {
            results: profilesets.map((r) => ({
              name: r.name,
              mean: r.dps,
              stddev: r.stdDev,
              mean_stddev: r.meanStdDev,
              min: r.dps - r.stdDev,
              max: r.dps + r.stdDev,
              median: r.dps,
            })),
          },
        },
      });
    });
  }

  it('runs 3 stages for 200+ combos and culls between stages', async () => {
    // Create 5 combos (pretend it's 200+ via explicit stages)
    const combos = [
      makeCombo('combo_0000'),
      makeCombo('combo_0001'),
      makeCombo('combo_0002'),
      makeCombo('combo_0003'),
      makeCombo('combo_0004'),
    ];

    // Stage 1: all 5 combos
    const stage1Results = [
      makeResult('combo_0000', 80000),
      makeResult('combo_0001', 100000),
      makeResult('combo_0002', 95000),
      makeResult('combo_0003', 70000),
      makeResult('combo_0004', 60000),
    ];

    // Stage 2: survivors from stage 1 (combo_0001, combo_0002, combo_0000 at minimum)
    const stage2Results = [
      makeResult('combo_0000', 81000),
      makeResult('combo_0001', 99500),
      makeResult('combo_0002', 94000),
    ];

    // Stage 3: final ranking
    const stage3Results = [
      makeResult('combo_0000', 80500),
      makeResult('combo_0001', 99800),
      makeResult('combo_0002', 94200),
    ];

    const mockRunSimC = createMockRunSimC([stage1Results, stage2Results, stage3Results]);
    const onStageStart = vi.fn();
    const onStageComplete = vi.fn();

    const { results, stageResults } = await runSmartSim(
      {
        combinations: combos,
        profile: MOCK_PROFILE,
        settings: MOCK_SETTINGS,
        stages: DEFAULT_STAGES,
      },
      {
        onStageStart,
        onStageComplete,
        runSimC: mockRunSimC,
      },
    );

    // Called 3 times (once per stage)
    expect(mockRunSimC).toHaveBeenCalledTimes(3);
    expect(stageResults).toHaveLength(3);
    expect(onStageStart).toHaveBeenCalledTimes(3);
    expect(onStageComplete).toHaveBeenCalledTimes(3);

    // Final results should be sorted by DPS descending
    expect(results[0].name).toBe('combo_0001');
    expect(results[0].dps).toBe(99800);
  });

  it('throws SmartSimCancelledError on cancellation with partial results', async () => {
    const combos = [makeCombo('combo_0000'), makeCombo('combo_0001')];
    const stage1Results = [
      makeResult('combo_0000', 80000),
      makeResult('combo_0001', 100000),
    ];

    let callIdx = 0;
    const mockRunSimC = vi.fn(async () => {
      callIdx++;
      if (callIdx === 1) {
        // Stage 1 succeeds
        return JSON.stringify({
          sim: {
            players: [{ collected_data: { dps: { mean: 80000, std_dev: 500, mean_std_dev: 50 } } }],
            profilesets: {
              results: [{ name: 'combo_0001', mean: 100000, stddev: 500, mean_stddev: 50, min: 99500, max: 100500, median: 100000 }],
            },
          },
        });
      }
      // Stage 2 cancelled
      throw new Error('Simulation cancelled');
    });

    try {
      await runSmartSim(
        {
          combinations: combos,
          profile: MOCK_PROFILE,
          settings: MOCK_SETTINGS,
          stages: DEFAULT_STAGES.slice(1), // 2 stages
        },
        { onStageStart: vi.fn(), onStageComplete: vi.fn(), runSimC: mockRunSimC },
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SmartSimCancelledError);
      const cancelErr = err as SmartSimCancelledError;
      expect(cancelErr.stageResults).toHaveLength(1);
      expect(cancelErr.partialResults).toHaveLength(2);
      expect(cancelErr.partialResults[0].dps).toBe(100000);
    }
  });

  it('propagates non-cancellation errors', async () => {
    const combos = [makeCombo('combo_0000')];
    const mockRunSimC = vi.fn(async () => {
      throw new Error('SimC binary not found');
    });

    await expect(
      runSmartSim(
        {
          combinations: combos,
          profile: MOCK_PROFILE,
          settings: MOCK_SETTINGS,
          stages: [DEFAULT_STAGES[2]],
        },
        { onStageStart: vi.fn(), onStageComplete: vi.fn(), runSimC: mockRunSimC },
      ),
    ).rejects.toThrow('SimC binary not found');
  });
});
