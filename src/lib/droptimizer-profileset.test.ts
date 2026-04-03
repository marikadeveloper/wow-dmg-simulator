import { describe, it, expect } from 'vitest';
import { generateDroptimizerCombinations, type DroptimizerProfileSetOptions } from './droptimizer-profileset';
import type { SimcProfile } from './types';
import type { DroptimizerItem } from './droptimizer-items';

const DEFAULT_OPTIONS: DroptimizerProfileSetOptions = {
  preferredGemId: null,
  addVaultSocket: false,
  upgradeTrack: null,
  upgradeAllEquipped: false,
};

function makeProfile(overrides?: Partial<SimcProfile>): SimcProfile {
  return {
    characterName: 'TestChar',
    realm: 'TestRealm',
    region: 'us',
    race: 'human',
    spec: 'frost',
    level: 80,
    talentString: 'test',
    gear: {
      head: [{ slot: 'head', id: 100, bonusIds: [], gemIds: [], isEquipped: true, enchantId: 7001, ilvl: 639 }],
      neck: [{ slot: 'neck', id: 101, bonusIds: [], gemIds: [240888], isEquipped: true, ilvl: 639 }],
      finger1: [{ slot: 'finger1', id: 200, bonusIds: [], gemIds: [], isEquipped: true, enchantId: 7002, ilvl: 639 }],
      finger2: [{ slot: 'finger2', id: 201, bonusIds: [], gemIds: [], isEquipped: true, enchantId: 7003, ilvl: 639 }],
      trinket1: [{ slot: 'trinket1', id: 300, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      trinket2: [{ slot: 'trinket2', id: 301, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      off_hand: [{ slot: 'off_hand', id: 401, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
    },
    rawLines: ['mage="TestChar"', 'level=80', 'race=human', 'spec=frost'],
    className: 'mage',
    ...overrides,
  };
}

function makeItem(overrides?: Partial<DroptimizerItem>): DroptimizerItem {
  return {
    key: 'test_item',
    itemId: 999,
    name: 'Test Drop',
    slot: 'head',
    ilvl: 272,
    bonusIds: [4799, 4786, 12796],
    sourceLabel: 'Boss Name',
    sourceGroupId: 'raid_1',
    sourceGroupName: 'Test Raid',
    isCatalyst: false,
    ...overrides,
  };
}

describe('generateDroptimizerCombinations', () => {
  it('generates baseline + one combo per item', () => {
    const profile = makeProfile();
    const items = [makeItem({ key: 'a', itemId: 501 }), makeItem({ key: 'b', itemId: 502 })];
    const { combinations, meta } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations).toHaveLength(3); // baseline + 2 items
    expect(combinations[0].name).toBe('combo_0000');
    expect(combinations[0].overrideLines).toHaveLength(0);
    expect(combinations[1].name).toBe('combo_0001');
    expect(combinations[2].name).toBe('combo_0002');
    expect(meta.size).toBe(2);
  });

  it('uses bonus_id for raid items instead of ilevel', () => {
    const profile = makeProfile();
    const items = [makeItem({ itemId: 501, ilvl: 272, bonusIds: [4799, 4786, 12796] })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('bonus_id=4799/4786/12796');
    expect(line).not.toContain('ilevel=');
  });

  it('falls back to ilevel for items without bonus_ids', () => {
    const profile = makeProfile();
    const items = [makeItem({ itemId: 501, ilvl: 266, bonusIds: [] })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('ilevel=266');
  });

  // ── 12.24: Enchant inheritance ──────────────────────────────────────────

  it('inherits enchant from equipped item in the same slot', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'head', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('enchant_id=7001');
  });

  it('does not add enchant if equipped item has none', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'trinket', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // trinket1 has no enchant
    const line = combinations[1].overrideLines[0];
    expect(line).not.toContain('enchant_id');
  });

  // ── 12.25: Gem/socket inheritance ─────────────────────────────────────

  it('inherits gems from equipped item in same slot', () => {
    const profile = makeProfile();
    // neck has gem 240888
    const items = [makeItem({ slot: 'neck', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('gem_id=240888');
  });

  it('does not add gems to non-socketable slots', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'head', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // head is not a socketable droptimizer slot — no gems
    const line = combinations[1].overrideLines[0];
    expect(line).not.toContain('gem_id');
  });

  it('adds socket bonus_id and inherits gems for ring drops', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'finger', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // finger1 version should get finger1's gem, finger2 version should get finger2's gem (if any)
    const line1 = combinations[1].overrideLines[0]; // finger1
    expect(line1).toContain('13668'); // socket bonus_id
  });

  it('uses preferred gem over inherited gems', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'neck', itemId: 501 })];
    const opts = { ...DEFAULT_OPTIONS, preferredGemId: 240904 };
    const { combinations } = generateDroptimizerCombinations(profile, items, opts);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('gem_id=240904');
    expect(line).not.toContain('gem_id=240888');
  });

  // ── 12.26: Rings in both slots, trinkets in both slots ────────────────

  it('tries rings in both finger slots', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'finger', itemId: 501 })];
    const { combinations, meta } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // baseline + finger1 + finger2
    expect(combinations).toHaveLength(3);

    const m1 = meta.get('combo_0001')!;
    const m2 = meta.get('combo_0002')!;
    expect(m1.targetSlot).toBe('finger1');
    expect(m2.targetSlot).toBe('finger2');
    expect(m1.isSlotVariation).toBe(false);
    expect(m2.isSlotVariation).toBe(true);
  });

  it('tries trinkets in both trinket slots', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'trinket', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations).toHaveLength(3); // baseline + trinket1 + trinket2
    expect(combinations[1].overrideLines[0]).toMatch(/^trinket1=/);
    expect(combinations[2].overrideLines[0]).toMatch(/^trinket2=/);
  });

  it('inherits enchant from the correct finger slot', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'finger', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // finger1 has enchant 7002, finger2 has enchant 7003
    expect(combinations[1].overrideLines[0]).toContain('enchant_id=7002');
    expect(combinations[2].overrideLines[0]).toContain('enchant_id=7003');
  });

  // ── 12.27: Unique-Equipped constraint ─────────────────────────────────

  it('skips duplicate ring in the other slot', () => {
    const profile = makeProfile();
    // Item 200 is already equipped in finger1 — skip finger2 with same ID
    const items = [makeItem({ slot: 'finger', itemId: 200 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // Should only generate finger1 (replacing self), skip finger2 (duplicate)
    expect(combinations).toHaveLength(2); // baseline + finger1 only
    expect(combinations[1].overrideLines[0]).toMatch(/^finger1=/);
  });

  it('skips duplicate trinket in the other slot', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'trinket', itemId: 300 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // trinket1 has ID 300 — skip trinket2 with same ID
    expect(combinations).toHaveLength(2); // baseline + trinket1 only
  });

  // ── 12.29: Dual wield weapons ─────────────────────────────────────────

  it('tries main_hand drops in off_hand for dual wield specs', () => {
    // Enhancement shaman is a dual wield spec
    const profile = makeProfile({ spec: 'enhancement', className: 'shaman' });
    const items = [makeItem({ slot: 'main_hand', itemId: 501 })];
    const { combinations, meta } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations).toHaveLength(3); // baseline + main_hand + off_hand
    expect(meta.get('combo_0001')!.targetSlot).toBe('main_hand');
    expect(meta.get('combo_0002')!.targetSlot).toBe('off_hand');
  });

  it('does not try main_hand in off_hand for non-dual-wield specs', () => {
    // Fire mage is NOT a dual wield spec
    const profile = makeProfile({ spec: 'fire', className: 'mage' });
    const items = [makeItem({ slot: 'main_hand', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations).toHaveLength(2); // baseline + main_hand only
  });

  // ── Two-hand weapon handling ────────────────────────────────────────

  it('skips off_hand drops when main_hand is two-hand', () => {
    const profile = makeProfile({
      spec: 'fire',
      className: 'mage',
      gear: {
        ...makeProfile().gear,
        main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639, isTwoHand: true }],
      },
    });
    const items = [
      makeItem({ slot: 'off_hand', itemId: 501 }),
      makeItem({ key: 'head_item', slot: 'head', itemId: 502 }),
    ];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // Should skip off_hand (can't equip with two-hand), only generate head
    expect(combinations).toHaveLength(2); // baseline + head only
    expect(combinations[1].overrideLines[0]).toMatch(/^head=/);
  });

  it('clears off_hand when two-hand user swaps main_hand', () => {
    const profile = makeProfile({
      spec: 'fire',
      className: 'mage',
      gear: {
        ...makeProfile().gear,
        main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639, isTwoHand: true }],
      },
    });
    delete profile.gear.off_hand;

    const items = [makeItem({ slot: 'main_hand', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations[1].overrideLines).toHaveLength(2);
    expect(combinations[1].overrideLines[1]).toBe('off_hand=,');
  });

  it('keeps off_hand when one-hand + off-hand user swaps main_hand', () => {
    // Mage with one-hand + off-hand frill
    const profile = makeProfile({
      spec: 'fire',
      className: 'mage',
      gear: {
        ...makeProfile().gear,
        main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
        off_hand: [{ slot: 'off_hand', id: 401, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      },
    });

    const items = [makeItem({ slot: 'main_hand', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // Should NOT add off_hand=, — keep the existing off-hand
    expect(combinations[1].overrideLines).toHaveLength(1);
    expect(combinations[1].overrideLines[0]).toMatch(/^main_hand=/);
  });

  it('allows off_hand drops when character has one-hand weapon', () => {
    const profile = makeProfile({
      spec: 'fire',
      className: 'mage',
      gear: {
        ...makeProfile().gear,
        main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
        off_hand: [{ slot: 'off_hand', id: 401, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      },
    });

    const items = [makeItem({ slot: 'off_hand', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    expect(combinations).toHaveLength(2); // baseline + off_hand
    expect(combinations[1].overrideLines[0]).toMatch(/^off_hand=/);
  });

  it('dual wield: keeps off_hand weapon when swapping main_hand', () => {
    const profile = makeProfile({
      spec: 'enhancement',
      className: 'shaman',
      gear: {
        ...makeProfile().gear,
        main_hand: [{ slot: 'main_hand', id: 400, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
        off_hand: [{ slot: 'off_hand', id: 401, bonusIds: [], gemIds: [], isEquipped: true, ilvl: 639 }],
      },
    });

    const items = [makeItem({ slot: 'main_hand', itemId: 501 })];
    const { combinations } = generateDroptimizerCombinations(profile, items, DEFAULT_OPTIONS);

    // DW spec: main_hand + off_hand variations, neither should clear the other slot
    const mhCombo = combinations[1]; // main_hand slot
    expect(mhCombo.overrideLines).toHaveLength(1);
    expect(mhCombo.overrideLines[0]).toMatch(/^main_hand=/);

    const ohCombo = combinations[2]; // off_hand slot
    expect(ohCombo.overrideLines).toHaveLength(1);
    expect(ohCombo.overrideLines[0]).toMatch(/^off_hand=/);
  });

  // ── Vault socket ──────────────────────────────────────────────────────

  it('adds vault socket bonus_id when enabled', () => {
    const profile = makeProfile();
    const items = [makeItem({ slot: 'head', itemId: 501 })];
    const opts = { ...DEFAULT_OPTIONS, addVaultSocket: true };
    const { combinations } = generateDroptimizerCombinations(profile, items, opts);

    const line = combinations[1].overrideLines[0];
    expect(line).toContain('bonus_id=');
  });
});
