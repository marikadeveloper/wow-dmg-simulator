import type { SimcProfile, OptimizationAxis } from './types';
import { buildGearAxes } from './gear-axes';
import { buildGemAxes } from './gem-axes';

/**
 * Assemble all optimization axes from the current UI state.
 *
 * This is the single entry point for collecting axes from all optimization
 * sources (gear, gems, future: enchants). The combinator and combination
 * counter consume the output of this function.
 */
export function assembleAxes(
  profile: SimcProfile,
  selection: Set<string>,
  gemIdsToTry: number[],
): OptimizationAxis[] {
  const gearAxes = buildGearAxes(profile, selection);
  const gemAxes = buildGemAxes(profile, selection, gemIdsToTry);
  // Future: const enchantAxes = buildEnchantAxes(...)
  return [...gearAxes, ...gemAxes];
}
