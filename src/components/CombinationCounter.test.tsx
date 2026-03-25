import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CombinationCounter, { WARN_THRESHOLD, BLOCK_THRESHOLD } from './CombinationCounter';
import type { SimcProfile } from '../lib/types';

// Mock item-cache (not needed here but GearSlotCard uses it)
vi.mock('../lib/item-cache', () => ({
  getItemData: vi.fn(async (id: number) => ({
    id,
    name: `Test Item ${id}`,
    ilvl: 639,
    quality: 4,
    slot: 'head',
    fetchedAt: Date.now(),
  })),
  getItemDisplayName: vi.fn((_id: number, cached: unknown) =>
    cached && typeof cached === 'object' && 'name' in cached
      ? (cached as { name: string }).name
      : `Item #${_id}`,
  ),
}));

function makeProfile(gear: SimcProfile['gear']): SimcProfile {
  return {
    characterName: 'Testchar',
    realm: 'testrealm',
    region: 'us',
    race: 'human',
    spec: 'arms',
    level: 80,
    talentString: 'AAAA',
    gear,
    rawLines: [],
  };
}

function makeItem(slot: string, id: number, isEquipped = false) {
  return { slot, id, bonusIds: [10355], gemIds: [], isEquipped };
}

/**
 * Build a profile and selection that produces exactly `count` combinations.
 * We use N items in slot A × M items in slot B = N*M combos.
 */
function buildForCount(targetCount: number): {
  profile: SimcProfile;
  selection: Set<string>;
} {
  // Factor targetCount into two groups to create a cartesian product
  // For simplicity: one slot with targetCount items, selection on all
  if (targetCount <= 1) {
    const profile = makeProfile({
      head: [makeItem('head', 1, true)],
    });
    return { profile, selection: new Set(['head:0']) };
  }

  // Use two slots: slot A with ceil(sqrt(target)) items, slot B with enough to reach target
  // Simpler approach: just put all items in one slot
  const items = Array.from({ length: targetCount }, (_, i) =>
    makeItem('trinket1', 100 + i, i === 0),
  );
  const selection = new Set(items.map((_, i) => `trinket1:${i}`));
  const profile = makeProfile({ trinket1: items });
  return { profile, selection };
}

describe('CombinationCounter', () => {
  afterEach(cleanup);

  it('shows "1 combination" for a single item', () => {
    const { profile, selection } = buildForCount(1);
    render(<CombinationCounter profile={profile} selection={selection} />);
    expect(screen.getByText('combination')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows green urgency for count < 50', () => {
    const { profile, selection } = buildForCount(10);
    const { container } = render(
      <CombinationCounter profile={profile} selection={selection} />,
    );
    expect(container.querySelector('[data-urgency="green"]')).toBeInTheDocument();
  });

  it('shows warning text at yellow threshold (50–200)', () => {
    // 50 items in one slot = 50 combos
    const items = Array.from({ length: 50 }, (_, i) =>
      makeItem('trinket1', 100 + i, i === 0),
    );
    const selection = new Set(items.map((_, i) => `trinket1:${i}`));
    const profile = makeProfile({ trinket1: items });

    const { container } = render(
      <CombinationCounter profile={profile} selection={selection} />,
    );
    expect(container.querySelector('[data-urgency="yellow"]')).toBeInTheDocument();
    expect(screen.getByText('May take a while')).toBeInTheDocument();
  });

  it('shows warning at > 200 combinations (orange)', () => {
    // 201 combos → need items across two slots: e.g. 15 × 14 = 210
    const slotA = Array.from({ length: 15 }, (_, i) =>
      makeItem('trinket1', 100 + i, i === 0),
    );
    const slotB = Array.from({ length: 14 }, (_, i) =>
      makeItem('trinket2', 200 + i, i === 0),
    );
    const selection = new Set([
      ...slotA.map((_, i) => `trinket1:${i}`),
      ...slotB.map((_, i) => `trinket2:${i}`),
    ]);
    const profile = makeProfile({ trinket1: slotA, trinket2: slotB });

    const { container } = render(
      <CombinationCounter profile={profile} selection={selection} />,
    );
    expect(container.querySelector('[data-urgency="orange"]')).toBeInTheDocument();
    expect(screen.getByText('May take 10+ minutes')).toBeInTheDocument();
  });

  it('shows blocked state at > 1000 combinations', () => {
    // 34 × 31 = 1054 > 1000
    const slotA = Array.from({ length: 34 }, (_, i) =>
      makeItem('trinket1', 100 + i, i === 0),
    );
    const slotB = Array.from({ length: 31 }, (_, i) =>
      makeItem('trinket2', 200 + i, i === 0),
    );
    const selection = new Set([
      ...slotA.map((_, i) => `trinket1:${i}`),
      ...slotB.map((_, i) => `trinket2:${i}`),
    ]);
    const profile = makeProfile({ trinket1: slotA, trinket2: slotB });

    const { container } = render(
      <CombinationCounter profile={profile} selection={selection} />,
    );
    expect(container.querySelector('[data-urgency="blocked"]')).toBeInTheDocument();
    expect(screen.getByText('Too many — deselect some items')).toBeInTheDocument();
  });

  it('blocked warning has role="alert" for accessibility', () => {
    const slotA = Array.from({ length: 34 }, (_, i) =>
      makeItem('trinket1', 100 + i, i === 0),
    );
    const slotB = Array.from({ length: 31 }, (_, i) =>
      makeItem('trinket2', 200 + i, i === 0),
    );
    const selection = new Set([
      ...slotA.map((_, i) => `trinket1:${i}`),
      ...slotB.map((_, i) => `trinket2:${i}`),
    ]);
    const profile = makeProfile({ trinket1: slotA, trinket2: slotB });

    render(<CombinationCounter profile={profile} selection={selection} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too many — deselect some items');
  });

  it('calls onBlockedChange(true) when blocked', () => {
    const onBlocked = vi.fn();
    const slotA = Array.from({ length: 34 }, (_, i) =>
      makeItem('trinket1', 100 + i, i === 0),
    );
    const slotB = Array.from({ length: 31 }, (_, i) =>
      makeItem('trinket2', 200 + i, i === 0),
    );
    const selection = new Set([
      ...slotA.map((_, i) => `trinket1:${i}`),
      ...slotB.map((_, i) => `trinket2:${i}`),
    ]);
    const profile = makeProfile({ trinket1: slotA, trinket2: slotB });

    render(
      <CombinationCounter
        profile={profile}
        selection={selection}
        onBlockedChange={onBlocked}
      />,
    );
    expect(onBlocked).toHaveBeenCalledWith(true);
  });

  it('calls onBlockedChange(false) when not blocked', () => {
    const onBlocked = vi.fn();
    const { profile, selection } = buildForCount(10);
    render(
      <CombinationCounter
        profile={profile}
        selection={selection}
        onBlockedChange={onBlocked}
      />,
    );
    expect(onBlocked).toHaveBeenCalledWith(false);
  });

  it('exports correct threshold constants', () => {
    expect(WARN_THRESHOLD).toBe(200);
    expect(BLOCK_THRESHOLD).toBe(1000);
  });

  it('does not show warning for idle/green urgency', () => {
    const { profile, selection } = buildForCount(1);
    render(<CombinationCounter profile={profile} selection={selection} />);
    expect(screen.queryByText('May take a while')).not.toBeInTheDocument();
    expect(screen.queryByText('May take 10+ minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('Too many — deselect some items')).not.toBeInTheDocument();
  });
});
