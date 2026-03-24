/**
 * Season config validator.
 * Run with:  pnpm season:validate
 *
 * Fails with exit code 1 if any placeholder (id: 0) values remain.
 * Run this before every release build to catch incomplete season data.
 * Also runs automatically in CI via GitHub Actions.
 */

import {
  CURRENT_SEASON,
  ENCHANT_PRESETS,
  GEAR_TRACKS,
  GEM_PRESETS,
  SOCKET_BONUS_ID,
} from '../src/lib/presets/season-config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

function section(title: string) {
  console.log(`\n── ${title} ──`);
}

// ─── Validation ──────────────────────────────────────────────────────────────

console.log(`\nValidating season config for: ${CURRENT_SEASON.label}`);

section('Gear Tracks');
for (const track of GEAR_TRACKS) {
  if (track.bonusId === 0) {
    fail(`${track.name} track: bonusId is 0 (unconfirmed)`);
  } else {
    console.log(
      `  ✓ ${track.name}: bonusId=${track.bonusId} ilvl ${track.ilvlRange[0]}–${track.ilvlRange[1]}`,
    );
  }
}

section('Socket Bonus ID');
if (SOCKET_BONUS_ID === 0) {
  warn('SOCKET_BONUS_ID is 0 — "Assume socket" feature will be disabled');
} else {
  console.log(`  ✓ Socket bonus_id: ${SOCKET_BONUS_ID}`);
}

section('Gems');
const gemIds = new Set<number>();
for (const gem of GEM_PRESETS) {
  if (gem.id === 0) {
    fail(`Gem "${gem.name}" has id=0 (placeholder)`);
  } else if (gemIds.has(gem.id)) {
    fail(`Duplicate gem id: ${gem.id}`);
  } else {
    gemIds.add(gem.id);
    console.log(`  ✓ ${gem.name} (id=${gem.id})`);
  }
}
if (GEM_PRESETS.length < 4) {
  warn(
    `Only ${GEM_PRESETS.length} gems defined — expected at least 4 (one per secondary stat)`,
  );
}

section('Enchants');
const enchantIds = new Set<number>();
for (const enchant of ENCHANT_PRESETS) {
  if (enchant.id === 0) {
    fail(`Enchant "${enchant.name}" (${enchant.slot}) has id=0 (placeholder)`);
  } else if (enchantIds.has(enchant.id)) {
    fail(`Duplicate enchant id: ${enchant.id}`);
  } else {
    enchantIds.add(enchant.id);
    console.log(`  ✓ ${enchant.name} (id=${enchant.id}, slot=${enchant.slot})`);
  }
}

section('SimC Branch');
if (!CURRENT_SEASON.simcBranch) {
  fail(
    'simcBranch is empty — scripts/build-item-db.ts will not know which branch to pull',
  );
} else {
  console.log(`  ✓ SimC branch: ${CURRENT_SEASON.simcBranch}`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(48));
if (errors > 0) {
  console.error(
    `\n✗ ${errors} error(s), ${warnings} warning(s) — season config is INCOMPLETE`,
  );
  console.error('  See docs/updating-seasons.md for instructions.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn(
    `\n⚠ 0 errors, ${warnings} warning(s) — season config is usable but incomplete`,
  );
  console.warn(
    '  Some features may be disabled. See docs/updating-seasons.md.\n',
  );
  process.exit(0);
} else {
  console.log(`\n✓ Season config is complete for ${CURRENT_SEASON.label}\n`);
  process.exit(0);
}
