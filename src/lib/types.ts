/** A single dimension of the optimization space. */
export interface OptimizationAxis {
  /** Unique key, e.g. "slot:trinket1", "enchant:finger1", "gem:head:235602:socket_0" */
  id: string;
  /** Human-readable label for UI */
  label: string;
  /** The choices to try on this axis */
  options: OptimizationOption[];
  /** If set, this axis only applies when this item is chosen on the parent slot */
  parentItemId?: number;
  /** The slot this axis belongs to (used with parentItemId for conditional axes) */
  parentSlot?: string;
}

/** One option within an OptimizationAxis. */
export interface OptimizationOption {
  /** Unique within the axis */
  id: string;
  /** Human-readable label */
  label: string;
  /** SimC profile line(s) this option produces */
  simcLines: string[];
}

/** A parsed gear item from the SimC addon export. */
export interface GearItem {
  /** e.g. "head", "trinket1" */
  slot: string;
  /** SimC item ID */
  id: number;
  /** Slash-separated bonus_id values */
  bonusIds: number[];
  /** Slash-separated gem_id values (one per socket) */
  gemIds: number[];
  /** Enchant ID, if present */
  enchantId?: number;
  /** Item name (from tooltip lookup, optional) */
  name?: string;
  /** Item level parsed from the SimC comment (e.g. "# Helm of Valor (639)") */
  ilvl?: number;
  /** true = currently equipped, false = in bag or unowned */
  isEquipped: boolean;
  /** true = item is from the Great Vault (Weekly Reward Choices) */
  isVault?: boolean;
}

/** The fully parsed SimC addon export string. */
export interface SimcProfile {
  /** Character name */
  characterName: string;
  /** Realm / server name */
  realm: string;
  /** Region code (us, eu, etc.) */
  region: string;
  /** Character race */
  race: string;
  /** Specialization name */
  spec: string;
  /** Character level */
  level: number;
  /** Base64-encoded talent string */
  talentString: string;
  /** Slot name → items in that slot (first = equipped) */
  gear: Record<string, GearItem[]>;
  /** ALL original lines verbatim, for profile reconstruction */
  rawLines: string[];
}

/** Result for one combination from the SimC json2 output. */
export interface SimResult {
  /** "combo_0000" = baseline, "combo_0001"+ = profilesets */
  name: string;
  /** true if this is the currently-equipped baseline */
  isBaseline: boolean;
  /** Mean DPS */
  dps: number;
  /** Standard deviation of DPS */
  stdDev: number;
  /** Standard error of the mean — use for statistical noise detection */
  meanStdDev: number;
  /** axisId → optionId mapping for this combination */
  axes: Record<string, string>;
}

/** Persisted app configuration. */
export interface AppConfig {
  /** Override path for the SimC binary (null = use bundled sidecar) */
  simcBinaryPath: string | null;
  /** Number of iterations per sim (default 10000) */
  iterations: number;
  /** CPU threads to use (default cpu_count - 1) */
  threads: number;
}

/** One fully-resolved combination to simulate. */
export interface CombinationSpec {
  /** "combo_0000" (baseline) or "combo_NNNN" */
  name: string;
  /** axisId → optionId for this combination */
  axes: Record<string, string>;
  /** SimC lines that differ from the base profile */
  overrideLines: string[];
}

/** Simulation settings passed to the ProfileSet builder. */
export interface SimSettings {
  /** SimC fight_style value */
  fightStyle: string;
  /** Fight duration in seconds */
  maxTime: number;
  /** Combat length variance as fraction (0.0–1.0) */
  varyCombatLength: number;
  /** Total number of enemies (1 = single target) */
  numEnemies: number;
  /** Number of iterations */
  iterations: number;
  /** Number of CPU threads */
  threads: number;
  /** Path for json2 output */
  jsonOutputPath: string;
}
