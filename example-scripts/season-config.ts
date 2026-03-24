/**
 * SEASON CONFIG — update this file at the start of every new season.
 *
 * This is the ONLY file you need to touch for seasonal data changes.
 * After editing, run:  pnpm season:validate
 *
 * Commit message convention: "chore: update season config for <ExpansionName> Season N"
 */

// ─── Current season identifier ───────────────────────────────────────────────

export const CURRENT_SEASON = {
  expansion: 'Midnight',
  season: 1,
  label: 'Midnight Season 1',
  startDate: '2026-03-17',
  maxIlvl: 289,
  /**
   * Branch name in the SimC GitHub repo for this season.
   * Used by scripts/build-item-db.ts to pull item_data.inc.
   * https://github.com/simulationcraft/simc/branches
   */
  simcBranch: 'midnight',
} as const;

// ─── Gear tracks ─────────────────────────────────────────────────────────────
//
// bonus_id: the SimC bonus_id that marks this upgrade track.
// Find it by fetching a known item of each track from Wowhead XML:
//   https://www.wowhead.com/item=ITEM_ID&xml
// or from SimC's item_data.inc in the branch above.
// Set to 0 if not yet confirmed — the app will warn the user.

export interface GearTrack {
  name: string;
  bonusId: number; // 0 = TBD / unconfirmed
  ilvlRange: [number, number]; // [min, max] fully upgraded
  upgradeRanks: number; // how many upgrade steps (usually 6)
  crestName: string; // displayed to user
  source: string; // human-readable drop sources
}

export const GEAR_TRACKS: GearTrack[] = [
  {
    name: 'Myth',
    bonusId: 0, // ← TODO: fill in from SimC midnight branch
    ilvlRange: [276, 289],
    upgradeRanks: 6,
    crestName: 'Myth Dawncrest',
    source: 'Mythic Raid / M+10 vault',
  },
  {
    name: 'Hero',
    bonusId: 0, // ← TODO
    ilvlRange: [263, 276],
    upgradeRanks: 6,
    crestName: 'Hero Dawncrest',
    source: 'Heroic Raid / M+6–9',
  },
  {
    name: 'Champion',
    bonusId: 0, // ← TODO
    ilvlRange: [250, 263],
    upgradeRanks: 6,
    crestName: 'Champion Dawncrest',
    source: 'Normal Raid / M0–M+5',
  },
  {
    name: 'Veteran',
    bonusId: 0, // ← TODO
    ilvlRange: [237, 250],
    upgradeRanks: 6,
    crestName: 'Veteran Dawncrest',
    source: 'Heroic Dungeon / Hard Prey',
  },
  {
    name: 'Adventurer',
    bonusId: 0, // ← TODO
    ilvlRange: [224, 237],
    upgradeRanks: 6,
    crestName: 'Adventurer Dawncrest',
    source: 'World events / Normal Prey',
  },
];

// ─── Socket bonus_id ─────────────────────────────────────────────────────────
//
// The bonus_id that adds an extra socket to an item.
// Was 6935 in TWW — verify from SimC source for current season.

export const SOCKET_BONUS_ID: number = 0; // ← TODO: verify for Midnight S1

// ─── Gems ────────────────────────────────────────────────────────────────────
//
// Current-season prismatic gems. Add all relevant gems for the season.
// gem_id: the SimC gem_id value (appears as gem_id= in the addon export string).

export interface GemPreset {
  id: number;
  name: string;
  stat: string; // primary stat label, for UI grouping
}

export const GEM_PRESETS: GemPreset[] = [
  // ← TODO: replace with Midnight Season 1 gems
  // Template (copy & fill):
  // { id: 0, name: 'TODO Gem Name', stat: 'Mastery' },
  { id: 0, name: 'TODO: Mastery gem', stat: 'Mastery' },
  { id: 0, name: 'TODO: Haste gem', stat: 'Haste' },
  { id: 0, name: 'TODO: Crit gem', stat: 'Critical Strike' },
  { id: 0, name: 'TODO: Versatility gem', stat: 'Versatility' },
];

// ─── Enchants ────────────────────────────────────────────────────────────────
//
// Current-season enchants, grouped by slot.
// enchant_id: the SimC enchant_id value (appears as enchant_id= in the addon string).
// slot: must match SimC slot names exactly.

export interface EnchantPreset {
  id: number;
  name: string;
  slot: EnchantableSlot;
  stat: string; // primary stat label, for UI display
}

export type EnchantableSlot =
  | 'neck'
  | 'back'
  | 'chest'
  | 'wrist'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'finger1'
  | 'finger2'
  | 'main_hand'
  | 'off_hand';

export const ENCHANTABLE_SLOTS: EnchantableSlot[] = [
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
];

export const ENCHANT_PRESETS: EnchantPreset[] = [
  // ← TODO: replace with Midnight Season 1 enchants
  // Template (copy & fill):
  // { id: 0, name: 'TODO Enchant Name', slot: 'finger1', stat: 'Crit' },

  // Rings
  { id: 0, name: 'TODO: Ring enchant 1', slot: 'finger1', stat: 'Mastery' },
  { id: 0, name: 'TODO: Ring enchant 2', slot: 'finger1', stat: 'Haste' },

  // Neck
  { id: 0, name: 'TODO: Neck enchant', slot: 'neck', stat: 'Mastery' },

  // Back
  { id: 0, name: 'TODO: Cloak enchant', slot: 'back', stat: 'Avoidance' },

  // Chest
  { id: 0, name: 'TODO: Chest enchant', slot: 'chest', stat: 'Primary stat' },

  // Wrist
  { id: 0, name: 'TODO: Wrist enchant', slot: 'wrist', stat: 'Primary stat' },

  // Hands
  { id: 0, name: 'TODO: Hands enchant', slot: 'hands', stat: 'Haste' },

  // Legs
  { id: 0, name: 'TODO: Legs enchant', slot: 'legs', stat: 'Primary stat' },

  // Feet
  { id: 0, name: 'TODO: Feet enchant', slot: 'feet', stat: 'Speed' },

  // Weapons
  { id: 0, name: 'TODO: MH enchant', slot: 'main_hand', stat: 'Primary stat' },
  { id: 0, name: 'TODO: OH enchant', slot: 'off_hand', stat: 'Primary stat' },
];
