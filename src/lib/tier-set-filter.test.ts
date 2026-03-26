import { describe, it, expect } from 'vitest';
import {
  detectTierSets,
  filterCombinationsByTierSets,
  countFilteredCombinations,
  type TierSetMinimums,
} from './tier-set-filter';
import type { SimcProfile, CombinationSpec } from './types';
import { TIER_SETS } from './presets/season-config';

// Use the first tier set from season-config for testing
const TEST_SET = TIER_SETS[0];
const TEST_SET_IDS = TEST_SET.itemIds;

function makeProfile(gearOverrides: Record<string, Array<{ id: number; isEquipped: boolean }>>): SimcProfile {
  const gear: Record<string, any[]> = {};
  for (const [slot, items] of Object.entries(gearOverrides)) {
    gear[slot] = items.map((item) => ({
      slot,
      id: item.id,
      bonusIds: [],
      gemIds: [],
      isEquipped: item.isEquipped,
    }));
  }
  return {
    characterName: 'Test',
    realm: 'Test',
    region: 'us',
    race: 'human',
    spec: 'arms',
    level: 80,
    talentString: '',
    gear,
    rawLines: [],
  };
}

function makeCombo(name: string, axes: Record<string, string>, overrideLines: string[] = []): CombinationSpec {
  return { name, axes, overrideLines };
}

describe('detectTierSets', () => {
  it('returns empty when no tier set items exist', () => {
    const profile = makeProfile({ head: [{ id: 99999, isEquipped: true }] });
    expect(detectTierSets(profile)).toEqual([]);
  });

  it('detects a tier set from equipped items', () => {
    const profile = makeProfile({
      head: [{ id: TEST_SET_IDS[0], isEquipped: true }],
      shoulder: [{ id: TEST_SET_IDS[1], isEquipped: true }],
      chest: [{ id: TEST_SET_IDS[2], isEquipped: true }],
    });
    const detected = detectTierSets(profile);
    expect(detected).toHaveLength(1);
    expect(detected[0].definition.id).toBe(TEST_SET.id);
    expect(detected[0].totalPieces).toBe(3);
    expect(detected[0].equippedPieces).toBe(3);
  });

  it('counts bag items separately from equipped', () => {
    const profile = makeProfile({
      head: [{ id: TEST_SET_IDS[0], isEquipped: true }],
      shoulder: [
        { id: TEST_SET_IDS[1], isEquipped: true },
        { id: 99999, isEquipped: false }, // non-tier bag item
      ],
      chest: [{ id: TEST_SET_IDS[2], isEquipped: false }], // tier piece in bag
    });
    const detected = detectTierSets(profile);
    expect(detected).toHaveLength(1);
    expect(detected[0].totalPieces).toBe(3);
    expect(detected[0].equippedPieces).toBe(2);
  });
});

describe('filterCombinationsByTierSets', () => {
  const profile = makeProfile({
    head: [
      { id: TEST_SET_IDS[0], isEquipped: true },
      { id: 99999, isEquipped: false },
    ],
    shoulder: [{ id: TEST_SET_IDS[1], isEquipped: true }],
    chest: [{ id: TEST_SET_IDS[2], isEquipped: true }],
    hands: [{ id: TEST_SET_IDS[3], isEquipped: true }],
    legs: [
      { id: TEST_SET_IDS[4], isEquipped: true },
      { id: 88888, isEquipped: false },
    ],
  });

  it('returns all combinations when minimums are empty', () => {
    const combos = [
      makeCombo('combo_0000', {}),
      makeCombo('combo_0001', { 'slot:head': 'item_99999' }),
    ];
    const minimums: TierSetMinimums = new Map();
    expect(filterCombinationsByTierSets(combos, profile, minimums)).toHaveLength(2);
  });

  it('returns all combinations when minimums are all zero', () => {
    const combos = [
      makeCombo('combo_0000', {}),
      makeCombo('combo_0001', { 'slot:head': 'item_99999' }),
    ];
    const minimums: TierSetMinimums = new Map([[TEST_SET.id, 0]]);
    expect(filterCombinationsByTierSets(combos, profile, minimums)).toHaveLength(2);
  });

  it('filters out combinations below minimum tier set pieces', () => {
    const combos = [
      // Baseline: 5 tier pieces (head, shoulder, chest, hands, legs all equipped = tier)
      makeCombo('combo_0000', {}),
      // Swap head to non-tier: 4 tier pieces
      makeCombo('combo_0001', { 'slot:head': `item_99999` }),
      // Swap head and legs to non-tier: 3 tier pieces
      makeCombo('combo_0002', { 'slot:head': 'item_99999', 'slot:legs': 'item_88888' }),
    ];

    // Require 4-set minimum
    const minimums: TierSetMinimums = new Map([[TEST_SET.id, 4]]);
    const filtered = filterCombinationsByTierSets(combos, profile, minimums);
    expect(filtered).toHaveLength(2); // combo_0000 (5pc) and combo_0001 (4pc)
    expect(filtered.map((c) => c.name)).toEqual(['combo_0000', 'combo_0001']);
  });

  it('filters with 2-set minimum', () => {
    const combos = [
      makeCombo('combo_0000', {}), // 5 pieces
      makeCombo('combo_0001', { 'slot:head': 'item_99999' }), // 4 pieces
      makeCombo('combo_0002', { 'slot:head': 'item_99999', 'slot:legs': 'item_88888' }), // 3 pieces
    ];
    const minimums: TierSetMinimums = new Map([[TEST_SET.id, 2]]);
    const filtered = filterCombinationsByTierSets(combos, profile, minimums);
    expect(filtered).toHaveLength(3); // all have >= 2 pieces
  });
});

describe('countFilteredCombinations', () => {
  const profile = makeProfile({
    head: [
      { id: TEST_SET_IDS[0], isEquipped: true },
      { id: 99999, isEquipped: false },
    ],
    shoulder: [{ id: TEST_SET_IDS[1], isEquipped: true }],
    chest: [{ id: TEST_SET_IDS[2], isEquipped: true }],
    hands: [{ id: TEST_SET_IDS[3], isEquipped: true }],
    legs: [{ id: TEST_SET_IDS[4], isEquipped: true }],
  });

  it('returns total count when no filters active', () => {
    const combos = [
      makeCombo('combo_0000', {}),
      makeCombo('combo_0001', { 'slot:head': 'item_99999' }),
    ];
    const minimums: TierSetMinimums = new Map();
    expect(countFilteredCombinations(combos, profile, minimums)).toBe(2);
  });

  it('returns filtered count with active filter', () => {
    const combos = [
      makeCombo('combo_0000', {}), // 5 pieces
      makeCombo('combo_0001', { 'slot:head': 'item_99999' }), // 4 pieces
    ];
    const minimums: TierSetMinimums = new Map([[TEST_SET.id, 4]]);
    expect(countFilteredCombinations(combos, profile, minimums)).toBe(2); // both have >= 4
  });
});
