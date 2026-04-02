import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CombinationCounter, { WARN_THRESHOLD, BLOCK_THRESHOLD } from './CombinationCounter';
import type { OptimizationAxis } from '../lib/types';

/**
 * Build axes that produce exactly `count` combinations with the additive model.
 * Creates multiple single-slot axes. Total = 1 (baseline) + sum of non-baseline options.
 * Each axis has 1 baseline (empty simcLines) + N alternatives.
 */
function buildAxesForCount(targetCount: number): OptimizationAxis[] {
  if (targetCount <= 1) return [];

  // We need (targetCount - 1) non-baseline options total across all axes.
  // Use a single axis: 1 baseline + (targetCount - 1) alternatives = targetCount options.
  const alts = targetCount - 1;
  return [{
    id: 'slot:head',
    label: 'Head',
    options: [
      { id: 'item_100_0', label: 'Equipped', simcLines: [] },
      ...Array.from({ length: alts }, (_, i) => ({
        id: `item_${101 + i}_${1 + i}`,
        label: `Item ${101 + i}`,
        simcLines: [`head=,id=${101 + i}`],
      })),
    ],
  }];
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
    // Additive: 1 baseline + 1001 alts = 1002 > 1000
    const axes = buildAxesForCount(1002);
    const { container } = render(<CombinationCounter axes={axes} />);
    expect(container.querySelector('[data-urgency="blocked"]')).toBeInTheDocument();
    expect(screen.getByText('Too many — deselect some items')).toBeInTheDocument();
  });

  it('blocked warning has role="alert" for accessibility', () => {
    const axes = buildAxesForCount(1002);
    render(<CombinationCounter axes={axes} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too many — deselect some items');
  });

  it('calls onBlockedChange(true) when blocked', () => {
    const onBlocked = vi.fn();
    const axes = buildAxesForCount(1002);
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

  it('shows combination breakdown formula', () => {
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
    // Shows each factor in the breakdown: "1 Trinket 1 + 1 Ring 1 Enchant + 1 Ring 2 Enchant"
    expect(screen.getByText(/Trinket 1/)).toBeInTheDocument();
    expect(screen.getByText(/Ring 1 Enchant/)).toBeInTheDocument();
    expect(screen.getByText(/Ring 2 Enchant/)).toBeInTheDocument();
  });

  it('does not show warning for idle/green urgency', () => {
    render(<CombinationCounter axes={[]} />);
    expect(screen.queryByText('May take a while')).not.toBeInTheDocument();
    expect(screen.queryByText('May take 10+ minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('Too many — deselect some items')).not.toBeInTheDocument();
  });
});
