import { describe, it, expect } from 'vitest';
import {
  computeItemUpgrade,
  computeAllUpgrades,
  getRelevantCrestTypes,
  countUpgradeableItems,
  type CrestBudget,
} from './upgrade-calculator';
import type { GearItem } from './types';
import { TRACK_BONUS_RANGES, UPGRADE_CREST_COST_PER_RANK } from './presets/season-config';

// Helper: build a GearItem at a specific track and rank
function makeItem(
  slot: string,
  id: number,
  trackName: string,
  rank: number,
  overrides: Partial<GearItem> = {},
): GearItem {
  const trackRange = TRACK_BONUS_RANGES.find((t) => t.name === trackName);
  if (!trackRange) throw new Error(`Unknown track: ${trackName}`);

  const trackBonusId = trackRange.startBonusId + (rank - 1);
  return {
    slot,
    id,
    bonusIds: [trackBonusId, 1808], // track bonus + a random bonus
    gemIds: [],
    isEquipped: true,
    ...overrides,
  };
}

describe('computeItemUpgrade', () => {
  it('returns null for items at max rank', () => {
    const item = makeItem('head', 100, 'Hero', 6);
    const budget: CrestBudget = { hero: 200 };
    expect(computeItemUpgrade(item, budget)).toBeNull();
  });

  it('returns null for items with no track bonus_id', () => {
    const item: GearItem = {
      slot: 'head',
      id: 100,
      bonusIds: [1808], // no track bonus
      gemIds: [],
      isEquipped: true,
    };
    const budget: CrestBudget = { hero: 200 };
    expect(computeItemUpgrade(item, budget)).toBeNull();
  });

  it('returns null when budget is zero for the required crest', () => {
    const item = makeItem('head', 100, 'Hero', 3);
    const budget: CrestBudget = { champion: 200, hero: 0 };
    expect(computeItemUpgrade(item, budget)).toBeNull();
  });

  it('returns null when budget is not enough for a single upgrade', () => {
    const item = makeItem('head', 100, 'Hero', 3);
    const budget: CrestBudget = { hero: UPGRADE_CREST_COST_PER_RANK - 1 };
    expect(computeItemUpgrade(item, budget)).toBeNull();
  });

  it('upgrades a Hero 3/6 item to Hero 6/6 with enough budget', () => {
    const item = makeItem('head', 100, 'Hero', 3);
    // 3 ranks to go, 20 each = 60 needed
    const budget: CrestBudget = { hero: 100 };
    const result = computeItemUpgrade(item, budget);

    expect(result).not.toBeNull();
    expect(result!.isUpgraded).toBe(true);
    expect(result!.isEquipped).toBe(false);

    // Verify the bonus_id was changed to rank 6
    const heroRange = TRACK_BONUS_RANGES.find((t) => t.name === 'Hero')!;
    const rank6BonusId = heroRange.startBonusId + 5; // rank 6 = offset 5
    expect(result!.bonusIds).toContain(rank6BonusId);
    // Original non-track bonus_id should be preserved
    expect(result!.bonusIds).toContain(1808);
  });

  it('partially upgrades when budget is limited', () => {
    const item = makeItem('head', 100, 'Champion', 1);
    // 5 ranks to go, 20 each, but budget only allows 2 ranks
    const budget: CrestBudget = { champion: 2 * UPGRADE_CREST_COST_PER_RANK };
    const result = computeItemUpgrade(item, budget);

    expect(result).not.toBeNull();
    // Should be at rank 3 (1 + 2)
    const champRange = TRACK_BONUS_RANGES.find((t) => t.name === 'Champion')!;
    const rank3BonusId = champRange.startBonusId + 2; // rank 3 = offset 2
    expect(result!.bonusIds).toContain(rank3BonusId);
  });

  it('uses the correct crest type per track', () => {
    // Adventurer track needs adventurer crests
    const item = makeItem('chest', 200, 'Adventurer', 2);
    const wrongBudget: CrestBudget = { hero: 200 };
    expect(computeItemUpgrade(item, wrongBudget)).toBeNull();

    const rightBudget: CrestBudget = { adventurer: 200 };
    expect(computeItemUpgrade(item, rightBudget)).not.toBeNull();
  });
});

describe('computeAllUpgrades', () => {
  it('returns empty map when no items are selected', () => {
    const gear = { head: [makeItem('head', 100, 'Hero', 3)] };
    const selection = new Set<string>();
    const budget: CrestBudget = { hero: 200 };
    const result = computeAllUpgrades(gear, selection, budget);
    expect(result.size).toBe(0);
  });

  it('returns upgrades only for selected items', () => {
    const gear = {
      head: [makeItem('head', 100, 'Hero', 3)],
      chest: [makeItem('chest', 200, 'Hero', 2)],
    };
    const selection = new Set(['head:0']); // only head selected
    const budget: CrestBudget = { hero: 200 };
    const result = computeAllUpgrades(gear, selection, budget);

    expect(result.has('head')).toBe(true);
    expect(result.has('chest')).toBe(false);
    expect(result.get('head')!.length).toBe(1);
    expect(result.get('head')![0].isUpgraded).toBe(true);
  });

  it('handles multiple items in the same slot', () => {
    const gear = {
      head: [
        makeItem('head', 100, 'Hero', 3),
        makeItem('head', 101, 'Hero', 1, { isEquipped: false }),
      ],
    };
    const selection = new Set(['head:0', 'head:1']);
    const budget: CrestBudget = { hero: 200 };
    const result = computeAllUpgrades(gear, selection, budget);

    expect(result.get('head')!.length).toBe(2);
  });
});

describe('getRelevantCrestTypes', () => {
  it('returns only crest types for tracks with upgradeable items', () => {
    const gear = {
      head: [makeItem('head', 100, 'Hero', 3)],
      chest: [makeItem('chest', 200, 'Champion', 6)], // max rank, not upgradeable
    };
    const selection = new Set(['head:0', 'chest:0']);
    const result = getRelevantCrestTypes(gear, selection);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('hero');
  });

  it('returns empty when all items are at max rank', () => {
    const gear = {
      head: [makeItem('head', 100, 'Hero', 6)],
    };
    const selection = new Set(['head:0']);
    const result = getRelevantCrestTypes(gear, selection);
    expect(result.length).toBe(0);
  });
});

describe('countUpgradeableItems', () => {
  it('counts upgradeable items per crest type', () => {
    const gear = {
      head: [makeItem('head', 100, 'Hero', 3)],
      chest: [makeItem('chest', 200, 'Hero', 2)],
      legs: [makeItem('legs', 300, 'Champion', 4)],
    };
    const selection = new Set(['head:0', 'chest:0', 'legs:0']);
    const counts = countUpgradeableItems(gear, selection);

    expect(counts.get('hero')).toBe(2);
    expect(counts.get('champion')).toBe(1);
  });
});
