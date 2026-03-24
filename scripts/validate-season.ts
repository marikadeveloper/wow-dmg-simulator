import {
  CURRENT_SEASON,
  GEAR_TRACKS,
  SOCKET_BONUS_ID,
  GEM_PRESETS,
  ENCHANT_PRESETS,
} from '../src/lib/presets/season-config';

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`\u2717 ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`\u26A0 ${msg}`);
  warnings++;
}

function pass(msg: string) {
  console.log(`\u2713 ${msg}`);
}

// ── Season metadata ──────────────────────────────────────────────────────────

if (!CURRENT_SEASON.expansion) fail('CURRENT_SEASON.expansion is empty');
else pass(`Season: ${CURRENT_SEASON.label}`);

if (!CURRENT_SEASON.simcBranch) fail('CURRENT_SEASON.simcBranch is empty');
else pass(`SimC branch: ${CURRENT_SEASON.simcBranch}`);

if (CURRENT_SEASON.maxIlvl <= 0) fail('CURRENT_SEASON.maxIlvl is invalid');
else pass(`Max ilvl: ${CURRENT_SEASON.maxIlvl}`);

// ── Gear tracks ──────────────────────────────────────────────────────────────

for (const track of GEAR_TRACKS) {
  if (track.bonusId === 0) {
    fail(`${track.name} track: bonusId is 0 (placeholder — must be filled before release)`);
  } else {
    pass(`${track.name}: bonusId=${track.bonusId}`);
  }

  const [min, max] = track.ilvlRange;
  if (min >= max) fail(`${track.name} track: ilvlRange [${min}, ${max}] is invalid`);
}

// Check for duplicate bonus_ids (ignoring 0 placeholders)
const nonZeroBonusIds = GEAR_TRACKS.map((t) => t.bonusId).filter((b) => b !== 0);
const uniqueBonusIds = new Set(nonZeroBonusIds);
if (uniqueBonusIds.size !== nonZeroBonusIds.length) {
  fail('Duplicate bonusId found across gear tracks');
}

// ── Socket bonus_id ──────────────────────────────────────────────────────────

if (SOCKET_BONUS_ID === 0) {
  warn('SOCKET_BONUS_ID is 0 — socket feature will be disabled until set');
} else {
  pass(`SOCKET_BONUS_ID: ${SOCKET_BONUS_ID}`);
}

// ── Gem presets ──────────────────────────────────────────────────────────────

if (GEM_PRESETS.length === 0) {
  fail('GEM_PRESETS is empty');
} else {
  for (const gem of GEM_PRESETS) {
    if (gem.id === 0) {
      fail(`Gem "${gem.name}" has id=0 (placeholder — must be filled)`);
    }
    if (!gem.name || gem.name.startsWith('TODO')) {
      fail(`Gem "${gem.name}" has placeholder name`);
    }
  }
  const gemIds = GEM_PRESETS.map((g) => g.id);
  const uniqueGemIds = new Set(gemIds);
  if (uniqueGemIds.size !== gemIds.length) {
    fail('Duplicate gem id found in GEM_PRESETS');
  }
  pass(`${GEM_PRESETS.length} gem presets validated`);
}

// ── Enchant presets ──────────────────────────────────────────────────────────

if (ENCHANT_PRESETS.length === 0) {
  fail('ENCHANT_PRESETS is empty');
} else {
  for (const enchant of ENCHANT_PRESETS) {
    if (enchant.id === 0) {
      fail(`Enchant "${enchant.name}" has id=0 (placeholder — must be filled)`);
    }
    if (!enchant.name || enchant.name.startsWith('TODO')) {
      fail(`Enchant "${enchant.name}" has placeholder name`);
    }
  }
  const enchantIds = ENCHANT_PRESETS.map((e) => e.id);
  const uniqueEnchantIds = new Set(enchantIds);
  if (uniqueEnchantIds.size !== enchantIds.length) {
    fail(`Duplicate enchant id found in ENCHANT_PRESETS`);
  }
  pass(`${ENCHANT_PRESETS.length} enchant presets validated`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error('VALIDATION FAILED — fix all errors before releasing.');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('Validation passed with warnings.');
} else {
  console.log('All checks passed!');
}
