import type { SimcProfile, CombinationSpec, SimSettings, SimResult } from './types';

/** Check if a combo has any active enchant selections (not "enchant_none"). */
function hasEnchantOverrides(combo: CombinationSpec): boolean {
  return Object.entries(combo.axes).some(
    ([axisId, optionId]) => axisId.startsWith('enchant:') && optionId !== 'enchant_none',
  );
}

/**
 * Apply an enchant_id to a SimC item line.
 * If the line already has enchant_id, replace it. Otherwise, append it.
 */
function applyEnchantToLine(line: string, enchantId: string): string {
  if (line.includes('enchant_id=')) {
    return line.replace(/enchant_id=\d+/, `enchant_id=${enchantId}`);
  }
  return `${line},enchant_id=${enchantId}`;
}

/**
 * Build the complete .simc file content for a ProfileSet simulation.
 *
 * Sections (from docs/profileset-builder.md):
 * 1. Global sim options
 * 2. Base character profile (rawLines, unmodified)
 * 3. Enemy lines (if numEnemies > 1)
 * 4. ProfileSet entries (one per non-baseline combination)
 */
export function buildProfileSetFile(
  profile: SimcProfile,
  combinations: CombinationSpec[],
  settings: SimSettings,
): string {
  const sections: string[] = [];

  // ── Section 1: Global options ────────────────────────────────────────────
  sections.push('# ── Global options ──');
  sections.push(`fight_style=${settings.fightStyle}`);
  sections.push(`max_time=${settings.maxTime}`);
  sections.push(`vary_combat_length=${settings.varyCombatLength}`);

  // If vary_combat_length is 0, add fixed_time=1
  if (settings.varyCombatLength === 0) {
    sections.push('fixed_time=1');
  }

  if (settings.targetError != null && settings.targetError > 0) {
    sections.push(`target_error=${settings.targetError}`);
  } else {
    sections.push(`iterations=${settings.iterations}`);
  }
  sections.push(`threads=${settings.threads}`);
  sections.push('process_priority=below_normal');

  // Platform-specific output suppression
  // This is a frontend-generated file; the actual platform detection
  // happens at runtime. We use /dev/null as default since the Rust side
  // can override via CLI args.
  const outputNull = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')
    ? 'nul'
    : '/dev/null';
  sections.push(`output=${outputNull}`);
  sections.push(`json2=${settings.jsonOutputPath}`);

  // ProfileSet parallel execution and accuracy
  sections.push('profileset_work_threads=2');
  sections.push('single_actor_batch=1');

  // Raid buff overrides (user-configurable)
  for (const [key, enabled] of Object.entries(settings.raidBuffs)) {
    sections.push(`override.${key}=${enabled ? 1 : 0}`);
  }

  sections.push('');

  // ── Section 2: Base character profile ────────────────────────────────────
  sections.push('# ── Base character profile ──');
  for (const line of profile.rawLines) {
    sections.push(line);
  }
  sections.push('');

  // ── Section 2b: Consumables & expansion options ────────────────────────
  // Weapon rune / temporary enchant
  if (settings.weaponRune) {
    sections.push(`temporary_enchant=${settings.weaponRune}`);
  } else {
    sections.push('temporary_enchant=');
  }
  // Consumables (only emit if user chose something other than SimC default)
  if (settings.potion) sections.push(`potion=${settings.potion}`);
  if (settings.food) sections.push(`food=${settings.food}`);
  if (settings.flask) sections.push(`flask=${settings.flask}`);
  if (settings.augmentation) sections.push(`augmentation=${settings.augmentation}`);
  // Crucible of Erratic Energies modes
  for (const [key, enabled] of Object.entries(settings.crucibleModes)) {
    if (enabled) {
      sections.push(`midnight.crucible_of_erratic_energies_${key}=1`);
    }
  }
  sections.push('');

  // ── Section 3: Enemy lines ───────────────────────────────────────────────
  if (settings.numEnemies > 1) {
    sections.push('# ── Enemies ──');
    for (let i = 1; i < settings.numEnemies; i++) {
      sections.push(`enemy=add${i}`);
    }
    sections.push('');
  }

  // ── Section 4: ProfileSet entries ────────────────────────────────────────
  // Build a map of slot → raw gear line from the profile's rawLines.
  // Using raw lines (instead of rebuilding via buildItemSimcLine) preserves
  // all SimC fields like crafted_stats, crafting_quality, etc.
  const gearSlotOrder = [
    'head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist',
    'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2',
    'main_hand', 'off_hand',
  ];
  const gearSlotSet = new Set(gearSlotOrder);
  const rawGearLineMap = new Map<string, string>();
  for (const line of profile.rawLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (gearSlotSet.has(key)) {
      rawGearLineMap.set(key, trimmed);
    }
  }

  const profilesets = combinations.filter((c) => c.overrideLines.length > 0 || hasEnchantOverrides(c));

  if (profilesets.length > 0) {
    sections.push('# ── ProfileSets ──');
    for (const combo of profilesets) {
      const name = combo.name;

      // Only track slots that actually differ from the base profile.
      // SimC profilesets inherit all unspecified slots from the base profile,
      // so we only need to write the overrides.
      const changedSlots = new Map<string, string>();

      // Apply gear overrides (item swaps)
      for (const line of combo.overrideLines) {
        const slotMatch = line.match(/^(\w+)=/);
        if (slotMatch) {
          changedSlots.set(slotMatch[1], line);
        }
      }

      // Apply enchant overrides from combo.axes — modify the item line's enchant_id.
      // For slots with gear overrides, apply to the override line.
      // For unchanged slots, use the RAW profile line to preserve crafted_stats etc.
      for (const [axisId, optionId] of Object.entries(combo.axes)) {
        if (!axisId.startsWith('enchant:') || optionId === 'enchant_none') continue;
        const slot = axisId.replace('enchant:', '');
        const enchantId = optionId.replace('enchant_', '');
        const baseLine = changedSlots.get(slot) ?? rawGearLineMap.get(slot);
        if (baseLine) {
          changedSlots.set(slot, applyEnchantToLine(baseLine, enchantId));
        }
      }

      // Assemble only the changed lines (ordered by slot)
      const overrideLines = gearSlotOrder
        .filter((s) => changedSlots.has(s))
        .map((s) => changedSlots.get(s)!);

      for (let i = 0; i < overrideLines.length; i++) {
        const op = i === 0 ? '=' : '+=';
        sections.push(`profileset."${name}"${op}${overrideLines[i]}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Shape of the SimC json2 output relevant to this app.
 */
interface SimCJson2Output {
  sim: {
    players: Array<{
      collected_data: {
        dps: {
          mean: number;
          std_dev: number;
          mean_std_dev: number;
        };
      };
    }>;
    profilesets?: {
      results: Array<{
        name: string;
        mean: number;
        stddev: number;
        mean_stddev: number;
        min: number;
        max: number;
        median: number;
      }>;
    };
  };
}

/**
 * Parse SimC json2 output into SimResult[].
 *
 * Base DPS: sim.players[0].collected_data.dps.mean
 * ProfileSet DPS: profilesets.results[i].mean
 *
 * Returns sorted by DPS descending.
 */
export function parseSimCResults(
  jsonText: string,
  manifest: Map<string, CombinationSpec>,
): SimResult[] {
  const json: SimCJson2Output = JSON.parse(jsonText) as SimCJson2Output;
  const results: SimResult[] = [];

  // Base (currently equipped) result
  const baseDps = json.sim.players[0].collected_data.dps;
  const baselineSpec = manifest.get('combo_0000');
  results.push({
    name: 'combo_0000',
    isBaseline: true,
    dps: baseDps.mean,
    stdDev: baseDps.std_dev,
    meanStdDev: baseDps.mean_std_dev,
    axes: baselineSpec?.axes ?? {},
  });

  // ProfileSet results (SimC nests profilesets under sim.profilesets)
  if (json.sim.profilesets?.results) {
    for (const r of json.sim.profilesets.results) {
      const spec = manifest.get(r.name);
      if (!spec) continue;
      results.push({
        name: r.name,
        isBaseline: false,
        dps: r.mean,
        stdDev: r.stddev,
        meanStdDev: r.mean_stddev,
        axes: spec.axes,
      });
    }
  }

  return results.sort((a, b) => b.dps - a.dps);
}
