import type { OptimizationAxis, CombinationSpec } from './types';

const DEFAULT_CAP = 1000;

export class CombinationCapExceededError extends Error {
  constructor(
    public readonly count: number,
    public readonly cap: number,
  ) {
    super(`Combination count ${count} exceeds cap ${cap}`);
    this.name = 'CombinationCapExceededError';
  }
}

/**
 * Count the total number of combinations that will be generated from the given axes.
 *
 * Uses the additive model: each axis is varied independently from the baseline.
 * Conditional axes (gems) expand within their parent's variation group.
 */
export function countCombinations(axes: OptimizationAxis[]): number {
  const { unconditional, conditionalByParent } = partitionAxes(axes);

  const slotAxes = unconditional.filter((a) => a.id.startsWith('slot:'));

  // 1 for the baseline combo
  let total = 1;

  // For each unconditional axis, count non-baseline options (additive)
  for (const axis of unconditional) {
    const baseOption = findBaselineOption(axis);

    for (const option of axis.options) {
      if (option.id === baseOption.id) continue; // skip baseline

      // Count conditional gem expansions for this option
      let expansion = 1;
      if (axis.id.startsWith('slot:')) {
        const itemIds = extractItemIds(option.id);
        for (const itemId of itemIds) {
          for (const condAxis of conditionalByParent.get(itemId) ?? []) {
            if (condAxis.options.length > 1) {
              expansion *= condAxis.options.length;
            }
          }
        }
      }
      total += expansion;
    }
  }

  // Add baseline conditional gem variations (gems for equipped items)
  const baselineGemCount = countBaselineGemVariations(slotAxes, conditionalByParent);
  total += Math.max(0, baselineGemCount - 1); // -1 because baseline gems already counted

  // Handle orphaned conditional axes (parent has no slot axis)
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      let orphanProduct = 1;
      for (const condAxis of condAxes) {
        if (condAxis.options.length > 1) {
          orphanProduct *= condAxis.options.length;
        }
      }
      total += Math.max(0, orphanProduct - 1); // -1 for baseline gem choice
    }
  }

  return Math.max(1, total);
}

/** One factor in the combination breakdown. */
export interface CombinationFactor {
  /** Human-readable label (e.g. "trinkets", "back", "ring enchant") */
  label: string;
  /** Number of options contributing to this factor */
  optionCount: number;
  /** Extra detail (e.g. "6 items" for paired slots) */
  detail?: string;
}

/**
 * Return a breakdown of what contributes to the combination count.
 * Each entry is one additive contribution (how many combos that axis adds).
 */
export function getCombinationBreakdown(axes: OptimizationAxis[]): CombinationFactor[] {
  const { unconditional, conditionalByParent } = partitionAxes(axes);
  const slotAxes = unconditional.filter((a) => a.id.startsWith('slot:'));
  const factors: CombinationFactor[] = [];

  for (const axis of unconditional) {
    const baseOption = findBaselineOption(axis);
    let contribution = 0;

    for (const option of axis.options) {
      if (option.id === baseOption.id) continue;

      let expansion = 1;
      if (axis.id.startsWith('slot:')) {
        const itemIds = extractItemIds(option.id);
        for (const itemId of itemIds) {
          for (const condAxis of conditionalByParent.get(itemId) ?? []) {
            if (condAxis.options.length > 1) {
              expansion *= condAxis.options.length;
            }
          }
        }
      }
      contribution += expansion;
    }

    if (contribution > 0) {
      const isPaired = axis.id === 'slot:rings' || axis.id === 'slot:trinkets';
      factors.push({
        label: axis.label,
        optionCount: contribution,
        detail: isPaired ? `${axis.options.length} pairs` : undefined,
      });
    }
  }

  // Baseline gem variations
  const baselineGemCount = countBaselineGemVariations(slotAxes, conditionalByParent);
  if (baselineGemCount > 1) {
    factors.push({ label: 'baseline gems', optionCount: baselineGemCount - 1 });
  }

  // Orphaned conditional axes
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      let orphanProduct = 1;
      for (const condAxis of condAxes) {
        if (condAxis.options.length > 1) {
          orphanProduct *= condAxis.options.length;
        }
      }
      if (orphanProduct > 1) {
        factors.push({ label: condAxes[0].label, optionCount: orphanProduct - 1 });
      }
    }
  }

  return factors;
}

/**
 * Generate all combinations from the given axes.
 *
 * Uses the additive model: each axis is varied independently from the baseline.
 * Only one slot changes at a time — no cartesian product across slots.
 * Conditional axes (gems) expand within their parent slot's variation.
 *
 * Returns CombinationSpec[] where combo_0000 is the baseline (no overrides).
 *
 * @throws CombinationCapExceededError if count exceeds cap
 */
export function generateCombinations(
  axes: OptimizationAxis[],
  cap: number = DEFAULT_CAP,
): CombinationSpec[] {
  const count = countCombinations(axes);
  if (count > cap) {
    throw new CombinationCapExceededError(count, cap);
  }

  const { unconditional, conditionalByParent } = partitionAxes(axes);
  const slotAxes = unconditional.filter((a) => a.id.startsWith('slot:'));

  // Find baseline option for each unconditional axis
  const baselineSelections: Record<string, string> = {};
  for (const axis of unconditional) {
    baselineSelections[axis.id] = findBaselineOption(axis).id;
  }

  // Find baseline conditional (gem) selections
  const baselineCondSelections: Record<string, string> = {};
  const baselineItemIds = new Set<number>();
  for (const axis of slotAxes) {
    const baseOpt = findBaselineOption(axis);
    for (const id of extractItemIds(baseOpt.id)) {
      baselineItemIds.add(id);
    }
  }
  // Also add orphaned conditional parents
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      // Orphaned parent is implicitly selected
      for (const condAxis of condAxes) {
        baselineCondSelections[condAxis.id] = findBaselineOption(condAxis).id;
      }
    }
  }
  for (const itemId of baselineItemIds) {
    for (const condAxis of conditionalByParent.get(itemId) ?? []) {
      baselineCondSelections[condAxis.id] = findBaselineOption(condAxis).id;
    }
  }

  const results: CombinationSpec[] = [];

  // Helper to collect override lines from axis selections
  const collectOverrides = (selections: Record<string, string>): string[] => {
    const lines: string[] = [];
    for (const [axisId, optionId] of Object.entries(selections)) {
      const axis = axes.find((a) => a.id === axisId);
      if (!axis) continue;
      const option = axis.options.find((o) => o.id === optionId);
      if (!option) continue;
      lines.push(...option.simcLines);
    }
    return lines.filter(Boolean);
  };

  // Combo 0: baseline (all equipped, baseline gems)
  const baselineAxes = { ...baselineSelections, ...baselineCondSelections };
  results.push({
    name: 'combo_0000',
    axes: baselineAxes,
    overrideLines: [], // baseline has no overrides
  });

  // For each unconditional axis, vary one at a time
  for (const axis of unconditional) {
    const baseOptId = baselineSelections[axis.id];

    for (const option of axis.options) {
      if (option.id === baseOptId) continue; // skip baseline option

      // Build selections: baseline for everything, override this one axis
      const selections = { ...baselineSelections, [axis.id]: option.id };

      // Get conditional axes active for this option
      const activeCondAxes: OptimizationAxis[] = [];
      if (axis.id.startsWith('slot:')) {
        const itemIds = extractItemIds(option.id);
        for (const itemId of itemIds) {
          activeCondAxes.push(...(conditionalByParent.get(itemId) ?? []));
        }
      }

      if (activeCondAxes.length > 0) {
        // Expand conditional axes (gem combos within this variation)
        const condCombos = cartesianProduct(activeCondAxes);
        for (const condCombo of condCombos) {
          const mergedAxes = { ...selections, ...condCombo };
          results.push({
            name: '',
            axes: mergedAxes,
            overrideLines: collectOverrides(mergedAxes),
          });
        }
      } else {
        results.push({
          name: '',
          axes: selections,
          overrideLines: collectOverrides(selections),
        });
      }
    }
  }

  // Baseline conditional gem variations (gems for equipped items)
  const baselineCondAxes: OptimizationAxis[] = [];
  for (const itemId of baselineItemIds) {
    baselineCondAxes.push(...(conditionalByParent.get(itemId) ?? []));
  }
  // Also add orphaned conditional axes
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      baselineCondAxes.push(...condAxes);
    }
  }

  if (baselineCondAxes.length > 0) {
    const condCombos = cartesianProduct(baselineCondAxes);
    for (const condCombo of condCombos) {
      // Skip the baseline gem selection (already added as combo_0000)
      const isBaselineGems = Object.entries(condCombo).every(
        ([axisId, optId]) => baselineCondSelections[axisId] === optId,
      );
      if (isBaselineGems) continue;

      const mergedAxes = { ...baselineSelections, ...condCombo };
      results.push({
        name: '',
        axes: mergedAxes,
        overrideLines: collectOverrides(mergedAxes),
      });
    }
  }

  // Assign names: combo_0000 already set, rest get combo_0001+
  let comboCounter = 1;
  for (let i = 1; i < results.length; i++) {
    results[i].name = `combo_${String(comboCounter).padStart(4, '0')}`;
    comboCounter++;
  }

  return results;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Find the baseline option for an axis.
 * The baseline is the option with empty simcLines (no overrides).
 * Falls back to the first option if none have empty simcLines (e.g. enchant axes).
 */
function findBaselineOption(axis: OptimizationAxis): OptimizationOption {
  if (axis.options.length === 0) {
    return { id: '__empty__', label: '', simcLines: [] };
  }
  return axis.options.find((o) => o.simcLines.length === 0) ?? axis.options[0];
}

/**
 * Count the cartesian product of conditional gem axes for baseline items.
 * Returns the total number of gem combinations for equipped items.
 */
function countBaselineGemVariations(
  slotAxes: OptimizationAxis[],
  conditionalByParent: Map<number, OptimizationAxis[]>,
): number {
  const baselineItemIds = new Set<number>();
  for (const slotAxis of slotAxes) {
    const baseOpt = findBaselineOption(slotAxis);
    for (const id of extractItemIds(baseOpt.id)) {
      baselineItemIds.add(id);
    }
  }

  let product = 1;
  for (const itemId of baselineItemIds) {
    for (const condAxis of conditionalByParent.get(itemId) ?? []) {
      if (condAxis.options.length > 1) {
        product *= condAxis.options.length;
      }
    }
  }
  return product;
}

function partitionAxes(axes: OptimizationAxis[]) {
  const unconditional: OptimizationAxis[] = [];
  const conditionalByParent = new Map<number, OptimizationAxis[]>();

  for (const axis of axes) {
    if (axis.parentItemId != null) {
      const existing = conditionalByParent.get(axis.parentItemId) ?? [];
      existing.push(axis);
      conditionalByParent.set(axis.parentItemId, existing);
    } else {
      unconditional.push(axis);
    }
  }

  return { unconditional, conditionalByParent };
}

/**
 * Compute the cartesian product of multiple axes.
 * Returns array of { axisId → optionId } maps.
 *
 * Axes with 0 or 1 options don't multiply:
 * - 0 options: axis is skipped
 * - 1 option: included in every combo with that single value
 */
function cartesianProduct(
  axes: OptimizationAxis[],
): Array<Record<string, string>> {
  const activeAxes = axes.filter((a) => a.options.length > 0);

  if (activeAxes.length === 0) {
    return [{}]; // single empty combination
  }

  let results: Array<Record<string, string>> = [{}];

  for (const axis of activeAxes) {
    const next: Array<Record<string, string>> = [];
    for (const existing of results) {
      for (const option of axis.options) {
        next.push({ ...existing, [axis.id]: option.id });
      }
    }
    results = next;
  }

  return results;
}

/**
 * Extract item ID(s) from an option ID string.
 *
 * Handles all formats produced by gear-axes.ts:
 * - Normal items:  "item_ID_IDX"     → [ID]
 * - Catalyst items: "catalyst_ID_IDX" → [ID]
 * - Ring/trinket pairs: "pair_ID1_ID2" → [ID1, ID2]
 * - Weapon pairs: "pair_MHID_IDX_OHID_IDX" → [MHID, OHID]
 */
function extractItemIds(optionId: string): number[] {
  // Pair option: "pair_X_Y" or "pair_X_IDX_Y_IDX"
  if (optionId.startsWith('pair_')) {
    const parts = optionId.slice(5).split('_').map(Number);
    if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
      return parts; // ring/trinket pair: both are item IDs
    }
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return [parts[0], parts[2]]; // weapon pair: 1st and 3rd are item IDs
    }
    return [];
  }
  // Normal / catalyst item: "item_ID_IDX" or "catalyst_ID_IDX"
  const match = optionId.match(/^(?:item|catalyst)_(\d+)(?:_\d+)?$/);
  return match ? [parseInt(match[1], 10)] : [];
}
