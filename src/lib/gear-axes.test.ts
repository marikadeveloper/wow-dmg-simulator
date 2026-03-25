import { describe, it, expect } from 'vitest';
import { buildGearAxes } from './gear-axes';
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

  it('creates an axis for a slot with 2+ selected items', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 200, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 201 }),
        makeItem({ slot: 'trinket1', id: 202 }),
      ],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket1:2']);
    const axes = buildGearAxes(profile, selection);
    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('slot:trinket1');
    expect(axes[0].options).toHaveLength(3);
  });

  it('generates correct simcLines with bonus_id, gem_id, and enchant_id', () => {
    const profile = makeProfile({
      finger1: [
        makeItem({ slot: 'finger1', id: 300, isEquipped: true, bonusIds: [1, 2], gemIds: [100], enchantId: 7340 }),
        makeItem({ slot: 'finger1', id: 301, bonusIds: [3] }),
      ],
    });
    const selection = new Set(['finger1:0', 'finger1:1']);
    const axes = buildGearAxes(profile, selection);
    expect(axes[0].options[0].simcLines).toEqual([
      'finger1=,id=300,bonus_id=1/2,gem_id=100,enchant_id=7340',
    ]);
    expect(axes[0].options[1].simcLines).toEqual([
      'finger1=,id=301,bonus_id=3',
    ]);
  });

  it('only includes selected items, not all items in the slot', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 200, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 201 }),
        makeItem({ slot: 'trinket1', id: 202 }),
      ],
    });
    // Only select index 0 and 2
    const selection = new Set(['trinket1:0', 'trinket1:2']);
    const axes = buildGearAxes(profile, selection);
    expect(axes[0].options).toHaveLength(2);
    expect(axes[0].options[0].id).toBe('item_200');
    expect(axes[0].options[1].id).toBe('item_202');
  });

  it('returns multiple axes for multiple slots with multi-select', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 200, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 201 }),
      ],
      trinket2: [
        makeItem({ slot: 'trinket2', id: 300, isEquipped: true }),
        makeItem({ slot: 'trinket2', id: 301 }),
      ],
    });
    const selection = new Set(['trinket1:0', 'trinket1:1', 'trinket2:0', 'trinket2:1']);
    const axes = buildGearAxes(profile, selection);
    expect(axes).toHaveLength(2);
  });
});
