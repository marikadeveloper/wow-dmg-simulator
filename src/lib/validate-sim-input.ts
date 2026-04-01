import type { SimcProfile } from './types';
import type { SimSettingsValues } from '../components/SimSettingsPanel';
import { ENCHANTABLE_SLOTS, DUAL_WIELD_SPECS } from './presets/season-config';

export interface ValidationIssue {
  /** 'error' blocks the run, 'warning' allows it but flags something */
  severity: 'error' | 'warning';
  message: string;
}

const VALID_FIGHT_STYLES = new Set([
  'Patchwerk',
  'CastingPatchwerk',
  'LightMovement',
  'HeavyMovement',
  'HecticAddCleave',
  'DungeonSlice',
  'HelterSkelter',
]);

/**
 * Validate everything needed before running SimC.
 * Returns an empty array if all is well.
 */
export function validateSimInput(
  profile: SimcProfile,
  settings: SimSettingsValues,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ── Profile checks ──────────────────────────────────────────────────────

  if (!profile.characterName) {
    issues.push({ severity: 'error', message: 'No character name found in the profile.' });
  }

  if (!profile.spec) {
    issues.push({ severity: 'error', message: 'No specialization found in the profile.' });
  }

  if (!profile.talentString) {
    issues.push({ severity: 'error', message: 'No talent string found — SimC requires talents to simulate.' });
  }

  const equippedSlots = Object.values(profile.gear).filter(
    (items) => items.some((i) => i.isEquipped),
  );

  if (equippedSlots.length === 0) {
    issues.push({ severity: 'error', message: 'No equipped gear found in the profile.' });
  }

  // Dual-wield specs must have an off-hand weapon
  if (profile.spec && DUAL_WIELD_SPECS.has(profile.spec)) {
    const offHandItems = profile.gear.off_hand ?? [];
    if (offHandItems.length === 0) {
      issues.push({
        severity: 'error',
        message: `${profile.spec.charAt(0).toUpperCase() + profile.spec.slice(1)} requires an off-hand weapon to simulate. Add an off-hand weapon to continue.`,
      });
    }
  }

  // Warn if very few slots have gear (probably an incomplete import)
  if (equippedSlots.length > 0 && equippedSlots.length < 10) {
    issues.push({
      severity: 'warning',
      message: `Only ${equippedSlots.length} gear slots found — the import may be incomplete.`,
    });
  }

  // ── Settings checks ─────────────────────────────────────────────────────

  if (!VALID_FIGHT_STYLES.has(settings.fightStyle)) {
    issues.push({ severity: 'error', message: `Unknown fight style "${settings.fightStyle}".` });
  }

  if (settings.maxTime < 10 || settings.maxTime > 900) {
    issues.push({ severity: 'error', message: 'Fight length must be between 10 and 900 seconds.' });
  }

  if (settings.varyCombatLength < 0 || settings.varyCombatLength > 100) {
    issues.push({ severity: 'error', message: 'Fight length variance must be between 0% and 100%.' });
  }

  if (settings.numEnemies < 1 || settings.numEnemies > 20) {
    issues.push({ severity: 'error', message: 'Number of enemies must be between 1 and 20.' });
  }

  if (settings.useTargetError) {
    if (settings.targetError <= 0 || settings.targetError > 5) {
      issues.push({ severity: 'error', message: 'Target error must be between 0.01% and 5%.' });
    }
  } else {
    if (settings.iterations < 1000 || settings.iterations > 100000) {
      issues.push({ severity: 'error', message: 'Iterations must be between 1,000 and 100,000.' });
    }
  }

  if (settings.threads < 1) {
    issues.push({ severity: 'error', message: 'CPU threads must be at least 1.' });
  }

  // ── Warnings for unusual settings ───────────────────────────────────────

  if (settings.numEnemies > 1 && settings.fightStyle === 'DungeonSlice') {
    issues.push({
      severity: 'warning',
      message: 'Dungeon Slice manages its own enemies — the enemy count setting will be ignored.',
    });
  }

  if (!settings.useTargetError && settings.iterations < 5000) {
    issues.push({
      severity: 'warning',
      message: 'Low iteration count — results may have high statistical noise.',
    });
  }

  if (settings.varyCombatLength === 0 && settings.maxTime >= 200) {
    issues.push({
      severity: 'warning',
      message: '0% variance with long fights can favor cooldown-aligned gear. Consider adding variance.',
    });
  }

  // ── Enchant consistency checks ──────────────────────────────────────────

  for (const enchantableSlot of ENCHANTABLE_SLOTS) {
    const items = profile.gear[enchantableSlot];
    if (!items || items.length < 2) continue;

    const withEnchant = items.filter((i) => i.enchantId != null);
    const withoutEnchant = items.filter((i) => i.enchantId == null);

    if (withEnchant.length > 0 && withoutEnchant.length > 0) {
      const slotLabel = enchantableSlot
        .replace('finger1', 'ring')
        .replace('finger2', 'ring')
        .replace('main_hand', 'main hand')
        .replace('off_hand', 'off hand');
      issues.push({
        severity: 'warning',
        message: `Some items in ${slotLabel} have an enchant and some don't — the comparison may be unfair. Consider enabling enchant optimization.`,
      });
    }
  }

  return issues;
}

/** Returns true if any issue is severity: 'error'. */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
