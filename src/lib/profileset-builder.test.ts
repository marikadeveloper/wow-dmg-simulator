import { describe, it, expect } from 'vitest';
import { buildProfileSetFile, parseSimCResults } from './profileset-builder';
import type { SimcProfile, CombinationSpec, SimSettings } from './types';

const baseProfile: SimcProfile = {
  characterName: 'Thrall',
  realm: 'draenor',
  region: 'eu',
  race: 'orc',
  spec: 'enhancement',
  level: 80,
  talentString: 'AAAA',
  gear: {},
  rawLines: [
    'shaman="Thrall"',
    'level=80',
    'race=orc',
    'region=eu',
    'server=draenor',
    'spec=enhancement',
    'talents=AAAA',
    'head=,id=235602,bonus_id=10355/10257',
    'trinket1=,id=235616,bonus_id=10355/10257',
  ],
};

const defaultSettings: SimSettings = {
  fightStyle: 'Patchwerk',
  maxTime: 300,
  varyCombatLength: 0.2,
  numEnemies: 1,
  iterations: 10000,
  threads: 7,
  jsonOutputPath: '/tmp/test.json',
  potion: '',
  food: '',
  flask: '',
  augmentation: '',
  weaponRune: '',
  raidBuffs: { bloodlust: true, arcane_intellect: true },
  crucibleModes: {},
};

describe('buildProfileSetFile', () => {
  it('produces correct section order', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
      { name: 'combo_0001', axes: { 'slot:trinket1': 'item_200' }, overrideLines: ['trinket1=,id=200'] },
    ];

    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);
    const lines = output.split('\n');

    // Global options section comes first
    const globalIdx = lines.findIndex((l) => l.includes('fight_style='));
    // Base profile section comes after
    const baseIdx = lines.findIndex((l) => l.includes('shaman="Thrall"'));
    // ProfileSet entries come last
    const profilesetIdx = lines.findIndex((l) => l.includes('profileset.'));

    expect(globalIdx).toBeLessThan(baseIdx);
    expect(baseIdx).toBeLessThan(profilesetIdx);
  });

  it('includes global options', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);

    expect(output).toContain('fight_style=Patchwerk');
    expect(output).toContain('max_time=300');
    expect(output).toContain('vary_combat_length=0.2');
    expect(output).toContain('iterations=10000');
    expect(output).toContain('threads=7');
    expect(output).toContain('process_priority=below_normal');
    expect(output).toContain('profileset_work_threads=2');
    expect(output).toContain('json2=/tmp/test.json');
  });

  it('uses target_error instead of iterations when targetError is set', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const settingsWithTargetError: SimSettings = {
      ...defaultSettings,
      targetError: 0.1,
    };
    const output = buildProfileSetFile(baseProfile, combos, settingsWithTargetError);

    expect(output).toContain('target_error=0.1');
    expect(output).not.toContain('iterations=');
  });

  it('uses iterations when targetError is not set', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);

    expect(output).toContain('iterations=10000');
    expect(output).not.toContain('target_error');
  });

  it('includes base profile rawLines', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);

    expect(output).toContain('shaman="Thrall"');
    expect(output).toContain('head=,id=235602,bonus_id=10355/10257');
    expect(output).toContain('talents=AAAA');
  });

  it('does not generate profileset entries for baseline (no overrides)', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);
    expect(output).not.toContain('profileset.');
  });

  it('generates correct profileset entries with = for first line', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
      {
        name: 'combo_0001',
        axes: { 'slot:trinket1': 'item_200' },
        overrideLines: ['trinket1=,id=200,bonus_id=10390/10257'],
      },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);

    expect(output).toContain('profileset."combo_0001"=trinket1=,id=200,bonus_id=10390/10257');
  });

  it('generates += for subsequent lines of same profileset', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
      {
        name: 'combo_0001',
        axes: {},
        overrideLines: [
          'trinket1=,id=200,bonus_id=10390/10257',
          'finger1=,id=229379,bonus_id=10390/10257,enchant_id=7341',
        ],
      },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);

    // Both lines are present (order follows gearSlotOrder: finger1 before trinket1)
    expect(output).toContain('profileset."combo_0001"=finger1=,id=229379,bonus_id=10390/10257,enchant_id=7341');
    expect(output).toContain('profileset."combo_0001"+=trinket1=,id=200,bonus_id=10390/10257');
  });

  it('generates enemy lines when numEnemies > 1', () => {
    const settings = { ...defaultSettings, numEnemies: 4 };
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, settings);

    expect(output).toContain('enemy=add1');
    expect(output).toContain('enemy=add2');
    expect(output).toContain('enemy=add3');
    expect(output).not.toContain('enemy=add4');
  });

  it('does not generate enemy lines when numEnemies is 1', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);
    expect(output).not.toContain('enemy=');
  });

  it('adds fixed_time=1 when vary_combat_length is 0', () => {
    const settings = { ...defaultSettings, varyCombatLength: 0 };
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
    ];
    const output = buildProfileSetFile(baseProfile, combos, settings);
    expect(output).toContain('fixed_time=1');
  });

  it('only writes changed slots in profileset entries (not all slots)', () => {
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
      {
        name: 'combo_0001',
        axes: { 'slot:trinket1': 'item_200' },
        overrideLines: ['trinket1=,id=200,bonus_id=10390/10257'],
      },
    ];
    const output = buildProfileSetFile(baseProfile, combos, defaultSettings);
    const profilesetLines = output.split('\n').filter((l) => l.startsWith('profileset.'));

    // Should only have the trinket1 override, not head or other slots
    expect(profilesetLines).toHaveLength(1);
    expect(profilesetLines[0]).toContain('trinket1=,id=200');
    expect(profilesetLines[0]).not.toContain('head=');
  });

  it('preserves crafted_stats from raw lines for enchant-only overrides', () => {
    const craftedProfile: SimcProfile = {
      ...baseProfile,
      rawLines: [
        'shaman="Thrall"',
        'level=80',
        'race=orc',
        'region=eu',
        'server=draenor',
        'spec=enhancement',
        'talents=AAAA',
        'main_hand=,id=265337,enchant_id=8039,bonus_id=12214/12497,crafted_stats=40/36,crafting_quality=5',
      ],
    };
    const combos: CombinationSpec[] = [
      { name: 'combo_0000', axes: {}, overrideLines: [] },
      {
        name: 'combo_0001',
        axes: { 'enchant:main_hand': 'enchant_8040' },
        overrideLines: [],
      },
    ];
    const output = buildProfileSetFile(craftedProfile, combos, defaultSettings);

    // The enchant override should use the raw line which preserves crafted_stats
    expect(output).toContain('crafted_stats=40/36');
    expect(output).toContain('crafting_quality=5');
    expect(output).toContain('enchant_id=8040');
  });
});

describe('parseSimCResults', () => {
  const sampleJson = JSON.stringify({
    sim: {
      players: [
        {
          collected_data: {
            dps: {
              mean: 850000,
              std_dev: 12000,
              mean_std_dev: 1200,
            },
          },
        },
      ],
      profilesets: {
        results: [
          {
            name: 'combo_0001',
            mean: 860000,
            stddev: 11000,
            mean_stddev: 1100,
            min: 800000,
            max: 920000,
            median: 858000,
          },
          {
            name: 'combo_0002',
            mean: 840000,
            stddev: 13000,
            mean_stddev: 1300,
            min: 790000,
            max: 900000,
            median: 839000,
          },
        ],
      },
    },
  });

  const manifest = new Map<string, CombinationSpec>([
    [
      'combo_0001',
      {
        name: 'combo_0001',
        axes: { 'slot:trinket1': 'item_200' },
        overrideLines: ['trinket1=,id=200'],
      },
    ],
    [
      'combo_0002',
      {
        name: 'combo_0002',
        axes: { 'slot:trinket1': 'item_300' },
        overrideLines: ['trinket1=,id=300'],
      },
    ],
  ]);

  it('parses base DPS from sim.players[0]', () => {
    const results = parseSimCResults(sampleJson, manifest);
    const baseline = results.find((r) => r.isBaseline);
    expect(baseline).toBeDefined();
    expect(baseline!.dps).toBe(850000);
    expect(baseline!.name).toBe('combo_0000');
  });

  it('parses profileset results', () => {
    const results = parseSimCResults(sampleJson, manifest);
    const combo1 = results.find((r) => r.name === 'combo_0001');
    expect(combo1).toBeDefined();
    expect(combo1!.dps).toBe(860000);
    expect(combo1!.isBaseline).toBe(false);
  });

  it('merges axes from manifest', () => {
    const results = parseSimCResults(sampleJson, manifest);
    const combo1 = results.find((r) => r.name === 'combo_0001');
    expect(combo1!.axes).toEqual({ 'slot:trinket1': 'item_200' });
  });

  it('returns results sorted by DPS descending', () => {
    const results = parseSimCResults(sampleJson, manifest);
    expect(results[0].dps).toBe(860000);
    expect(results[1].dps).toBe(850000);
    expect(results[2].dps).toBe(840000);
  });

  it('includes meanStdDev for noise detection', () => {
    const results = parseSimCResults(sampleJson, manifest);
    const baseline = results.find((r) => r.isBaseline);
    expect(baseline!.meanStdDev).toBe(1200);
  });

  it('handles json with no profilesets', () => {
    const jsonNoProfilesets = JSON.stringify({
      sim: {
        players: [
          {
            collected_data: {
              dps: { mean: 850000, std_dev: 12000, mean_std_dev: 1200 },
            },
          },
        ],
      },
    });
    const results = parseSimCResults(jsonNoProfilesets, new Map());
    expect(results).toHaveLength(1);
    expect(results[0].isBaseline).toBe(true);
  });
});
