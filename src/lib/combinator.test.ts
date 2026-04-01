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
          { id: 'item_100_0', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
          { id: 'item_300_2', label: 'C', simcLines: ['trinket1=,id=300'] },
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
          { id: 'item_100_0', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
        ],
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: [
          { id: 'item_300_0', label: 'C', simcLines: ['trinket2=,id=300'] },
          { id: 'item_400_1', label: 'D', simcLines: ['trinket2=,id=400'] },
          { id: 'item_500_2', label: 'E', simcLines: ['trinket2=,id=500'] },
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
          { id: 'item_100_0', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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
          { id: 'item_100_0', label: 'A', simcLines: ['trinket1=,id=100'] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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

  it('counts gear + gem + enchant axes correctly', () => {
    const axes: OptimizationAxis[] = [
      // Gear axis: 2 items for head slot (one with socket, one without)
      {
        id: 'slot:head',
        label: 'Head',
        options: [
          { id: 'item_100_0', label: 'Item A (1 socket)', simcLines: [] },
          { id: 'item_200_1', label: 'Item B (no socket)', simcLines: ['head=,id=200'] },
        ],
      },
      // Conditional gem axis: 3 gems for item A's socket
      {
        id: 'gem:head:100:socket_0',
        label: 'Head socket 1 (Item A)',
        parentItemId: 100,
        parentSlot: 'head',
        options: [
          { id: 'gem_1', label: 'Mastery', simcLines: [] },
          { id: 'gem_2', label: 'Haste', simcLines: [] },
          { id: 'gem_3', label: 'Crit', simcLines: [] },
        ],
      },
      // Enchant axis: 2 enchants for finger1
      {
        id: 'enchant:finger1',
        label: 'Ring 1 Enchant',
        options: [
          { id: 'enchant_7340', label: 'Crit', simcLines: [] },
          { id: 'enchant_7341', label: 'Mastery', simcLines: [] },
        ],
      },
    ];
    // Item A: 3 gem options, Item B: 1 → slot contributes (3 + 1) = 4
    // × 2 enchant options = 8
    expect(countCombinations(axes)).toBe(8);
  });

  it('counts gems correctly for paired slots (trinkets/rings)', () => {
    const axes: OptimizationAxis[] = [
      // Paired trinket axis: 3 pairs from 3 items (A, B, C)
      {
        id: 'slot:trinkets',
        label: 'Trinkets',
        options: [
          { id: 'pair_100_200', label: 'A + B', simcLines: [] },
          { id: 'pair_100_300', label: 'A + C', simcLines: ['trinket1=,id=100', 'trinket2=,id=300'] },
          { id: 'pair_200_300', label: 'B + C', simcLines: ['trinket1=,id=200', 'trinket2=,id=300'] },
        ],
      },
      // Gem axis for item A (id=100, has 1 socket)
      {
        id: 'gem:trinket1:100:socket_0',
        label: 'Trinket socket (Item A)',
        parentItemId: 100,
        parentSlot: 'trinket1',
        options: [
          { id: 'gem_1', label: 'Mastery', simcLines: [] },
          { id: 'gem_2', label: 'Haste', simcLines: [] },
        ],
      },
    ];
    // pair (A,B): A has 2 gem options → 2
    // pair (A,C): A has 2 gem options → 2
    // pair (B,C): neither has gems → 1
    // Total: 2 + 2 + 1 = 5
    expect(countCombinations(axes)).toBe(5);
  });

  it('counts gems for both items in a pair when both have sockets', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:rings',
        label: 'Rings',
        options: [
          { id: 'pair_100_200', label: 'A + B', simcLines: [] },
          { id: 'pair_100_300', label: 'A + C', simcLines: ['finger1=,id=100', 'finger2=,id=300'] },
        ],
      },
      // Gem axis for item A (id=100)
      {
        id: 'gem:finger1:100:socket_0',
        label: 'Ring socket (Item A)',
        parentItemId: 100,
        parentSlot: 'finger1',
        options: [
          { id: 'gem_1', label: 'Mastery', simcLines: [] },
          { id: 'gem_2', label: 'Haste', simcLines: [] },
        ],
      },
      // Gem axis for item B (id=200)
      {
        id: 'gem:finger2:200:socket_0',
        label: 'Ring socket (Item B)',
        parentItemId: 200,
        parentSlot: 'finger2',
        options: [
          { id: 'gem_10', label: 'Crit', simcLines: [] },
          { id: 'gem_11', label: 'Vers', simcLines: [] },
          { id: 'gem_12', label: 'Mastery', simcLines: [] },
        ],
      },
    ];
    // pair (A,B): A has 2 gems × B has 3 gems = 6
    // pair (A,C): A has 2 gems × C has 0 gems = 2
    // Total: 6 + 2 = 8
    expect(countCombinations(axes)).toBe(8);
  });
});

describe('generateCombinations', () => {
  it('generates single axis combinations', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: [
          { id: 'item_100_0', label: 'A', simcLines: [] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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
          { id: 'item_100_0', label: 'A', simcLines: [] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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
          { id: 'item_100_0', label: 'A (equipped)', simcLines: [] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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
          { id: 'item_100_0', label: 'A', simcLines: [] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
          { id: 'item_300_2', label: 'C', simcLines: ['trinket1=,id=300'] },
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
          { id: 'item_100_0', label: 'Item A (1 socket)', simcLines: [] },
          { id: 'item_200_1', label: 'Item B (no socket)', simcLines: ['head=,id=200'] },
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
      (c) => c.axes['slot:head'] === 'item_200_1',
    );
    expect(itemBCombos).toHaveLength(1);
    expect(itemBCombos[0].axes['gem:head:100:socket_0']).toBeUndefined();
  });

  it('generates gear + gem + enchant combinations correctly', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:head',
        label: 'Head',
        options: [
          { id: 'item_100_0', label: 'Item A (1 socket)', simcLines: [] },
          { id: 'item_200_1', label: 'Item B (no socket)', simcLines: ['head=,id=200'] },
        ],
      },
      {
        id: 'gem:head:100:socket_0',
        label: 'Head socket 1 (Item A)',
        parentItemId: 100,
        parentSlot: 'head',
        options: [
          { id: 'gem_1', label: 'Mastery', simcLines: [] },
          { id: 'gem_2', label: 'Haste', simcLines: [] },
        ],
      },
      {
        id: 'enchant:finger1',
        label: 'Ring 1 Enchant',
        options: [
          { id: 'enchant_7340', label: 'Crit', simcLines: [] },
          { id: 'enchant_7341', label: 'Mastery', simcLines: [] },
        ],
      },
    ];

    const combos = generateCombinations(axes);
    // Item A: 2 gem options × 2 enchant options = 4
    // Item B: 1 (no gems) × 2 enchant options = 2
    // Total: 6
    expect(combos).toHaveLength(6);

    // Verify all combos have an enchant axis selection
    for (const combo of combos) {
      expect(combo.axes['enchant:finger1']).toBeDefined();
    }

    // Item A combos should have gem selections
    const itemACombos = combos.filter((c) => c.axes['slot:head'] === 'item_100_0');
    expect(itemACombos).toHaveLength(4);
    for (const combo of itemACombos) {
      expect(combo.axes['gem:head:100:socket_0']).toBeDefined();
    }

    // Item B combos should NOT have gem selections
    const itemBCombos = combos.filter((c) => c.axes['slot:head'] === 'item_200_1');
    expect(itemBCombos).toHaveLength(2);
    for (const combo of itemBCombos) {
      expect(combo.axes['gem:head:100:socket_0']).toBeUndefined();
    }
  });

  it('handles gem axes for paired slots (trinkets) correctly', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinkets',
        label: 'Trinkets',
        options: [
          { id: 'pair_100_200', label: 'A + B', simcLines: [] },
          { id: 'pair_100_300', label: 'A + C', simcLines: ['trinket1=,id=100', 'trinket2=,id=300'] },
          { id: 'pair_200_300', label: 'B + C', simcLines: ['trinket1=,id=200', 'trinket2=,id=300'] },
        ],
      },
      // Gem for item A (id=100)
      {
        id: 'gem:trinket1:100:socket_0',
        label: 'Trinket socket (A)',
        parentItemId: 100,
        parentSlot: 'trinket1',
        options: [
          { id: 'gem_1', label: 'Mastery', simcLines: [] },
          { id: 'gem_2', label: 'Haste', simcLines: [] },
        ],
      },
    ];

    const combos = generateCombinations(axes);
    // pair(A,B): A has gems → 2
    // pair(A,C): A has gems → 2
    // pair(B,C): no gems → 1
    // Total: 5
    expect(combos).toHaveLength(5);

    // pair(B,C) should NOT have gem axis
    const bcCombos = combos.filter((c) => c.axes['slot:trinkets'] === 'pair_200_300');
    expect(bcCombos).toHaveLength(1);
    expect(bcCombos[0].axes['gem:trinket1:100:socket_0']).toBeUndefined();

    // pair(A,B) SHOULD have gem axis
    const abCombos = combos.filter((c) => c.axes['slot:trinkets'] === 'pair_100_200');
    expect(abCombos).toHaveLength(2);
    for (const combo of abCombos) {
      expect(combo.axes['gem:trinket1:100:socket_0']).toBeDefined();
    }
  });

  it('throws CombinationCapExceededError when count exceeds cap', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${i}_${i}`,
          label: `Item ${i}`,
          simcLines: i === 0 ? [] : [`trinket1=,id=${i}`],
        })),
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${100 + i}_${i}`,
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
          { id: 'item_100_0', label: 'A', simcLines: [] },
          { id: 'item_200_1', label: 'B', simcLines: ['trinket1=,id=200'] },
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
