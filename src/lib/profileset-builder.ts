import type { SimcProfile, CombinationSpec, SimSettings, SimResult } from './types';

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

  // ProfileSet parallel execution
  sections.push('profileset_work_threads=2');
  sections.push('');

  // ── Section 2: Base character profile ────────────────────────────────────
  sections.push('# ── Base character profile ──');
  for (const line of profile.rawLines) {
    sections.push(line);
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
  const profilesets = combinations.filter((c) => c.overrideLines.length > 0);

  if (profilesets.length > 0) {
    sections.push('# ── ProfileSets ──');
    for (const combo of profilesets) {
      const name = combo.name;
      for (let i = 0; i < combo.overrideLines.length; i++) {
        const op = i === 0 ? '=' : '+=';
        sections.push(`profileset."${name}"${op}${combo.overrideLines[i]}`);
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
  };
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
  results.push({
    name: 'combo_0000',
    isBaseline: true,
    dps: baseDps.mean,
    stdDev: baseDps.std_dev,
    meanStdDev: baseDps.mean_std_dev,
    axes: {},
  });

  // ProfileSet results
  if (json.profilesets?.results) {
    for (const r of json.profilesets.results) {
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
