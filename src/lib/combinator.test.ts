import { describe, it, expect } from 'vitest';
import {
  countCombinations,
  generateCombinations,
  CombinationCapExceededError,
} from './combinator';
import type { OptimizationAxis } from './types';

describe('countCombinations', () => {
  it('returns 1 for empty axes', () => {
    expect(countCombinations([])).toBe(1);
  });

  it('returns option count for single axis', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
          { id: 'item_300', label: 'C', simcLines: ['trinket1=,id=300'] },
        ],
      },
    ];
    expect(countCombinations(axes)).toBe(3);
  });

  it('returns cartesian product for multiple unconditional axes', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: [
          { id: 'item_300', label: 'C', simcLines: ['trinket2=,id=300'] },
          { id: 'item_400', label: 'D', simcLines: ['trinket2=,id=400'] },
          { id: 'item_500', label: 'E', simcLines: ['trinket2=,id=500'] },
        ],
      },
    ];
    expect(countCombinations(axes)).toBe(6); // 2 × 3
  });

  it('does not multiply axes with 0 options', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
      {
        id: 'enchant:chest',
        label: 'Chest Enchant',
        options: [],
      },
    ];
    expect(countCombinations(axes)).toBe(2);
  });

  it('does not multiply axes with 1 option', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
      {
        id: 'enchant:chest',
        label: 'Chest Enchant',
        options: [
          { id: 'enchant_7392', label: 'Crystalline Radiance', simcLines: [] },
        ],
      },
    ];
    expect(countCombinations(axes)).toBe(2);
  });
});

describe('generateCombinations', () => {
  it('generates single axis combinations', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: [] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
    ];
    const combos = generateCombinations(axes);
    expect(combos).toHaveLength(2);
  });

  it('generates cartesian product for multiple unconditional axes', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: [] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
      {
        id: 'enchant:finger1',
        label: 'Ring 1 Enchant',
        options: [
          { id: 'enchant_7340', label: 'Crit', simcLines: [] },
          { id: 'enchant_7341', label: 'Mastery', simcLines: ['finger1=,id=235614,enchant_id=7341'] },
        ],
      },
    ];
    const combos = generateCombinations(axes);
    expect(combos).toHaveLength(4); // 2 × 2
  });

  it('assigns combo_0000 to baseline (no overrides)', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A (equipped)', simcLines: [] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
    ];
    const combos = generateCombinations(axes);
    const baseline = combos.find((c) => c.name === 'combo_0000');
    expect(baseline).toBeDefined();
    expect(baseline!.overrideLines).toHaveLength(0);
  });

  it('assigns combo_0001+ to non-baseline combos', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: [] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
          { id: 'item_300', label: 'C', simcLines: ['trinket1=,id=300'] },
        ],
      },
    ];
    const combos = generateCombinations(axes);
    const names = combos.map((c) => c.name).sort();
    expect(names).toEqual(['combo_0000', 'combo_0001', 'combo_0002']);
  });

  it('handles conditional gem axes — only active for parent item', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:head',
        label: 'Head',
        options: [
          { id: 'item_100', label: 'Item A (1 socket)', simcLines: [] },
          { id: 'item_200', label: 'Item B (no socket)', simcLines: ['head=,id=200'] },
        ],
      },
      {
        id: 'gem:head:100:socket_0',
        label: 'Head socket 1 (Item A)',
        parentItemId: 100,
        parentSlot: 'head',
        options: [
          { id: 'gem_1', label: 'Mastery gem', simcLines: [] },
          { id: 'gem_2', label: 'Haste gem', simcLines: ['head=,id=100,gem_id=2'] },
        ],
      },
    ];

    const combos = generateCombinations(axes);
    // Item A has 2 gem options, Item B has 0 → 2 + 1 = 3
    expect(combos).toHaveLength(3);

    // Combos for item B should not have any gem axis selections
    const itemBCombos = combos.filter(
      (c) => c.axes['slot:head'] === 'item_200',
    );
    expect(itemBCombos).toHaveLength(1);
    expect(itemBCombos[0].axes['gem:head:100:socket_0']).toBeUndefined();
  });

  it('throws CombinationCapExceededError when count exceeds cap', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${i}`,
          label: `Item ${i}`,
          simcLines: i === 0 ? [] : [`trinket1=,id=${i}`],
        })),
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${100 + i}`,
          label: `Item ${100 + i}`,
          simcLines: i === 0 ? [] : [`trinket2=,id=${100 + i}`],
        })),
      },
    ];

    // 10 × 10 = 100, cap at 5 should throw
    expect(() => generateCombinations(axes, 5)).toThrow(CombinationCapExceededError);
  });

  it('does not throw when count is at the cap', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100', label: 'A', simcLines: [] },
          { id: 'item_200', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
    ];
    // count = 2, cap = 2 → should not throw
    expect(() => generateCombinations(axes, 2)).not.toThrow();
  });

  it('handles axes with no options gracefully', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:head',
        label: 'Head',
        options: [],
      },
    ];
    const combos = generateCombinations(axes);
    expect(combos).toHaveLength(1);
    expect(combos[0].name).toBe('combo_0000');
  });
});
