import { describe, it, expect } from 'vitest';
import {
  generateCatalystItems,
  countCatalystItemsInCombo,
  filterCombinationsByCatalystCharges,
} from './catalyst-generator';
import type { SimcProfile, GearItem, CombinationSpec } from './types';
import { TIER_SETS } from './presets/season-config';

// Use the mage tier set for testing
const MAGE_SET = TIER_SETS.find((s) => s.id === 'mn_s1_mage')!;
const MAGE_TIER_HEAD_ID = MAGE_SET.itemIds[0]; // head slot

function makeItem(overrides: Partial<GearItem> & { slot: string; id: number }): GearItem {
  return {
    bonusIds: [],
    gemIds: [],
    isEquipped: true,
    ...overrides,
  };
}

function makeProfile(
  className: string,
  gearOverrides: Record<string, Array<Partial<GearItem> & { id: number }>>,
): SimcProfile {
  const gear: Record<string, GearItem[]> = {};
  for (const [slot, items] of Object.entries(gearOverrides)) {
    gear[slot] = items.map((item) => makeItem({ slot, ...item }));
  }
  return {
    characterName: 'Test',
    realm: 'Test',
    region: 'us',
    race: 'human',
    spec: 'frost',
    level: 90,
    talentString: 'AAAA',
    gear,
    rawLines: [],
    className,
  };
}

describe('generateCatalystItems', () => {
  it('generates catalyst copies for non-tier items in tier slots', () => {
    const profile = makeProfile('mage', {
      head: [{ id: 99999 }], // non-tier item
    });
    const selection = new Set(['head:0']);
    const result = generateCatalystItems(profile, selection);

    expect(result.has('head')).toBe(true);
    expect(result.get('head')!.length).toBe(1);

    const catalystItem = result.get('head')![0];
    expect(catalystItem.id).toBe(MAGE_TIER_HEAD_ID);
    expect(catalystItem.isCatalyst).toBe(true);
    expect(catalystItem.isEquipped).toBe(false);
  });

  it('does not generate catalyst copies for items already in a tier set', () => {
    const profile = makeProfile('mage', {
      head: [{ id: MAGE_TIER_HEAD_ID }], // already tier
    });
    const selection = new Set(['head:0']);
    const result = generateCatalystItems(profile, selection);

    expect(result.size).toBe(0);
  });

  it('does not generate catalyst copies for unselected items', () => {
    const profile = makeProfile('mage', {
      head: [{ id: 99999 }],
    });
    const selection = new Set<string>(); // nothing selected
    const result = generateCatalystItems(profile, selection);

    expect(result.size).toBe(0);
  });

  it('does not generate catalyst copies for non-tier slots', () => {
    const profile = makeProfile('mage', {
      neck: [{ id: 99999 }], // not a tier slot
    });
    const selection = new Set(['neck:0']);
    const result = generateCatalystItems(profile, selection);

    expect(result.size).toBe(0);
  });

  it('returns empty when className is not set', () => {
    const profile = makeProfile('', {
      head: [{ id: 99999 }],
    });
    // Remove className
    delete (profile as any).className;
    const selection = new Set(['head:0']);
    const result = generateCatalystItems(profile, selection);

    expect(result.size).toBe(0);
  });

  it('preserves bonus_ids from the original item', () => {
    const profile = makeProfile('mage', {
      head: [{ id: 99999, bonusIds: [12793, 13577] }],
    });
    const selection = new Set(['head:0']);
    const result = generateCatalystItems(profile, selection);

    const catalystItem = result.get('head')![0];
    expect(catalystItem.bonusIds).toEqual([12793, 13577]);
  });

  it('skips items that are already catalyst copies', () => {
    const profile = makeProfile('mage', {
      head: [
        { id: 99999 },
        { id: MAGE_TIER_HEAD_ID, isCatalyst: true, isEquipped: false },
      ],
    });
    const selection = new Set(['head:0', 'head:1']);
    const result = generateCatalystItems(profile, selection);

    // Only the non-tier, non-catalyst item should produce a catalyst copy
    expect(result.get('head')!.length).toBe(1);
  });
});

describe('countCatalystItemsInCombo', () => {
  it('counts catalyst_ prefixed options in a combination', () => {
    const combo: CombinationSpec = {
      name: 'combo_0001',
      axes: {
        'slot:head': 'catalyst_240062_2',
        'slot:shoulder': 'item_99999_0',
        'slot:chest': 'catalyst_240064_3',
      },
      overrideLines: [],
    };

    expect(countCatalystItemsInCombo(combo)).toBe(2);
  });

  it('returns 0 when no catalyst options exist', () => {
    const combo: CombinationSpec = {
      name: 'combo_0001',
      axes: { 'slot:head': 'item_99999_0' },
      overrideLines: [],
    };

    expect(countCatalystItemsInCombo(combo)).toBe(0);
  });
});

describe('filterCombinationsByCatalystCharges', () => {
  const combos: CombinationSpec[] = [
    { name: 'combo_0000', axes: {}, overrideLines: [] }, // baseline, 0 catalyst
    {
      name: 'combo_0001',
      axes: { 'slot:head': 'catalyst_240062_2' },
      overrideLines: [],
    }, // 1 catalyst
    {
      name: 'combo_0002',
      axes: {
        'slot:head': 'catalyst_240062_2',
        'slot:chest': 'catalyst_240064_3',
      },
      overrideLines: [],
    }, // 2 catalyst
    {
      name: 'combo_0003',
      axes: {
        'slot:head': 'catalyst_240062_2',
        'slot:chest': 'catalyst_240064_3',
        'slot:legs': 'catalyst_240066_4',
      },
      overrideLines: [],
    }, // 3 catalyst
  ];

  it('filters out combinations exceeding charge limit', () => {
    const result = filterCombinationsByCatalystCharges(combos, 1);
    expect(result.length).toBe(2); // baseline + 1 catalyst
  });

  it('allows all combinations when charge limit is high enough', () => {
    const result = filterCombinationsByCatalystCharges(combos, 5);
    expect(result.length).toBe(4);
  });

  it('allows only baseline when charges is 0', () => {
    const result = filterCombinationsByCatalystCharges(combos, 0);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('combo_0000');
  });
});
