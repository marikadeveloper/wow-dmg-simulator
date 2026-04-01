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
 * Unconditional axes multiply normally (cartesian product).
 * Conditional axes (with parentItemId) only participate when their parent item
 * is selected, so we sum across parent-item branches.
 */
export function countCombinations(axes: OptimizationAxis[]): number {
  const { unconditional, conditionalByParent } = partitionAxes(axes);

  // Get the slot axis for each parent item so we know which slot axis
  // contains the parent options
  const slotAxes = unconditional.filter((a) => a.id.startsWith('slot:'));
  const nonSlotUnconditional = unconditional.filter((a) => !a.id.startsWith('slot:'));

  // Base multiplier from non-slot unconditional axes (enchants, etc.)
  let nonSlotProduct = 1;
  for (const axis of nonSlotUnconditional) {
    if (axis.options.length > 1) {
      nonSlotProduct *= axis.options.length;
    }
  }

  // For slot axes, we need to account for conditional gem axes per item
  let slotProduct = 1;
  for (const slotAxis of slotAxes) {
    let slotTotal = 0;

    for (const option of slotAxis.options) {
      const itemIds = extractItemIds(option.id);

      // Collect all conditional axes for items in this option (may be 1 or 2 for pairs)
      let itemContribution = 1;
      for (const itemId of itemIds) {
        for (const condAxis of conditionalByParent.get(itemId) ?? []) {
          if (condAxis.options.length > 1) {
            itemContribution *= condAxis.options.length;
          }
        }
      }
      slotTotal += itemContribution;
    }

    if (slotTotal > 0) {
      slotProduct *= slotTotal;
    }
  }

  // Handle conditional axes whose parent slot has no slot axis
  // (single item selected = no slot axis, but item may have gem axes)
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      for (const condAxis of condAxes) {
        if (condAxis.options.length > 1) {
          nonSlotProduct *= condAxis.options.length;
        }
      }
    }
  }

  return Math.max(1, slotProduct * nonSlotProduct);
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
 * Each entry is one multiplicative factor.
 */
export function getCombinationBreakdown(axes: OptimizationAxis[]): CombinationFactor[] {
  const { unconditional, conditionalByParent } = partitionAxes(axes);
  const slotAxes = unconditional.filter((a) => a.id.startsWith('slot:'));
  const nonSlotUnconditional = unconditional.filter((a) => !a.id.startsWith('slot:'));
  const factors: CombinationFactor[] = [];

  for (const slotAxis of slotAxes) {
    let slotTotal = 0;
    for (const option of slotAxis.options) {
      const itemIds = extractItemIds(option.id);
      let itemContribution = 1;
      for (const itemId of itemIds) {
        for (const condAxis of conditionalByParent.get(itemId) ?? []) {
          if (condAxis.options.length > 1) {
            itemContribution *= condAxis.options.length;
          }
        }
      }
      slotTotal += itemContribution;
    }
    if (slotTotal > 1) {
      const isPaired = slotAxis.id === 'slot:rings' || slotAxis.id === 'slot:trinkets';
      factors.push({
        label: slotAxis.label,
        optionCount: slotTotal,
        detail: isPaired ? `${slotAxis.options.length} pairs` : `${slotAxis.options.length} items`,
      });
    }
  }

  // Unconditional non-slot axes (enchants)
  for (const axis of nonSlotUnconditional) {
    if (axis.options.length > 1) {
      factors.push({ label: axis.label, optionCount: axis.options.length });
    }
  }

  // Orphaned conditional axes (no slot axis for parent)
  for (const [parentId, condAxes] of conditionalByParent) {
    const hasSlotAxis = slotAxes.some((sa) =>
      sa.options.some((o) => extractItemIds(o.id).includes(parentId)),
    );
    if (!hasSlotAxis) {
      for (const condAxis of condAxes) {
        if (condAxis.options.length > 1) {
          factors.push({ label: condAxis.label, optionCount: condAxis.options.length });
        }
      }
    }
  }

  return factors;
}

/**
 * Generate all combinations from the given axes.
 *
 * Uses the conditional cartesian product algorithm from docs/gem-enchant-axis.md:
 * 1. Separate axes into unconditional and conditional (by parentItemId)
 * 2. Compute cartesian product of unconditional axes
 * 3. For each unconditional combo, find matching conditional axes and expand
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

  // Generate unconditional cartesian product
  const unconditionalCombos = cartesianProduct(unconditional);

  const results: CombinationSpec[] = [];

  for (const unconditionalCombo of unconditionalCombos) {
    // Determine which items are selected in this combo
    const selectedItemIds = new Set<number>();
    for (const [axisId, optionId] of Object.entries(unconditionalCombo)) {
      if (axisId.startsWith('slot:')) {
        for (const id of extractItemIds(optionId)) {
          selectedItemIds.add(id);
        }
      }
    }

    // Also include conditional axes for items that don't have a slot axis
    // (i.e., the item is the only one selected so no slot axis was created)
    const activeConditionalAxes: OptimizationAxis[] = [];
    for (const [parentId, condAxes] of conditionalByParent) {
      if (selectedItemIds.has(parentId)) {
        activeConditionalAxes.push(...condAxes);
      }
      // If no slot axis contains this parent, the parent item is implicitly selected
      const hasSlotAxis = unconditional.some(
        (a) => a.id.startsWith('slot:') && a.options.some((o) => extractItemIds(o.id).includes(parentId)),
      );
      if (!hasSlotAxis) {
        activeConditionalAxes.push(...condAxes);
      }
    }

    // Expand conditional axes
    const conditionalCombos = cartesianProduct(activeConditionalAxes);

    for (const conditionalCombo of conditionalCombos) {
      const mergedAxes = { ...unconditionalCombo, ...conditionalCombo };

      // Collect override lines
      const overrideLines: string[] = [];
      for (const [axisId, optionId] of Object.entries(mergedAxes)) {
        const axis = axes.find((a) => a.id === axisId);
        if (!axis) continue;
        const option = axis.options.find((o) => o.id === optionId);
        if (!option) continue;
        overrideLines.push(...option.simcLines);
      }

      results.push({
        name: '', // assigned below
        axes: mergedAxes,
        overrideLines: overrideLines.filter(Boolean),
      });
    }
  }

  // Assign names: combo_0000 = baseline (zero overrides), combo_0001+ = rest
  // Find the baseline (no override lines)
  const baselineIdx = results.findIndex((c) => c.overrideLines.length === 0);

  let comboCounter = 1;
  for (let i = 0; i < results.length; i++) {
    if (i === baselineIdx) {
      results[i].name = 'combo_0000';
    } else {
      results[i].name = `combo_${String(comboCounter).padStart(4, '0')}`;
      comboCounter++;
    }
  }

  // If no baseline was found (all combos have overrides), the first one is baseline
  if (baselineIdx === -1 && results.length > 0) {
    // The "currently equipped" state should be one of the combos
    // If not present, we still need combo_0000
    results[0].name = 'combo_0000';
  }

  return results;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

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
