import type { SimcProfile, OptimizationAxis, OptimizationOption } from './types';
import {
  ENCHANT_PRESETS,
  ENCHANTABLE_SLOTS,
  type EnchantPreset,
} from './presets/season-config';

const ENCHANT_BY_ID = new Map<number, EnchantPreset>(
  ENCHANT_PRESETS.map((e) => [e.id, e]),
);

/**
 * Map a specific gear slot to the enchant preset category key.
 *
 * Enchant presets use category keys (e.g. "finger" for both finger1/finger2,
 * "main_hand" for both main_hand/off_hand). This function maps the concrete
 * slot name to the category used in ENCHANT_PRESETS.
 */
function slotToPresetCategory(slot: string): string {
  if (slot === 'finger1' || slot === 'finger2') return 'finger';
  if (slot === 'off_hand') return 'main_hand';
  return slot;
}

/**
 * Build unconditional enchant OptimizationAxis[] for all enchantable slots
 * that have selected items.
 *
 * Unlike gem axes, enchant axes are unconditional — they apply regardless of
 * which item ends up in the slot. The enchant modifies the item line via
 * `enchant_id=N`.
 *
 * @param profile        - Parsed SimC profile
 * @param selection      - Set of "slot:index" keys for selected items
 * @param enchantIdsToTry - Enchant IDs the user wants to compare
 */
export function buildEnchantAxes(
  profile: SimcProfile,
  selection: Set<string>,
  enchantIdsToTry: number[],
): OptimizationAxis[] {
  if (enchantIdsToTry.length === 0) return [];

  const axes: OptimizationAxis[] = [];

  // Determine which slots have at least one selected item
  const slotsWithSelection = new Set<string>();
  for (const key of selection) {
    const slot = key.split(':')[0];
    slotsWithSelection.add(slot);
  }

  for (const slot of ENCHANTABLE_SLOTS) {
    // Skip slots where the user has no items selected
    if (!slotsWithSelection.has(slot)) continue;

    // Only include enchants whose preset category matches this slot
    const category = slotToPresetCategory(slot);
    const relevantEnchantIds = enchantIdsToTry.filter((id) => {
      const preset = ENCHANT_BY_ID.get(id);
      return preset && preset.slot === category;
    });

    if (relevantEnchantIds.length === 0) continue;

    const options: OptimizationOption[] = relevantEnchantIds.map((enchantId) => {
      const preset = ENCHANT_BY_ID.get(enchantId);
      return {
        id: `enchant_${enchantId}`,
        label: preset?.name ?? `Enchant #${enchantId}`,
        simcLines: [], // enchant is merged into item lines by profileset builder
      };
    });

    axes.push({
      id: `enchant:${slot}`,
      label: `${slot} enchant`,
      options,
    });
  }

  return axes;
}
