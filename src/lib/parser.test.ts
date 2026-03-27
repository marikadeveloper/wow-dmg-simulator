import { describe, it, expect } from 'vitest';
import { parseSimcString } from './parser';

// Full example from docs/simc-string-format.md
const FULL_EXPORT = `# SimC Addon 11.0.5-01
# Requires SimulationCraft 1210-01 or newer

# Player: Thrall - Draenor - EU
# Spec: Enhancement Shaman
# Build: 11.0.5.57400

shaman="Thrall"
level=80
race=orc
region=eu
server=draenor
role=attack
professions=Blacksmithing=100/Leatherworking=100

spec=enhancement
talents=BYQAAAAAAAAAAAAAAAAAAAAAAgUSShQSQJRSSJkQSJAAAAAAAAgUSShQSSRSSJkQAJAAAAA

head=,id=235602,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
neck=,id=235610,bonus_id=10355/10257/1498/8767/10271,enchant_id=7361
shoulder=,id=235604,bonus_id=10355/10257/1498/8767/10271
back=,id=235613,bonus_id=10355/10257/1498/8767/10271,enchant_id=7364
chest=,id=235600,bonus_id=10355/10257/1498/8767/10271,enchant_id=7392
wrist=,id=235609,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7356
hands=,id=235603,bonus_id=10355/10257/1498/8767/10271
waist=,id=235607,bonus_id=10355/10257/1498/8767/10271,gem_id=213743
legs=,id=235605,bonus_id=10355/10257/1498/8767/10271,enchant_id=7390
feet=,id=235608,bonus_id=10355/10257/1498/8767/10271,enchant_id=7424
finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340
finger2=,id=235615,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340
trinket1=,id=235616,bonus_id=10355/10257/1498/8767/10271
trinket2=,id=235617,bonus_id=10355/10257/1498/8767/10271
main_hand=,id=235620,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444
off_hand=,id=235621,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444

# head=,id=229379,bonus_id=10390/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
# head=,id=219332,bonus_id=10390/10257/1498/8767/10271
# trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271
# trinket1=,id=219314,bonus_id=10390/10257/1498/8767/10271
# finger1=,id=225639,bonus_id=10390/10257/1498/8767/10271,enchant_id=7340`;

describe('parseSimcString', () => {
  describe('metadata extraction', () => {
    it('extracts character name from class line', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.characterName).toBe('Thrall');
    });

    it('extracts level', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.level).toBe(80);
    });

    it('extracts race', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.race).toBe('orc');
    });

    it('extracts region', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.region).toBe('eu');
    });

    it('extracts realm from server= line', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.realm).toBe('draenor');
    });

    it('extracts spec', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.spec).toBe('enhancement');
    });

    it('extracts talent string', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.talentString).toBe(
        'BYQAAAAAAAAAAAAAAAAAAAAAAgUSShQSQJRSSJkQSJAAAAAAAAgUSShQSSRSSJkQAJAAAAA',
      );
    });
  });

  describe('equipped item parsing', () => {
    it('parses all 16 equipped gear slots', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const equippedSlots = Object.keys(profile.gear).filter((slot) =>
        profile.gear[slot].some((item) => item.isEquipped),
      );
      expect(equippedSlots).toHaveLength(16);
    });

    it('parses item id', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const head = profile.gear.head.find((i) => i.isEquipped);
      expect(head?.id).toBe(235602);
    });

    it('parses bonus_id as number array', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const head = profile.gear.head.find((i) => i.isEquipped);
      expect(head?.bonusIds).toEqual([10355, 10257, 1498, 8767, 10271]);
    });

    it('parses gem_id as number array', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const head = profile.gear.head.find((i) => i.isEquipped);
      expect(head?.gemIds).toEqual([213743]);
    });

    it('parses enchant_id', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const head = profile.gear.head.find((i) => i.isEquipped);
      expect(head?.enchantId).toBe(7359);
    });

    it('marks equipped items as isEquipped: true', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const head = profile.gear.head.find((i) => i.isEquipped);
      expect(head?.isEquipped).toBe(true);
    });
  });

  describe('bag item parsing', () => {
    it('parses bag items with isEquipped: false', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const bagHeads = profile.gear.head.filter((i) => !i.isEquipped);
      expect(bagHeads.length).toBe(2);
      expect(bagHeads[0].isEquipped).toBe(false);
    });

    it('parses bag item ids correctly', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const bagHeads = profile.gear.head.filter((i) => !i.isEquipped);
      const ids = bagHeads.map((i) => i.id).sort();
      expect(ids).toEqual([219332, 229379]);
    });

    it('parses bag trinkets', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const bagTrinkets = profile.gear.trinket1.filter((i) => !i.isEquipped);
      expect(bagTrinkets.length).toBe(2);
    });

    it('parses bag ring with enchant', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const bagRings = profile.gear.finger1.filter((i) => !i.isEquipped);
      expect(bagRings.length).toBe(1);
      expect(bagRings[0].enchantId).toBe(7340);
    });
  });

  describe('multi-value fields', () => {
    it('handles multiple bonus_ids', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const trinket = profile.gear.trinket1.find((i) => i.isEquipped);
      expect(trinket?.bonusIds.length).toBe(5);
    });

    it('handles single gem_id', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const wrist = profile.gear.wrist.find((i) => i.isEquipped);
      expect(wrist?.gemIds).toEqual([213743]);
    });
  });

  describe('missing optional fields', () => {
    it('does not throw on items without enchant', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const shoulder = profile.gear.shoulder.find((i) => i.isEquipped);
      expect(shoulder?.enchantId).toBeUndefined();
    });

    it('does not throw on items without gems', () => {
      const profile = parseSimcString(FULL_EXPORT);
      const shoulder = profile.gear.shoulder.find((i) => i.isEquipped);
      expect(shoulder?.gemIds).toEqual([]);
    });

    it('does not throw on items without bonus_id', () => {
      const simpleProfile = `shaman="Test"\nlevel=80\nrace=orc\nregion=us\nserver=test\nspec=enhancement\ntalents=AAAA\nhead=,id=12345`;
      const profile = parseSimcString(simpleProfile);
      const head = profile.gear.head?.[0];
      expect(head?.bonusIds).toEqual([]);
    });

    it('parses crafting_quality on crafted items', () => {
      const simpleProfile = `shaman="Test"\nlevel=80\nrace=orc\nregion=us\nserver=test\nspec=enhancement\ntalents=AAAA\nwrist=,id=239648,bonus_id=12214/12497,crafted_stats=32/49,crafting_quality=5`;
      const profile = parseSimcString(simpleProfile);
      const wrist = profile.gear.wrist?.[0];
      expect(wrist?.craftingQuality).toBe(5);
    });

    it('omits craftingQuality for non-crafted items', () => {
      const simpleProfile = `shaman="Test"\nlevel=80\nrace=orc\nregion=us\nserver=test\nspec=enhancement\ntalents=AAAA\nhead=,id=266429,bonus_id=13577/12790`;
      const profile = parseSimcString(simpleProfile);
      const head = profile.gear.head?.[0];
      expect(head?.craftingQuality).toBeUndefined();
    });
  });

  describe('rawLines preservation', () => {
    it('stores all original lines in rawLines', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.rawLines.length).toBeGreaterThan(0);
      expect(profile.rawLines.some((l) => l.includes('shaman="Thrall"'))).toBe(true);
    });
  });

  describe('ignored lines', () => {
    it('ignores professions= lines', () => {
      const profile = parseSimcString(FULL_EXPORT);
      // professions should not appear anywhere in parsed data
      expect(profile.characterName).toBe('Thrall');
    });

    it('ignores role= lines', () => {
      const profile = parseSimcString(FULL_EXPORT);
      expect(profile.characterName).toBe('Thrall');
    });

    it('ignores header comments', () => {
      const profile = parseSimcString(FULL_EXPORT);
      // Should not have any gear items from "# SimC Addon..." lines
      expect(profile.characterName).toBe('Thrall');
    });
  });

  describe('vault item parsing', () => {
    const VAULT_EXPORT = `shaman="Thrall"
level=80
race=orc
region=eu
server=draenor
spec=enhancement
talents=AAAA

head=,id=235602,bonus_id=10355/10257/1498/8767/10271

# head=,id=229379,bonus_id=10390/10257/1498/8767/10271

### Weekly Reward Choices
# Helm of Valor (639)
# head=,id=230001,bonus_id=10355/10257/1498/8767/10271
# trinket1=,id=230002,bonus_id=10355/10257/1498/8767/10271
### End of Weekly Reward Choices

# trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271`;

    it('parses vault items with isVault: true', () => {
      const profile = parseSimcString(VAULT_EXPORT);
      const vaultHeads = profile.gear.head.filter((i) => i.isVault);
      expect(vaultHeads).toHaveLength(1);
      expect(vaultHeads[0].id).toBe(230001);
      expect(vaultHeads[0].isVault).toBe(true);
      expect(vaultHeads[0].isEquipped).toBe(false);
    });

    it('parses multiple vault items across slots', () => {
      const profile = parseSimcString(VAULT_EXPORT);
      const vaultTrinkets = profile.gear.trinket1.filter((i) => i.isVault);
      expect(vaultTrinkets).toHaveLength(1);
      expect(vaultTrinkets[0].id).toBe(230002);
    });

    it('does not mark bag items outside vault section as vault', () => {
      const profile = parseSimcString(VAULT_EXPORT);
      const bagHeads = profile.gear.head.filter((i) => !i.isEquipped && !i.isVault);
      expect(bagHeads).toHaveLength(1);
      expect(bagHeads[0].id).toBe(229379);
    });

    it('does not mark items after vault end marker as vault', () => {
      const profile = parseSimcString(VAULT_EXPORT);
      const bagTrinkets = profile.gear.trinket1.filter((i) => !i.isEquipped && !i.isVault);
      expect(bagTrinkets).toHaveLength(1);
      expect(bagTrinkets[0].id).toBe(225652);
    });

    it('skips item name comments inside vault section', () => {
      const profile = parseSimcString(VAULT_EXPORT);
      // "Helm of Valor (639)" should not produce a gear item
      const allHeads = profile.gear.head;
      expect(allHeads).toHaveLength(3); // equipped + bag + vault
    });
  });

  describe('edge cases', () => {
    it('handles realm= as alias for server=', () => {
      const input = `shaman="Test"\nlevel=80\nrace=orc\nregion=us\nrealm=testrealm\nspec=enhancement\ntalents=AAAA\nhead=,id=12345`;
      const profile = parseSimcString(input);
      expect(profile.realm).toBe('testrealm');
    });

    it('handles empty input gracefully', () => {
      const profile = parseSimcString('');
      expect(profile.characterName).toBe('');
      expect(Object.keys(profile.gear)).toHaveLength(0);
    });
  });

  describe('item name and ilvl from comments', () => {
    it('parses name and ilvl from preceding comment for equipped items', () => {
      const input = `mage="Test"\nlevel=80\nrace=human\nregion=us\nserver=test\nspec=frost\ntalents=AAAA\n# Handwraps of the Ascended (263)\nhands=,id=151300,bonus_id=13439/6652/13577/12699/12790`;
      const profile = parseSimcString(input);
      const item = profile.gear.hands[0];
      expect(item.name).toBe('Handwraps of the Ascended');
      expect(item.ilvl).toBe(263);
    });

    it('parses name and ilvl from preceding comment for bag items', () => {
      const input = `mage="Test"\nlevel=80\nrace=human\nregion=us\nserver=test\nspec=frost\ntalents=AAAA\nhands=,id=100\n# Experimental Safety Gloves (246)\n# hands=,id=193713,bonus_id=12785`;
      const profile = parseSimcString(input);
      const bagItem = profile.gear.hands.find((i) => i.id === 193713);
      expect(bagItem?.name).toBe('Experimental Safety Gloves');
      expect(bagItem?.ilvl).toBe(246);
    });

    it('parses name and ilvl for vault items', () => {
      const input = `mage="Test"\nlevel=80\nrace=human\nregion=us\nserver=test\nspec=frost\ntalents=AAAA\nhead=,id=100\n### Weekly Reward Choices\n# Voidbreaker's Veil (259)\n# head=,id=250060,bonus_id=13338/6652\n### End of Weekly Reward Choices`;
      const profile = parseSimcString(input);
      const vaultItem = profile.gear.head.find((i) => i.id === 250060);
      expect(vaultItem?.name).toBe("Voidbreaker's Veil");
      expect(vaultItem?.ilvl).toBe(259);
      expect(vaultItem?.isVault).toBe(true);
    });

    it('does not set name/ilvl when no preceding comment exists', () => {
      const input = `mage="Test"\nlevel=80\nrace=human\nregion=us\nserver=test\nspec=frost\ntalents=AAAA\nhands=,id=151300,bonus_id=13439`;
      const profile = parseSimcString(input);
      const item = profile.gear.hands[0];
      expect(item.name).toBeUndefined();
      expect(item.ilvl).toBeUndefined();
    });
  });

  describe('upgrade_currencies parsing', () => {
    it('parses Dawncrest currencies from the Additional Character Info section', () => {
      const input = [
        'mage="Test"',
        'level=90',
        'race=human',
        'region=us',
        'server=test',
        'spec=frost',
        'talents=AAAA',
        'head=,id=100,bonus_id=12793',
        '### Additional Character Info',
        '#',
        '# upgrade_currencies=c:3347:30/c:3383:310/c:3341:290/c:1792:1868/c:3345:180/i:232875:2',
      ].join('\n');

      const profile = parseSimcString(input);
      expect(profile.upgradeCurrencies).toBeDefined();
      // 3347 = Myth Dawncrest
      expect(profile.upgradeCurrencies!.myth).toBe(30);
      // 3383 = Adventurer Dawncrest
      expect(profile.upgradeCurrencies!.adventurer).toBe(310);
      // 3341 = Veteran Dawncrest
      expect(profile.upgradeCurrencies!.veteran).toBe(290);
      // 3345 = Hero Dawncrest
      expect(profile.upgradeCurrencies!.hero).toBe(180);
      // 1792 = Honor (not a crest), should not appear
      expect(profile.upgradeCurrencies!['1792']).toBeUndefined();
      // i:232875:2 = item entry, should be ignored
      expect(profile.upgradeCurrencies!['232875']).toBeUndefined();
    });

    it('sums capped and non-capped variants of the same crest', () => {
      const input = [
        'mage="Test"',
        'level=90',
        'race=human',
        'region=us',
        'server=test',
        'spec=frost',
        'talents=AAAA',
        'head=,id=100,bonus_id=12793',
        '# upgrade_currencies=c:3347:30/c:3348:20',
      ].join('\n');

      const profile = parseSimcString(input);
      // 3347 (capped) + 3348 (non-capped) = both Myth Dawncrest
      expect(profile.upgradeCurrencies!.myth).toBe(50);
    });

    it('returns undefined when no upgrade_currencies line exists', () => {
      const input = `mage="Test"\nlevel=90\nrace=human\nregion=us\nserver=test\nspec=frost\ntalents=AAAA\nhead=,id=100,bonus_id=12793`;
      const profile = parseSimcString(input);
      expect(profile.upgradeCurrencies).toBeUndefined();
    });
  });
});
