// ─────────────────────────────────────────────────────────────────────────────
// season-config.ts — THE ONLY FILE to edit for a new season.
//
// All seasonal data lives here. Every other module imports from this file.
// After editing, run: pnpm season:validate
// Full instructions: docs/updating-seasons.md
// ─────────────────────────────────────────────────────────────────────────────

// ── Season metadata ──────────────────────────────────────────────────────────

export interface SeasonInfo {
  expansion: string;
  season: number;
  label: string;
  startDate: string; // ISO date
  maxIlvl: number;
  simcBranch: string; // GitHub branch name for SimC source
}

export const CURRENT_SEASON: SeasonInfo = {
  expansion: 'Midnight',
  season: 1,
  label: 'Midnight Season 1',
  startDate: '2026-03-17',
  maxIlvl: 289,
  simcBranch: 'midnight',
};

// ── Gear tracks ──────────────────────────────────────────────────────────────

export interface GearTrack {
  name: string;
  bonusId: number; // track marker bonus_id — 0 = TBD
  ilvlRange: [number, number]; // [min, max]
  source: string; // human-readable source for UI
}

export const GEAR_TRACKS: GearTrack[] = [
  {
    name: 'Myth',
    bonusId: 0, // TBD — find from SimC source
    ilvlRange: [276, 289],
    source: 'Mythic Raid / M+10 vault',
  },
  {
    name: 'Hero',
    bonusId: 0, // TBD
    ilvlRange: [263, 276],
    source: 'Heroic Raid / M+6–9',
  },
  {
    name: 'Champion',
    bonusId: 0, // TBD
    ilvlRange: [250, 263],
    source: 'Normal Raid / M0–M+5',
  },
  {
    name: 'Veteran',
    bonusId: 0, // TBD
    ilvlRange: [237, 250],
    source: 'Heroic Dungeon / Hard Prey',
  },
  {
    name: 'Adventurer',
    bonusId: 0, // TBD
    ilvlRange: [224, 237],
    source: 'World events / Normal Prey',
  },
];

// ── Socket bonus_id ──────────────────────────────────────────────────────────

/** The bonus_id that adds an extra socket to an item. 0 = TBD for this season. */
export const SOCKET_BONUS_ID = 0; // TBD — was 6935 in TWW S2, verify for Midnight

// ── Gem presets ──────────────────────────────────────────────────────────────

export interface GemPreset {
  id: number; // SimC gem_id
  name: string;
  stat: string; // primary stat it gives
  color: 'prismatic';
}

export const GEM_PRESETS: GemPreset[] = [
  { id: 213743, name: 'Masterful Ysemerald', stat: 'Mastery', color: 'prismatic' },
  { id: 213744, name: 'Quick Ysemerald', stat: 'Haste', color: 'prismatic' },
  { id: 213746, name: 'Energized Ysemerald', stat: 'Versatility', color: 'prismatic' },
  { id: 213747, name: 'Crafty Ysemerald', stat: 'Crit', color: 'prismatic' },
];

// ── Enchant presets ──────────────────────────────────────────────────────────

export interface EnchantPreset {
  id: number; // SimC enchant_id
  name: string;
  slot: string; // target slot category: "finger", "back", "chest", etc.
  stat: string; // primary stat for display
}

export const ENCHANT_PRESETS: EnchantPreset[] = [
  // Rings
  { id: 7340, name: 'Enchant Ring – Cursed Devotion', slot: 'finger', stat: 'Crit' },
  { id: 7341, name: 'Enchant Ring – Devotion of Mastery', slot: 'finger', stat: 'Mastery' },
  { id: 7342, name: 'Enchant Ring – Devotion of Haste', slot: 'finger', stat: 'Haste' },
  { id: 7343, name: 'Enchant Ring – Devotion of Versatility', slot: 'finger', stat: 'Versatility' },
  // Back
  { id: 7364, name: 'Enchant Cloak – Chant of Winged Grace', slot: 'back', stat: 'Avoidance' },
  // Chest
  { id: 7392, name: 'Enchant Chest – Crystalline Radiance', slot: 'chest', stat: 'Stats' },
  // Wrist
  { id: 7356, name: 'Enchant Bracer – Chant of Armored Avoidance', slot: 'wrist', stat: 'Avoidance' },
  // Legs
  { id: 7390, name: 'Enchant Legs – Stormbound Armor Kit', slot: 'legs', stat: 'Stamina/Agility' },
  // Feet
  { id: 7424, name: 'Enchant Boots – Defender\'s March', slot: 'feet', stat: 'Stamina' },
  // Weapons
  { id: 7444, name: 'Enchant Weapon – Authority of Air', slot: 'main_hand', stat: 'Agility' },
];

/** Slots that can be enchanted. */
export const ENCHANTABLE_SLOTS = [
  'neck',
  'back',
  'chest',
  'wrist',
  'hands',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'main_hand',
  'off_hand',
] as const;
