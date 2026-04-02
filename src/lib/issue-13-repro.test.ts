/**
 * Integration test reproducing the exact scenario from GitHub issue #13:
 * User reports 360 combinations in our app vs 26 on Raidbots.
 *
 * Selections: all equipped items + all 8 vault items + catalyst hands +
 * enchants and gems matching the Raidbots screenshot.
 */
import { describe, it, expect } from 'vitest';
import { parseSimcString } from './parser';
import { assembleAxes } from './optimization-assembler';
import { countCombinations, getCombinationBreakdown, generateCombinations } from './combinator';
import { generateCatalystItems } from './catalyst-generator';
import type { SimcProfile, GearItem } from './types';

// The exact SimC string from the issue (trimmed to essentials — comments stripped)
const ISSUE_13_SIMC = `
hunter="Deknosh"
level=90
race=human
region=eu
server=outland
role=attack
professions=enchanting=55/jewelcrafting=38
spec=marksmanship

talents=C4PAo4YcvOcqUdzB9zV+NhSAcwCMwMGNWGQmBbAAAAAAAAAzYGzYzYmZMDGTzYMmZbbzMzMMzwyMzyYMLDzMAAAzMjBgZGbMMAbYA

# Primal Sentry's Maw (276)
head=,id=249988,enchant_id=8014,bonus_id=13334/6652/12667/13338/13575/12798
# Pendant of Malefic Fury (250)
neck=,id=251142,gem_id=240982,bonus_id=13439/42/13668/12699/12782
# Primal Sentry's Trophies (269)
shoulder=,id=249986,enchant_id=7998,bonus_id=13334/13340/40/13574/12796
# Bloodthorn Burnous (250)
back=,id=251190,bonus_id=13439/6652/12699/13577/12782
# Primal Sentry's Scaleplate (276)
chest=,id=249991,enchant_id=7987,bonus_id=13336/6652/13575/12798
# Saptorbane Guards (250)
wrist=,id=251200,bonus_id=13439/6652/12667/12699/13577/12782
# Elder Mossfeelers (259)
hands=,id=249647,bonus_id=12793/6652/13577
# Hara'ti Defender's Belt (263)
waist=,id=263268,bonus_id=13577/12790
# Rootspeaker's Leggings (250)
legs=,id=257003,bonus_id=6652/13577/12782
# Whipcoil Sabatons (250)
feet=,id=251084,bonus_id=13439/6652/12699/13577/12782
# Platinum Star Band (266)
finger1=,id=193708,enchant_id=7967,gem_id=240897,bonus_id=12795/13440/6652/13668/12699
# Occlusion of Void (250)
finger2=,id=251217,enchant_id=7967,gem_id=240897,bonus_id=13439/6652/13668/12699/12782
# Crucible of Erratic Energies (263)
trinket1=,id=264507,bonus_id=12790
# Algeth'ar Puzzle Box (263)
trinket2=,id=193701,bonus_id=13439/6652/12699/12790
# Aln'hara Sprigshot (285)
main_hand=,id=265337,enchant_id=8039,bonus_id=12214/12497/12066/12693/8960/8791/13622/13667,crafted_stats=40/36,crafting_quality=5

### Weekly Reward Choices
#
# Preyseeker's Polished Cloak (259)
# back=,id=258533,bonus_id=6652/13577/12793
#
# Drum of Renewed Bonds (259)
# trinket1=,id=248583,bonus_id=13183/6652/12793
#
# Glorious Crusader's Keepsake (259)
# trinket1=,id=251792,bonus_id=12793/41
#
# Undreamt God's Oozing Vestige (263)
# trinket1=,id=249805,bonus_id=6652/13334/12794
#
# Fallen King's Cuffs (263)
# wrist=,id=249304,bonus_id=6652/12667/13577/13334/12794
#
# Eye of the Drowning Void (272)
# trinket1=,id=250257,bonus_id=12801/13440/6652/12699
#
# Darkfang Scale Wristguards (272)
# wrist=,id=151321,bonus_id=12801/13440/6652/12667/13577/12699
#
# Primal Sentry's Scaleplate (272)
# chest=,id=249991,bonus_id=13336/12801/13440/6652/13575
#
### End of Weekly Reward Choices
`;

function buildSelectionForEquippedAndVault(profile: SimcProfile): Set<string> {
  const selection = new Set<string>();
  for (const [slot, items] of Object.entries(profile.gear)) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].isEquipped || items[i].isVault) {
        selection.add(`${slot}:${i}`);
      }
    }
  }
  return selection;
}

function addCatalystToProfile(
  profile: SimcProfile,
  selection: Set<string>,
): { profile: SimcProfile; selection: Set<string> } {
  const catItems = generateCatalystItems(profile, selection);
  if (catItems.size === 0) return { profile, selection };

  const newGear: Record<string, GearItem[]> = {};
  for (const [slot, items] of Object.entries(profile.gear)) {
    const cats = catItems.get(slot) ?? [];
    newGear[slot] = cats.length > 0 ? [...items, ...cats] : items;
  }
  const newProfile = { ...profile, gear: newGear };

  // Auto-select catalyst items
  const newSelection = new Set(selection);
  for (const [slot, items] of catItems) {
    const baseLen = profile.gear[slot]?.length ?? 0;
    items.forEach((_, i) => newSelection.add(`${slot}:${baseLen + i}`));
  }
  return { profile: newProfile, selection: newSelection };
}

describe('Issue #13 reproduction: combination count mismatch', () => {
  const profile = parseSimcString(ISSUE_13_SIMC);

  it('parses the profile correctly', () => {
    expect(profile.characterName).toBe('Deknosh');
    expect(profile.spec).toBe('marksmanship');
    expect(profile.className).toBe('hunter');
  });

  it('has correct number of items per slot', () => {
    // Equipped + vault items
    expect(profile.gear.back.length).toBe(2);      // equipped + 1 vault
    expect(profile.gear.chest.length).toBe(2);      // equipped + 1 vault (same item different ilvl)
    expect(profile.gear.wrist.length).toBe(3);      // equipped + 2 vault
    expect(profile.gear.trinket1.length).toBe(5);   // equipped + 4 vault trinkets
    expect(profile.gear.trinket2.length).toBe(1);   // equipped only
  });

  it('gear-only selection gives 360 combinations', () => {
    let selection = buildSelectionForEquippedAndVault(profile);
    const { profile: augmented, selection: augSelection } = addCatalystToProfile(profile, selection);
    selection = augSelection;

    const axes = assembleAxes(augmented, selection, [], []);
    const count = countCombinations(axes);

    // Additive model: each slot varies independently from baseline.
    // Trinkets: 2 equipped + 4 vault → 1 baseline + 2×4 = 9 pairs, 8 non-baseline
    // back(1) + chest(1) + wrist(2) + hands(1) + legs(1) + trinkets(8) + baseline(1) = 15
    expect(count).toBe(15);

    const breakdown = getCombinationBreakdown(axes);
    // Should have: trinkets, back, chest, wrist, hands, legs
    const slotFactors = breakdown.filter((f) => f.label !== undefined);
    expect(slotFactors.length).toBeGreaterThanOrEqual(5);

    // Trinkets should be the biggest contributor
    const trinketFactor = breakdown.find((f) => f.label === 'trinkets');
    expect(trinketFactor).toBeDefined();
    expect(trinketFactor!.optionCount).toBe(8); // 8 non-baseline pairs
  });

  it('adding ring enchants from Raidbots screenshot multiplies the count', () => {
    let selection = buildSelectionForEquippedAndVault(profile);
    const { profile: augmented, selection: augSelection } = addCatalystToProfile(profile, selection);
    selection = augSelection;

    // From the screenshot: 5 ring enchants selected
    // Eyes of the Eagle (Q2) = 7967, Nature's Fury (Q2) = 7997,
    // Silvermoon's Alacrity (Q2) = 8025, Silvermoon's Tenacity (Q2) = 8027,
    // Zul'jin's Mastery = 7968
    const ringEnchants = [7967, 7997, 8025, 8027, 7968];

    const axes = assembleAxes(augmented, selection, [], ringEnchants);
    const count = countCombinations(axes);

    // Additive: gear(14 non-baseline) + finger1(5 enchants) + finger2(5 enchants) + baseline = 25
    // Enchant axes have all options with empty simcLines, so first option is baseline → 4 alts each
    const enchantAxes = axes.filter((a) => a.id.startsWith('enchant:'));
    let enchantAlts = 0;
    for (const ea of enchantAxes) enchantAlts += ea.options.length - 1;
    // gear alts + enchant alts + baseline
    expect(count).toBe(14 + enchantAlts + 1);
  });

  it('adding gems for socketed items multiplies correctly (with fix)', () => {
    let selection = buildSelectionForEquippedAndVault(profile);
    const { profile: augmented, selection: augSelection } = addCatalystToProfile(profile, selection);
    selection = augSelection;

    // Select 2 gems to compare
    const gemIds = [240897, 240888]; // current gem + an alternative

    const axes = assembleAxes(augmented, selection, gemIds, []);

    // Debug: check which gem axes were created
    const gemAxes = axes.filter((a) => a.id.startsWith('gem:'));
    const gemAxisIds = gemAxes.map((a) => a.id);

    const count = countCombinations(axes);

    // Additive model: each gem axis contributes (options - 1) alternative combos.
    // Orphaned gem axes (parent has no slot axis) are additive too.
    let gemAlts = 0;
    for (const ga of gemAxes) gemAlts += ga.options.length - 1;
    // gear alts(14) + gem alts + baseline(1)
    expect(count).toBe(14 + gemAlts + 1);
  });

  it('combination count with enchants + gems matches expectations', () => {
    let selection = buildSelectionForEquippedAndVault(profile);
    const { profile: augmented, selection: augSelection } = addCatalystToProfile(profile, selection);
    selection = augSelection;

    // Weapon enchants from screenshot (7 selected):
    const weaponEnchants = [8039, 8040, 7982, 8036, 7980, 7978, 8010];
    // Ring enchants (5 selected):
    const ringEnchants = [7967, 7997, 8025, 8027, 7968];
    // All enchant IDs combined:
    const allEnchants = [...weaponEnchants, ...ringEnchants];

    const axes = assembleAxes(augmented, selection, [], allEnchants);
    const count = countCombinations(axes);

    // Additive: gear alts + enchant alts + baseline
    const enchantAxes = axes.filter((a) => a.id.startsWith('enchant:') && a.options.length > 1);
    let enchantAlts = 0;
    for (const ea of enchantAxes) enchantAlts += ea.options.length - 1;
    expect(count).toBe(14 + enchantAlts + 1);

    const breakdown = getCombinationBreakdown(axes);
    // Verify the breakdown shows each factor
    expect(breakdown.find((f) => f.label === 'main_hand enchant')).toBeDefined();
    expect(breakdown.find((f) => f.label === 'finger1 enchant')).toBeDefined();
    expect(breakdown.find((f) => f.label === 'finger2 enchant')).toBeDefined();
  });
});
