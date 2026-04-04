import { describe, it, expect } from 'vitest';
import { validateSimInput, hasErrors } from './validate-sim-input';
import type { SimcProfile } from './types';
import type { SimSettingsValues } from '../components/SimSettingsPanel';

const validProfile: SimcProfile = {
  characterName: 'Thrall',
  realm: 'draenor',
  region: 'eu',
  race: 'orc',
  className: 'shaman',
  spec: 'enhancement',
  level: 80,
  talentString: 'AAAA',
  gear: {
    head: [{ slot: 'head', id: 1, bonusIds: [], gemIds: [], isEquipped: true }],
    neck: [{ slot: 'neck', id: 2, bonusIds: [], gemIds: [], isEquipped: true }],
    shoulder: [{ slot: 'shoulder', id: 3, bonusIds: [], gemIds: [], isEquipped: true }],
    back: [{ slot: 'back', id: 4, bonusIds: [], gemIds: [], isEquipped: true }],
    chest: [{ slot: 'chest', id: 5, bonusIds: [], gemIds: [], isEquipped: true }],
    wrist: [{ slot: 'wrist', id: 6, bonusIds: [], gemIds: [], isEquipped: true }],
    hands: [{ slot: 'hands', id: 7, bonusIds: [], gemIds: [], isEquipped: true }],
    waist: [{ slot: 'waist', id: 8, bonusIds: [], gemIds: [], isEquipped: true }],
    legs: [{ slot: 'legs', id: 9, bonusIds: [], gemIds: [], isEquipped: true }],
    feet: [{ slot: 'feet', id: 10, bonusIds: [], gemIds: [], isEquipped: true }],
    finger1: [{ slot: 'finger1', id: 11, bonusIds: [], gemIds: [], isEquipped: true }],
    finger2: [{ slot: 'finger2', id: 12, bonusIds: [], gemIds: [], isEquipped: true }],
    trinket1: [{ slot: 'trinket1', id: 13, bonusIds: [], gemIds: [], isEquipped: true }],
    trinket2: [{ slot: 'trinket2', id: 14, bonusIds: [], gemIds: [], isEquipped: true }],
    main_hand: [{ slot: 'main_hand', id: 15, bonusIds: [], gemIds: [], isEquipped: true }],
    off_hand: [{ slot: 'off_hand', id: 16, bonusIds: [], gemIds: [], isEquipped: true }],
  },
  rawLines: ['shaman="Thrall"'],
};

const validSettings: SimSettingsValues = {
  fightStyle: 'Patchwerk',
  maxTime: 300,
  varyCombatLength: 20,
  numEnemies: 1,
  iterations: 10000,
  threads: 7,
  useTargetError: false,
  targetError: 0.1,
  potion: '',
  food: '',
  flask: '',
  augmentation: '',
  weaponRune: '',
  raidBuffs: { bloodlust: true },
  crucibleModes: {},
  smartSimEnabled: null,
  smartSimTargetErrors: null,
};

describe('validateSimInput', () => {
  it('returns no issues for a valid profile and settings', () => {
    const issues = validateSimInput(validProfile, validSettings);
    expect(issues).toHaveLength(0);
  });

  describe('profile validation', () => {
    it('errors on missing character name', () => {
      const profile = { ...validProfile, characterName: '' };
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('character name'))).toBeTruthy();
    });

    it('errors on missing spec', () => {
      const profile = { ...validProfile, spec: '' };
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('specialization'))).toBeTruthy();
    });

    it('errors on missing talent string', () => {
      const profile = { ...validProfile, talentString: '' };
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('talent'))).toBeTruthy();
    });

    it('errors on no equipped gear', () => {
      const profile = { ...validProfile, gear: {} };
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('No equipped gear'))).toBeTruthy();
    });

    it('warns on incomplete gear (few slots)', () => {
      const profile = {
        ...validProfile,
        spec: 'marksmanship', // non-dual-wield so missing off_hand is not an error
        gear: {
          head: [{ slot: 'head', id: 1, bonusIds: [], gemIds: [], isEquipped: true }],
          chest: [{ slot: 'chest', id: 2, bonusIds: [], gemIds: [], isEquipped: true }],
        },
      };
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(false);
      expect(issues.find((i) => i.message.includes('incomplete'))).toBeTruthy();
    });

    it('errors when dual-wield spec has 1H main-hand and no off-hand', () => {
      const profile: SimcProfile = {
        ...validProfile,
        className: 'warrior',
        spec: 'fury',
        gear: {
          ...validProfile.gear,
          // 1H weapon (isTwoHand not set = defaults to 1H)
          main_hand: [{ slot: 'main_hand', id: 15, bonusIds: [], gemIds: [], isEquipped: true }],
          off_hand: undefined as unknown as typeof validProfile.gear.off_hand,
        },
      };
      delete (profile.gear as Record<string, unknown>).off_hand;
      const issues = validateSimInput(profile, validSettings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('off-hand weapon'))).toBeTruthy();
    });

    it('does not error when dual-wield spec has 2H main-hand and no off-hand', () => {
      const profile: SimcProfile = {
        ...validProfile,
        className: 'warrior',
        spec: 'fury',
        gear: {
          ...validProfile.gear,
          main_hand: [{ slot: 'main_hand', id: 15, bonusIds: [], gemIds: [], isEquipped: true, isTwoHand: true }],
          off_hand: undefined as unknown as typeof validProfile.gear.off_hand,
        },
      };
      delete (profile.gear as Record<string, unknown>).off_hand;
      const issues = validateSimInput(profile, validSettings);
      expect(issues.find((i) => i.message.includes('off-hand weapon'))).toBeFalsy();
    });

    it('does not error when dual-wield spec has an off-hand', () => {
      const profile: SimcProfile = {
        ...validProfile,
        className: 'warrior',
        spec: 'fury',
      };
      const issues = validateSimInput(profile, validSettings);
      expect(issues.find((i) => i.message.includes('off-hand weapon'))).toBeFalsy();
    });

    it('does not error when non-dual-wield spec has no off-hand', () => {
      const profile: SimcProfile = {
        ...validProfile,
        spec: 'marksmanship',
        gear: { ...validProfile.gear },
      };
      delete (profile.gear as Record<string, unknown>).off_hand;
      const issues = validateSimInput(profile, validSettings);
      expect(issues.find((i) => i.message.includes('off-hand weapon'))).toBeFalsy();
    });
  });

  describe('settings validation', () => {
    it('errors on unknown fight style', () => {
      const settings = { ...validSettings, fightStyle: 'BossRush' };
      const issues = validateSimInput(validProfile, settings);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.find((i) => i.message.includes('fight style'))).toBeTruthy();
    });

    it('errors on fight length out of range', () => {
      const tooShort = validateSimInput(validProfile, { ...validSettings, maxTime: 5 });
      expect(hasErrors(tooShort)).toBe(true);

      const tooLong = validateSimInput(validProfile, { ...validSettings, maxTime: 1000 });
      expect(hasErrors(tooLong)).toBe(true);
    });

    it('errors on variance out of range', () => {
      const issues = validateSimInput(validProfile, { ...validSettings, varyCombatLength: -5 });
      expect(hasErrors(issues)).toBe(true);
    });

    it('errors on enemies out of range', () => {
      const zero = validateSimInput(validProfile, { ...validSettings, numEnemies: 0 });
      expect(hasErrors(zero)).toBe(true);

      const tooMany = validateSimInput(validProfile, { ...validSettings, numEnemies: 25 });
      expect(hasErrors(tooMany)).toBe(true);
    });

    it('errors on iterations out of range', () => {
      const tooFew = validateSimInput(validProfile, { ...validSettings, iterations: 100 });
      expect(hasErrors(tooFew)).toBe(true);

      const tooMany = validateSimInput(validProfile, { ...validSettings, iterations: 200000 });
      expect(hasErrors(tooMany)).toBe(true);
    });

    it('errors on target error out of range', () => {
      const settings = { ...validSettings, useTargetError: true, targetError: 0 };
      const issues = validateSimInput(validProfile, settings);
      expect(hasErrors(issues)).toBe(true);
    });

    it('errors on zero threads', () => {
      const issues = validateSimInput(validProfile, { ...validSettings, threads: 0 });
      expect(hasErrors(issues)).toBe(true);
    });
  });

  describe('warnings', () => {
    it('warns when DungeonSlice used with custom enemy count', () => {
      const settings = { ...validSettings, fightStyle: 'DungeonSlice', numEnemies: 5 };
      const issues = validateSimInput(validProfile, settings);
      expect(hasErrors(issues)).toBe(false);
      expect(issues.find((i) => i.message.includes('Dungeon Slice'))).toBeTruthy();
    });

    it('warns on low iterations', () => {
      const settings = { ...validSettings, iterations: 2000 };
      const issues = validateSimInput(validProfile, settings);
      expect(hasErrors(issues)).toBe(false);
      expect(issues.find((i) => i.message.includes('Low iteration'))).toBeTruthy();
    });

    it('warns on 0% variance with long fights', () => {
      const settings = { ...validSettings, varyCombatLength: 0, maxTime: 300 };
      const issues = validateSimInput(validProfile, settings);
      expect(hasErrors(issues)).toBe(false);
      expect(issues.find((i) => i.message.includes('variance'))).toBeTruthy();
    });

    it('does not warn on 0% variance with short fights', () => {
      const settings = { ...validSettings, varyCombatLength: 0, maxTime: 60 };
      const issues = validateSimInput(validProfile, settings);
      expect(issues.find((i) => i.message.includes('variance'))).toBeFalsy();
    });

    it('warns when enchantable slot has items with and without enchants', () => {
      const profile: SimcProfile = {
        ...validProfile,
        gear: {
          ...validProfile.gear,
          finger1: [
            { slot: 'finger1', id: 11, bonusIds: [], gemIds: [], isEquipped: true, enchantId: 7340 },
            { slot: 'finger1', id: 12, bonusIds: [], gemIds: [], isEquipped: false },
          ],
        },
      };
      const issues = validateSimInput(profile, validSettings);
      expect(issues.find((i) => i.message.includes('enchant') && i.severity === 'warning')).toBeTruthy();
    });

    it('does not warn about enchants when all items in slot have enchants', () => {
      const profile: SimcProfile = {
        ...validProfile,
        gear: {
          ...validProfile.gear,
          finger1: [
            { slot: 'finger1', id: 11, bonusIds: [], gemIds: [], isEquipped: true, enchantId: 7340 },
            { slot: 'finger1', id: 12, bonusIds: [], gemIds: [], isEquipped: false, enchantId: 7341 },
          ],
        },
      };
      const issues = validateSimInput(profile, validSettings);
      expect(issues.find((i) => i.message.includes('enchant') && i.severity === 'warning')).toBeFalsy();
    });
  });

  describe('hasErrors', () => {
    it('returns false for warnings only', () => {
      expect(hasErrors([{ severity: 'warning', message: 'test' }])).toBe(false);
    });

    it('returns true when any error present', () => {
      expect(
        hasErrors([
          { severity: 'warning', message: 'w' },
          { severity: 'error', message: 'e' },
        ]),
      ).toBe(true);
    });

    it('returns false for empty array', () => {
      expect(hasErrors([])).toBe(false);
    });
  });
});
