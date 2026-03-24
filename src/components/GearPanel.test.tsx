import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import GearPanel from './GearPanel';
import type { SimcProfile } from '../lib/types';

// Mock item-cache (Tauri store not available in jsdom)
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

function makeItem(overrides: Partial<{ slot: string; id: number; isEquipped: boolean }>) {
  return {
    slot: overrides.slot ?? 'head',
    id: overrides.id ?? 100,
    bonusIds: [10355],
    gemIds: [],
    isEquipped: overrides.isEquipped ?? true,
  };
}

describe('GearPanel', () => {
  afterEach(cleanup);
  it('renders a card for each slot with items', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true })],
      trinket1: [
        makeItem({ slot: 'trinket1', id: 2, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByText('Trinket 1')).toBeInTheDocument();
    // Slots with no items should not render
    expect(screen.queryByText('Neck')).not.toBeInTheDocument();
  });

  it('does not render empty slots', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1 })],
    });

    render(<GearPanel profile={profile} />);

    // Head slot should be present (1 card rendered)
    const cards = screen.getAllByText('1 item');
    expect(cards).toHaveLength(1);
    // Slots not in the profile should not render
    expect(screen.queryByText('Shoulders')).not.toBeInTheDocument();
    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('shows bag item count summary', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
      trinket1: [
        makeItem({ slot: 'trinket1', id: 3, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 4, isEquipped: false }),
        makeItem({ slot: 'trinket1', id: 5, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('3 bag items available to compare')).toBeInTheDocument();
  });

  it('shows item count per card', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 1, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 2, isEquipped: false }),
        makeItem({ slot: 'trinket1', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('Trinket 1')).toBeInTheDocument();
  });

  it('shows "equipped" and "bag" badges on items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const equippedBadges = screen.getAllByText('equipped');
    const bagBadges = screen.getAllByText('bag');
    expect(equippedBadges.length).toBeGreaterThanOrEqual(1);
    expect(bagBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders gem socket dots for items with gems', () => {
    const profile = makeProfile({
      head: [
        {
          slot: 'head',
          id: 1,
          bonusIds: [10355],
          gemIds: [213743, 213744],
          isEquipped: true,
        },
      ],
    });

    render(<GearPanel profile={profile} />);

    const socketDots = screen.getAllByTitle(/Socket \d/);
    expect(socketDots).toHaveLength(2);
  });

  it('shows all 16 slots when profile has full gear', () => {
    const allSlots = [
      'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
      'hands', 'waist', 'legs', 'feet',
      'finger1', 'finger2', 'trinket1', 'trinket2',
      'main_hand', 'off_hand',
    ];

    const gear: SimcProfile['gear'] = {};
    allSlots.forEach((slot, i) => {
      gear[slot] = [makeItem({ slot, id: i + 100 })];
    });

    render(<GearPanel profile={makeProfile(gear)} />);

    // Each card renders the equipped badge — 16 slots = 16 equipped badges
    const equippedBadges = screen.getAllByText('equipped');
    expect(equippedBadges).toHaveLength(16);
  });
});
