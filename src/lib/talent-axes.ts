import type { SimcProfile, OptimizationAxis, OptimizationOption } from './types';
import { talentBuildsEqual } from './talent-decoder';

/**
 * Build an OptimizationAxis for talent build comparison.
 *
 * The currently active talent string is always included as the baseline option
 * (empty simcLines = no override). Each selected saved loadout becomes an
 * additional option with `talents=<string>` as its simcLine.
 *
 * Returns an empty array if fewer than 2 options are selected (nothing to compare).
 */
export function buildTalentAxes(
  profile: SimcProfile,
  selectedNames: Set<string>,
): OptimizationAxis[] {
  if (selectedNames.size === 0) return [];

  const options: OptimizationOption[] = [];

  // Baseline: currently active talent build (no override needed)
  options.push({
    id: 'talent_active',
    label: 'Currently Active',
    simcLines: [],
  });

  // Each selected saved loadout
  for (const loadout of profile.savedLoadouts ?? []) {
    if (!selectedNames.has(loadout.name)) continue;
    // Skip if this loadout is functionally the same as the active build
    // (compares purchased talent nodes, ignoring auto-granted differences)
    if (talentBuildsEqual(loadout.talentString, profile.talentString)) continue;
    options.push({
      id: `talent_${loadout.name}`,
      label: loadout.name,
      simcLines: [`talents=${loadout.talentString}`],
    });
  }

  // Need at least 2 options to have something to compare
  if (options.length < 2) return [];

  return [
    {
      id: 'talents',
      label: 'Talent Build',
      options,
    },
  ];
}
