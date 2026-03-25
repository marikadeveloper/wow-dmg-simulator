import type { GearItem, SimcProfile } from './types';

const CLASS_KEYWORDS = new Set([
  'warrior', 'paladin', 'hunter', 'rogue', 'priest', 'deathknight',
  'shaman', 'mage', 'warlock', 'monk', 'druid', 'demonhunter', 'evoker',
]);

const GEAR_SLOTS = new Set([
  'head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist',
  'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2',
  'main_hand', 'off_hand',
]);

const IGNORE_PREFIXES = [
  '# SimC Addon',
  '# Requires SimulationCraft',
  '# Player:',
  '# Spec:',
  '# Build:',
];

const VAULT_SECTION_START = '### Weekly Reward Choices';
const VAULT_SECTION_END = '### End of Weekly Reward Choices';

/**
 * Parse a SimC addon export string into a structured SimcProfile.
 *
 * Follows docs/simc-string-format.md exactly.
 */
export function parseSimcString(input: string): SimcProfile {
  const lines = input.split('\n');
  const rawLines: string[] = [];

  const profile: SimcProfile = {
    characterName: '',
    realm: '',
    region: '',
    race: '',
    spec: '',
    level: 80,
    talentString: '',
    gear: {},
    rawLines: [],
  };

  let inVaultSection = false;
  // Tracks the most recent "# Item Name (ilvl)" comment for attaching to the next gear line
  let pendingItemMeta: { name: string; ilvl: number } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    rawLines.push(line);

    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Check for bag item lines (commented gear: "# slot=,id=...")
    if (trimmed.startsWith('#')) {
      // Track vault section boundaries
      if (trimmed.startsWith(VAULT_SECTION_START)) {
        inVaultSection = true;
        continue;
      }
      if (trimmed.startsWith(VAULT_SECTION_END)) {
        inVaultSection = false;
        continue;
      }

      // Check if this is an ignorable comment
      if (IGNORE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) continue;
      // Skip section headers (### Gear from Bags, etc.)
      if (trimmed.startsWith('###')) continue;

      // Try to parse as a bag/vault item line: "# slot=,id=..."
      const bagContent = trimmed.slice(1).trim();
      // Check for item name comment: "# Item Name (639)"
      if (!bagContent.includes('=')) {
        const metaMatch = bagContent.match(/^(.+?)\s*\((\d+)\)\s*$/);
        if (metaMatch) {
          pendingItemMeta = { name: metaMatch[1].trim(), ilvl: parseInt(metaMatch[2], 10) };
        }
        continue;
      }
      const bagItem = tryParseGearLine(bagContent, false, inVaultSection);
      if (bagItem) {
        // Attach pending name/ilvl from the preceding comment
        if (pendingItemMeta) {
          bagItem.name = pendingItemMeta.name;
          bagItem.ilvl = pendingItemMeta.ilvl;
          pendingItemMeta = null;
        }
        if (!profile.gear[bagItem.slot]) {
          profile.gear[bagItem.slot] = [];
        }
        profile.gear[bagItem.slot].push(bagItem);
      }
      continue;
    }

    // Parse key=value lines
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    // Check for class="name" line
    if (CLASS_KEYWORDS.has(key)) {
      profile.characterName = value.replace(/^"|"$/g, '');
      continue;
    }

    // Metadata lines
    switch (key) {
      case 'level':
        profile.level = parseInt(value, 10) || 80;
        continue;
      case 'race':
        profile.race = value;
        continue;
      case 'region':
        profile.region = value;
        continue;
      case 'server':
      case 'realm':
        profile.realm = value;
        continue;
      case 'spec':
        profile.spec = value;
        continue;
      case 'talents':
        profile.talentString = value;
        continue;
      case 'professions':
      case 'role':
        // Ignored lines
        continue;
    }

    // Check for equipped gear line: slot=,id=N,...
    if (GEAR_SLOTS.has(key)) {
      const gearItem = tryParseGearLine(trimmed, true);
      if (gearItem) {
        // Attach pending name/ilvl from the preceding comment
        if (pendingItemMeta) {
          gearItem.name = pendingItemMeta.name;
          gearItem.ilvl = pendingItemMeta.ilvl;
          pendingItemMeta = null;
        }
        if (!profile.gear[gearItem.slot]) {
          profile.gear[gearItem.slot] = [];
        }
        // Equipped items go first
        profile.gear[gearItem.slot].unshift(gearItem);
      }
    }
  }

  profile.rawLines = rawLines;
  return profile;
}

/**
 * Try to parse a line as a gear item.
 * Format: slot=,id=N[,bonus_id=N/N/N][,gem_id=N/N][,enchant_id=N]
 */
function tryParseGearLine(line: string, isEquipped: boolean, isVault = false): GearItem | null {
  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) return null;

  const slot = line.slice(0, eqIndex).trim();
  if (!GEAR_SLOTS.has(slot)) return null;

  // Parse key=value pairs from the rest of the line
  // The format is: slot=,id=N,bonus_id=N/N,gem_id=N/N,enchant_id=N
  const rest = line.slice(eqIndex + 1); // everything after "slot="
  const parts = rest.split(',').filter(Boolean);

  let id = 0;
  let bonusIds: number[] = [];
  let gemIds: number[] = [];
  let enchantId: number | undefined;
  let craftingQuality: number | undefined;

  for (const part of parts) {
    const partEq = part.indexOf('=');
    if (partEq === -1) continue;

    const pKey = part.slice(0, partEq).trim();
    const pVal = part.slice(partEq + 1).trim();

    switch (pKey) {
      case 'id':
        id = parseInt(pVal, 10) || 0;
        break;
      case 'bonus_id':
        bonusIds = pVal.split('/').map((v) => parseInt(v, 10)).filter((v) => !isNaN(v));
        break;
      case 'gem_id':
        gemIds = pVal.split('/').map((v) => parseInt(v, 10)).filter((v) => !isNaN(v));
        break;
      case 'enchant_id':
        enchantId = parseInt(pVal, 10) || undefined;
        break;
      case 'crafting_quality':
        craftingQuality = parseInt(pVal, 10) || undefined;
        break;
    }
  }

  if (id === 0) return null;

  return {
    slot,
    id,
    bonusIds,
    gemIds,
    enchantId,
    isEquipped,
    ...(craftingQuality != null && { craftingQuality }),
    ...(isVault && { isVault: true }),
  };
}
