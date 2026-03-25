import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CombinationCounter, { WARN_THRESHOLD, BLOCK_THRESHOLD } from './CombinationCounter';
import type { OptimizationAxis } from '../lib/types';

/**
 * Build axes that produce exactly `count` combinations.
 * Uses items in one or two slot axes to hit the target via cartesian product.
 */
function buildAxesForCount(targetCount: number): OptimizationAxis[] {
  if (targetCount <= 1) return [];

  // Try a single axis first
  if (targetCount <= 50) {
    return [{
      id: 'slot:trinket1',
      label: 'Trinket 1',
      options: Array.from({ length: targetCount }, (_, i) => ({
        id: `item_${100 + i}`,
        label: `Item ${100 + i}`,
        simcLines: [`trinket1=,id=${100 + i}`],
      })),
    }];
  }

  // Use two axes: ceil(sqrt) × floor to approximate
  const a = Math.ceil(Math.sqrt(targetCount));
  const b = Math.ceil(targetCount / a);
  return [
    {
      id: 'slot:trinket1',
      label: 'Trinket 1',
      options: Array.from({ length: a }, (_, i) => ({
        id: `item_${100 + i}`,
        label: `Item ${100 + i}`,
        simcLines: [`trinket1=,id=${100 + i}`],
      })),
    },
    {
      id: 'slot:trinket2',
      label: 'Trinket 2',
      options: Array.from({ length: b }, (_, i) => ({
        id: `item_${200 + i}`,
        label: `Item ${200 + i}`,
        simcLines: [`trinket2=,id=${200 + i}`],
      })),
    },
  ];
}

describe('CombinationCounter', () => {
  afterEach(cleanup);

  it('shows "1 combination" when no axes', () => {
    render(<CombinationCounter axes={[]} />);
    expect(screen.getByText('combination')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows green urgency for count < 50', () => {
    const axes = buildAxesForCount(10);
    const { container } = render(<CombinationCounter axes={axes} />);
    expect(container.querySelector('[data-urgency="green"]')).toBeInTheDocument();
  });

  it('shows warning text at yellow threshold (50–200)', () => {
    const axes = buildAxesForCount(50);
    const { container } = render(<CombinationCounter axes={axes} />);
    expect(container.querySelector('[data-urgency="yellow"]')).toBeInTheDocument();
    expect(screen.getByText('May take a while')).toBeInTheDocument();
  });

  it('shows warning at > 200 combinations (orange)', () => {
    const axes = buildAxesForCount(210);
    const { container } = render(<CombinationCounter axes={axes} />);
    expect(container.querySelector('[data-urgency="orange"]')).toBeInTheDocument();
    expect(screen.getByText('May take 10+ minutes')).toBeInTheDocument();
  });

  it('shows blocked state at > 1000 combinations', () => {
    // 34 × 31 = 1054 > 1000
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: Array.from({ length: 34 }, (_, i) => ({
          id: `item_${100 + i}`,
          label: `Item ${100 + i}`,
          simcLines: [`trinket1=,id=${100 + i}`],
        })),
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: Array.from({ length: 31 }, (_, i) => ({
          id: `item_${200 + i}`,
          label: `Item ${200 + i}`,
          simcLines: [`trinket2=,id=${200 + i}`],
        })),
      },
    ];
    const { container } = render(<CombinationCounter axes={axes} />);
    expect(container.querySelector('[data-urgency="blocked"]')).toBeInTheDocument();
    expect(screen.getByText('Too many — deselect some items')).toBeInTheDocument();
  });

  it('blocked warning has role="alert" for accessibility', () => {
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: Array.from({ length: 34 }, (_, i) => ({
          id: `item_${100 + i}`,
          label: `Item ${100 + i}`,
          simcLines: [`trinket1=,id=${100 + i}`],
        })),
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: Array.from({ length: 31 }, (_, i) => ({
          id: `item_${200 + i}`,
          label: `Item ${200 + i}`,
          simcLines: [`trinket2=,id=${200 + i}`],
        })),
      },
    ];
    render(<CombinationCounter axes={axes} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too many — deselect some items');
  });

  it('calls onBlockedChange(true) when blocked', () => {
    const onBlocked = vi.fn();
    const axes: OptimizationAxis[] = [
      {
        id: 'slot:trinket1',
        label: 'Trinket 1',
        options: Array.from({ length: 34 }, (_, i) => ({
          id: `item_${100 + i}`,
          label: `Item ${100 + i}`,
          simcLines: [`trinket1=,id=${100 + i}`],
        })),
      },
      {
        id: 'slot:trinket2',
        label: 'Trinket 2',
        options: Array.from({ length: 31 }, (_, i) => ({
          id: `item_${200 + i}`,
          label: `Item ${200 + i}`,
          simcLines: [`trinket2=,id=${200 + i}`],
        })),
      },
    ];
    render(<CombinationCounter axes={axes} onBlockedChange={onBlocked} />);
    expect(onBlocked).toHaveBeenCalledWith(true);
  });

  it('calls onBlockedChange(false) when not blocked', () => {
    const onBlocked = vi.fn();
    const axes = buildAxesForCount(10);
    render(<CombinationCounter axes={axes} onBlockedChange={onBlocked} />);
    expect(onBlocked).toHaveBeenCalledWith(false);
  });

  it('exports correct threshold constants', () => {
    expect(WARN_THRESHOLD).toBe(200);
    expect(BLOCK_THRESHOLD).toBe(1000);
  });

  it('shows enchant axis count in breakdown', () => {
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
          { id: 'enchant_7341', label: 'Mastery', simcLines: [] },
        ],
      },
      {
        id: 'enchant:finger2',
        label: 'Ring 2 Enchant',
        options: [
          { id: 'enchant_7340', label: 'Crit', simcLines: [] },
          { id: 'enchant_7341', label: 'Mastery', simcLines: [] },
        ],
      },
    ];
    render(<CombinationCounter axes={axes} />);
    expect(screen.getByText(/2 enchants/)).toBeInTheDocument();
  });

  it('does not show warning for idle/green urgency', () => {
    render(<CombinationCounter axes={[]} />);
    expect(screen.queryByText('May take a while')).not.toBeInTheDocument();
    expect(screen.queryByText('May take 10+ minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('Too many — deselect some items')).not.toBeInTheDocument();
  });
});
