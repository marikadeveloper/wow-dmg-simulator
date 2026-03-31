import { describe, it, expect } from 'vitest';
import { buildGearAxes, buildItemSimcLine } from './gear-axes';
import type { SimcProfile, GearItem } from './types';

function makeItem(overrides: Partial<GearItem> & { slot: string; id: number }): GearItem {
  return {
    bonusIds: [],
    gemIds: [],
    isEquipped: false,
    ...overrides,
  };
}

function makeProfile(gear: Record<string, GearItem[]>): SimcProfile {
  return {
    characterName: 'Test',
    realm: 'TestRealm',
    region: 'us',
    race: 'human',
    spec: 'arms',
    level: 80,
    talentString: '',
    gear,
    rawLines: [],
  };
}

describe('buildItemSimcLine', () => {
  it('builds a line with all fields', () => {
    const item = makeItem({ slot: 'finger1', id: 300, bonusIds: [1, 2], gemIds: [100], enchantId: 7340 });
    expect(buildItemSimcLine(item, 'finger1')).toBe('finger1=,id=300,bonus_id=1/2,gem_id=100,enchant_id=7340');
  });

  it('builds a line for a different target slot', () => {
    const item = makeItem({ slot: 'finger1', id: 300, bonusIds: [3] });
    expect(buildItemSimcLine(item, 'finger2')).toBe('finger2=,id=300,bonus_id=3');
  });

  it('omits empty fields', () => {
    const item = makeItem({ slot: 'head', id: 100 });
    expect(buildItemSimcLine(item, 'head')).toBe('head=,id=100');
  });
});

describe('buildGearAxes', () => {
  it('returns no axes when each slot has 0 or 1 selected items', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 100, isEquipped: true })],
      trinket1: [makeItem({ slot: 'trinket1', id: 200, isEquipped: true })],
    });
    const selection = new Set(['head:0', 'trinket1:0']);
    const axes = buildGearAxes(profile, selection);
    expect(axes).toHaveLength(0);
  });

  it('creates an axis for a non-paired slot with 2+ selected items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 200, isEquipped: true }),
        makeItem({ slot: 'head', id: 201 }),
        makeItem({ slot: 'head', id: 202 }),
      ],
    });
    const selection = new Set(['head:0', 'head:1', 'head:2']);
    const axes = buildGearAxes(profile, selection);
    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('slot:head');
    expect(axes[0].options).toHaveLength(3);
  });

  it('generates correct simcLines with bonus_id, gem_id, and enchant_id', () => {
    const profile = makeProfile({
      chest: [
        makeItem({ slot: 'chest', id: 300, isEquipped: true, bonusIds: [1, 2], gemIds: [100], enchantId: 7340 }),
        makeItem({ slot: 'chest', id: 301, bonusIds: [3] }),
      ],
    });
    const selection = new Set(['chest:0', 'chest:1']);
    const axes = buildGearAxes(profile, selection);
    // Equipped item produces empty simcLines (matches base profile)
    expect(axes[0].options[0].simcLines).toEqual([]);
    // Non-equipped item produces override lines
    expect(axes[0].options[1].simcLines).toEqual([
      'chest=,id=301,bonus_id=3',
    ]);
  });

  it('only includes selected items, not all items in the slot', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 200, isEquipped: true }),
        makeItem({ slot: 'head', id: 201 }),
        makeItem({ slot: 'head', id: 202 }),
      ],
    });
    const selection = new Set(['head:0', 'head:2']);
    const axes = buildGearAxes(profile, selection);
    expect(axes[0].options).toHaveLength(2);
    expect(axes[0].options[0].id).toBe('item_200_0');
    expect(axes[0].options[1].id).toBe('item_202_2');
  });

  it('returns multiple axes for multiple non-paired slots with multi-select', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 200, isEquipped: true }),
        makeItem({ slot: 'head', id: 201 }),
      ],
      chest: [
        makeItem({ slot: 'chest', id: 300, isEquipped: true }),
        makeItem({ slot: 'chest', id: 301 }),
      ],
    });
    const selection = new Set(['head:0', 'head:1', 'chest:0', 'chest:1']);
    const axes = buildGearAxes(profile, selection);
    expect(axes).toHaveLength(2);
  });
});

describe('ring pair axes', () => {
  it('generates a single "slot:rings" axis from finger1 + finger2 selections', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true }),
        makeItem({ slot: 'finger1', id: 101 }),
      ],
      finger2: [
        makeItem({ slot: 'finger2', id: 200, isEquipped: true }),
      ],
    });
    const selection = new Set(['finger1:0', 'finger1:1', 'finger2:0']);
    const axes = buildGearAxes(profile, selection);

    const ringAxis = axes.find((a) => a.id === 'slot:rings');
    expect(ringAxis).toBeDefined();
    // C(3,2) = 3 pairs
    expect(ringAxis!.options).toHaveLength(3);
  });

  it('each ring pair option sets both finger1 and finger2 simcLines', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true, enchantId: 7340 }),
        makeItem({ slot: 'finger1', id: 102 }),
      ],
      finger2: [
        makeItem({ slot: 'finger2', id: 200, isEquipped: true, bonusIds: [5] }),
      ],
    });
    const selection = new Set(['finger1:0', 'finger1:1', 'finger2:0']);
    const axes = buildGearAxes(profile, selection);

    const ringAxis = axes.find((a) => a.id === 'slot:rings');
    expect(ringAxis).toBeDefined();
    expect(ringAxis!.options).toHaveLength(3); // C(3,2) = 3 pairs

    const pair = ringAxis!.options[0];
    expect(pair.simcLines).toHaveLength(2);
    expect(pair.simcLines[0]).toBe('finger1=,id=100,enchant_id=7340');
    expect(pair.simcLines[1]).toBe('finger2=,id=102');
  });

  it('returns no ring axis when only one pair possible (2 items)', () => {
    const profile = makeProfile({
      finger1: [makeItem({ slot: 'finger1', id: 100, isEquipped: true })],
      finger2: [makeItem({ slot: 'finger2', id: 200, isEquipped: true })],
    });
    const selection = new Set(['finger1:0', 'finger2:0']);
    const axes = buildGearAxes(profile, selection);
    // C(2,2) = 1 pair → nothing to vary
    expect(axes.find((a) => a.id === 'slot:rings')).toBeUndefined();
  });

  it('does not create separate finger1/finger2 axes', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true }),
        makeItem({ slot: 'finger1', id: 101 }),
      ],
      finger2: [
        makeItem({ slot: 'finger2', id: 200, isEquipped: true }),
      ],
    });
    const selection = new Set(['finger1:0', 'finger1:1', 'finger2:0']);
    const axes = buildGearAxes(profile, selection);

    expect(axes.find((a) => a.id === 'slot:finger1')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:finger2')).toBeUndefined();
  });

  it('returns no ring axis when fewer than 2 rings are selected', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true }),
      ],
    });
    const selection = new Set(['finger1:0']);
    const axes = buildGearAxes(profile, selection);
    expect(axes.find((a) => a.id === 'slot:rings')).toBeUndefined();
  });

  it('generates correct pair count for 4 rings', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true }),
        makeItem({ slot: 'finger1', id: 101 }),
      ],
      finger2: [
        makeItem({ slot: 'finger2', id: 200, isEquipped: true }),
        makeItem({ slot: 'finger2', id: 201 }),
      ],
    });
    const selection = new Set(['finger1:0', 'finger1:1', 'finger2:0', 'finger2:1']);
    const axes = buildGearAxes(profile, selection);

    const ringAxis = axes.find((a) => a.id === 'slot:rings');
    // C(4,2) = 6 pairs
    expect(ringAxis!.options).toHaveLength(6);
  });

  it('pair option id contains both item ids', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 100, isEquipped: true }),
        makeItem({ slot: 'finger1', id: 101 }),
      ],
      finger2: [makeItem({ slot: 'finger2', id: 200, isEquipped: true })],
    });
    const selection = new Set(['finger1:0', 'finger1:1', 'finger2:0']);
    const axes = buildGearAxes(profile, selection);

    const pair = axes.find((a) => a.id === 'slot:rings')!.options[0];
    expect(pair.id).toBe('pair_100_101');
  });
});

describe('trinket pair axes', () => {
  it('generates a single "slot:trinkets" axis from trinket1 + trinket2 selections', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 500, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 501 }),
      ],
      trinket2: [
        makeItem({ slot: 'trinket2', id: 600, isEquipped: true }),
      ],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket2:0']);
    const axes = buildGearAxes(profile, selection);

    const trinketAxis = axes.find((a) => a.id === 'slot:trinkets');
    expect(trinketAxis).toBeDefined();
    // C(3,2) = 3 pairs
    expect(trinketAxis!.options).toHaveLength(3);
  });

  it('each trinket pair sets both trinket1 and trinket2 simcLines', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 500, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 501 }),
      ],
      trinket2: [makeItem({ slot: 'trinket2', id: 600, isEquipped: true, bonusIds: [10] })],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket2:0']);
    const axes = buildGearAxes(profile, selection);

    const trinketAxis = axes.find((a) => a.id === 'slot:trinkets');
    expect(trinketAxis).toBeDefined();
    // C(3,2) = 3 pairs
    const pair = trinketAxis!.options[0];
    expect(pair.simcLines).toHaveLength(2);
    expect(pair.simcLines[0]).toBe('trinket1=,id=500');
    expect(pair.simcLines[1]).toBe('trinket2=,id=501');
  });

  it('does not create separate trinket1/trinket2 axes', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 500, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 501 }),
      ],
      trinket2: [
        makeItem({ slot: 'trinket2', id: 600, isEquipped: true }),
      ],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket2:0']);
    const axes = buildGearAxes(profile, selection);

    expect(axes.find((a) => a.id === 'slot:trinket1')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:trinket2')).toBeUndefined();
  });

  it('generates C(4,2)=6 pairs for 4 trinkets', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 500, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 501 }),
      ],
      trinket2: [
        makeItem({ slot: 'trinket2', id: 600, isEquipped: true }),
        makeItem({ slot: 'trinket2', id: 601 }),
      ],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket2:0', 'trinket2:1']);
    const axes = buildGearAxes(profile, selection);

    expect(axes.find((a) => a.id === 'slot:trinkets')!.options).toHaveLength(6);
  });
});

describe('weapon axes (2H / 1H+OH)', () => {
  it('2H weapon adds off_hand=, when profile has an off_hand', () => {
    const profile = makeProfile({
      main_hand: [
        makeItem({ slot: 'main_hand', id: 100, isEquipped: true }),
        makeItem({ slot: 'main_hand', id: 200, isTwoHand: true }),
      ],
      off_hand: [
        makeItem({ slot: 'off_hand', id: 300, isEquipped: true }),
      ],
    });
    const selection = new Set(['main_hand:0', 'main_hand:1']);
    const axes = buildGearAxes(profile, selection);

    const weaponAxis = axes.find((a) => a.id === 'slot:weapons');
    expect(weaponAxis).toBeDefined();

    // The 2H option should include off_hand=,
    const twoHandOption = weaponAxis!.options.find((o) => o.id.includes('200'));
    expect(twoHandOption).toBeDefined();
    expect(twoHandOption!.simcLines).toContain('off_hand=,');

    // The 1H option should NOT include off_hand=,
    const oneHandOption = weaponAxis!.options.find((o) => o.id.includes('100'));
    expect(oneHandOption).toBeDefined();
    expect(oneHandOption!.simcLines).not.toContain('off_hand=,');
  });

  it('mixed 1H/2H with off_hand selection creates paired weapon axis', () => {
    const profile = makeProfile({
      main_hand: [
        makeItem({ slot: 'main_hand', id: 100, isEquipped: true }),
        makeItem({ slot: 'main_hand', id: 200, isTwoHand: true }),
      ],
      off_hand: [
        makeItem({ slot: 'off_hand', id: 300, isEquipped: true }),
        makeItem({ slot: 'off_hand', id: 301 }),
      ],
    });
    const selection = new Set(['main_hand:0', 'main_hand:1', 'off_hand:0', 'off_hand:1']);
    const axes = buildGearAxes(profile, selection);

    const weaponAxis = axes.find((a) => a.id === 'slot:weapons');
    expect(weaponAxis).toBeDefined();
    // 1 x 2H (with off_hand=,) + 1 x 1H paired with 2 off_hands = 3 options
    expect(weaponAxis!.options).toHaveLength(3);

    // No separate main_hand or off_hand axes
    expect(axes.find((a) => a.id === 'slot:main_hand')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:off_hand')).toBeUndefined();
  });

  it('pure 1H comparison (no isTwoHand) uses normal independent axes', () => {
    const profile = makeProfile({
      main_hand: [
        makeItem({ slot: 'main_hand', id: 100, isEquipped: true }),
        makeItem({ slot: 'main_hand', id: 101 }),
      ],
      off_hand: [
        makeItem({ slot: 'off_hand', id: 300, isEquipped: true }),
      ],
    });
    const selection = new Set(['main_hand:0', 'main_hand:1']);
    const axes = buildGearAxes(profile, selection);

    // No weapon pairing — standard main_hand axis
    expect(axes.find((a) => a.id === 'slot:weapons')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:main_hand')).toBeDefined();
  });

  it('2H-only comparison with no off_hand in profile uses normal axis', () => {
    const profile = makeProfile({
      main_hand: [
        makeItem({ slot: 'main_hand', id: 100, isEquipped: true, isTwoHand: true }),
        makeItem({ slot: 'main_hand', id: 200, isTwoHand: true }),
      ],
    });
    const selection = new Set(['main_hand:0', 'main_hand:1']);
    const axes = buildGearAxes(profile, selection);

    // No off_hand in profile, so no weapon pairing needed
    expect(axes.find((a) => a.id === 'slot:weapons')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:main_hand')).toBeDefined();
  });

  it('isTwoHand undefined defaults to 1H behavior', () => {
    const profile = makeProfile({
      main_hand: [
        makeItem({ slot: 'main_hand', id: 100, isEquipped: true }),
        makeItem({ slot: 'main_hand', id: 200 }), // no isTwoHand set
      ],
      off_hand: [
        makeItem({ slot: 'off_hand', id: 300, isEquipped: true }),
      ],
    });
    const selection = new Set(['main_hand:0', 'main_hand:1']);
    const axes = buildGearAxes(profile, selection);

    // No 2H items → no weapon pairing
    expect(axes.find((a) => a.id === 'slot:weapons')).toBeUndefined();
    expect(axes.find((a) => a.id === 'slot:main_hand')).toBeDefined();
  });
});
