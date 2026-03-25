import { describe, it, expect } from 'vitest';
import { buildEnchantAxes } from './enchant-axes';
import type { SimcProfile, GearItem } from './types';

function makeItem(slot: string, id: number, isEquipped = false): GearItem {
  return { slot, id, bonusIds: [10355], gemIds: [], isEquipped };
}

function makeProfile(gear: SimcProfile['gear']): SimcProfile {
  return {
    characterName: 'Test',
    realm: 'testrealm',
    region: 'us',
    race: 'human',
    spec: 'arms',
    level: 80,
    talentString: 'AAAA',
    gear,
    rawLines: [],
  };
}

describe('buildEnchantAxes', () => {
  it('returns empty array when no enchant IDs are provided', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 1, true)],
    });
    const selection = new Set(['chest:0']);
    expect(buildEnchantAxes(profile, selection, [])).toEqual([]);
  });

  it('returns empty array when no enchantable slots have selections', () => {
    const profile = makeProfile({
      trinket1: [makeItem('trinket1', 1, true)],
    });
    const selection = new Set(['trinket1:0']);
    // 7988 = Blessing of Speed (head) — but no head slot selected
    expect(buildEnchantAxes(profile, selection, [7988])).toEqual([]);
  });

  it('creates one axis for a single enchantable slot', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
    });
    const selection = new Set(['chest:0']);
    // 7956 = Mark of Nalorakk (chest enchant)
    const axes = buildEnchantAxes(profile, selection, [7956]);

    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('enchant:chest');
    expect(axes[0].options).toHaveLength(1);
    expect(axes[0].options[0].id).toBe('enchant_7956');
    // Enchant axes are unconditional — no parentItemId
    expect(axes[0].parentItemId).toBeUndefined();
    expect(axes[0].parentSlot).toBeUndefined();
  });

  it('creates separate axes for finger1 and finger2', () => {
    const profile = makeProfile({
      finger1: [makeItem('finger1', 100, true)],
      finger2: [makeItem('finger2', 200, true)],
    });
    const selection = new Set(['finger1:0', 'finger2:0']);
    // 7996 = Nature's Fury (finger enchant)
    const axes = buildEnchantAxes(profile, selection, [7996]);

    expect(axes).toHaveLength(2);
    expect(axes.find((a) => a.id === 'enchant:finger1')).toBeDefined();
    expect(axes.find((a) => a.id === 'enchant:finger2')).toBeDefined();
    // Both should have the same enchant option
    for (const axis of axes) {
      expect(axis.options).toHaveLength(1);
      expect(axis.options[0].id).toBe('enchant_7996');
    }
  });

  it('only includes enchants matching the slot category', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
      feet: [makeItem('feet', 200, true)],
    });
    const selection = new Set(['chest:0', 'feet:0']);
    // 7956 = Mark of Nalorakk (chest), 7962 = Lynx's Dexterity (feet)
    const axes = buildEnchantAxes(profile, selection, [7956, 7962]);

    const chestAxis = axes.find((a) => a.id === 'enchant:chest');
    const feetAxis = axes.find((a) => a.id === 'enchant:feet');

    expect(chestAxis).toBeDefined();
    expect(feetAxis).toBeDefined();
    // Each should only have its own enchant, not the other slot's
    expect(chestAxis!.options).toHaveLength(1);
    expect(chestAxis!.options[0].id).toBe('enchant_7956');
    expect(feetAxis!.options).toHaveLength(1);
    expect(feetAxis!.options[0].id).toBe('enchant_7962');
  });

  it('skips slots with no selected items', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
      feet: [makeItem('feet', 200, true)],
    });
    // Only chest selected, not feet
    const selection = new Set(['chest:0']);
    // 7956 = chest, 7962 = feet — feet should be ignored
    const axes = buildEnchantAxes(profile, selection, [7956, 7962]);

    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('enchant:chest');
  });

  it('uses known preset names for labels', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
    });
    const selection = new Set(['chest:0']);
    // 7956 = Mark of Nalorakk
    const axes = buildEnchantAxes(profile, selection, [7956]);

    expect(axes[0].options[0].label).toBe('Mark of Nalorakk');
  });

  it('enchant simcLines are empty (merged by profileset builder)', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
    });
    const selection = new Set(['chest:0']);
    const axes = buildEnchantAxes(profile, selection, [7956]);
    expect(axes[0].options[0].simcLines).toEqual([]);
  });

  it('handles multiple enchants for the same slot', () => {
    const profile = makeProfile({
      chest: [makeItem('chest', 100, true)],
    });
    const selection = new Set(['chest:0']);
    // 7956 = Mark of Nalorakk, 7957 = Mark of Nalorakk (Q2) — both chest
    const axes = buildEnchantAxes(profile, selection, [7956, 7957]);

    expect(axes).toHaveLength(1);
    expect(axes[0].options).toHaveLength(2);
  });

  it('off_hand uses main_hand enchant category', () => {
    const profile = makeProfile({
      off_hand: [makeItem('off_hand', 100, true)],
    });
    const selection = new Set(['off_hand:0']);
    // 7978 = Strength of Halazzi (main_hand category)
    const axes = buildEnchantAxes(profile, selection, [7978]);

    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('enchant:off_hand');
    expect(axes[0].options).toHaveLength(1);
  });

  it('works across multiple slots simultaneously', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, true)],
      chest: [makeItem('chest', 200, true)],
      finger1: [makeItem('finger1', 300, true)],
      main_hand: [makeItem('main_hand', 400, true)],
    });
    const selection = new Set(['head:0', 'chest:0', 'finger1:0', 'main_hand:0']);
    // 7988 = head, 7956 = chest, 7996 = finger, 7978 = main_hand
    const axes = buildEnchantAxes(profile, selection, [7988, 7956, 7996, 7978]);

    expect(axes).toHaveLength(4);
    expect(axes.find((a) => a.id === 'enchant:head')).toBeDefined();
    expect(axes.find((a) => a.id === 'enchant:chest')).toBeDefined();
    expect(axes.find((a) => a.id === 'enchant:finger1')).toBeDefined();
    expect(axes.find((a) => a.id === 'enchant:main_hand')).toBeDefined();
  });
});
