import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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

function makeItem(overrides: Partial<{ slot: string; id: number; isEquipped: boolean; isVault: boolean; enchantId: number; ilvl: number; name: string }>) {
  return {
    slot: overrides.slot ?? 'head',
    id: overrides.id ?? 100,
    bonusIds: [10355],
    gemIds: [],
    isEquipped: overrides.isEquipped ?? true,
    ...(overrides.isVault && { isVault: true }),
    ...(overrides.enchantId != null && { enchantId: overrides.enchantId }),
    ...(overrides.ilvl != null && { ilvl: overrides.ilvl }),
    ...(overrides.name != null && { name: overrides.name }),
  };
}

/** Get only the item-toggle buttons (those with aria-pressed) */
function getItemButtons() {
  return screen.getAllByRole('button').filter(
    (btn) => btn.hasAttribute('aria-pressed'),
  );
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
    expect(screen.queryByText('Neck')).not.toBeInTheDocument();
  });

  it('does not render empty slots', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1 })],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('1/1 selected')).toBeInTheDocument();
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

  it('shows selected count per card', () => {
    const profile = makeProfile({
      trinket1: [
        makeItem({ slot: 'trinket1', id: 1, isEquipped: true }),
        makeItem({ slot: 'trinket1', id: 2, isEquipped: false }),
        makeItem({ slot: 'trinket1', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    // 1 equipped item pre-selected out of 3 total
    expect(screen.getByText('1/3 selected')).toBeInTheDocument();
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

  it('renders gem labels for items with gems', () => {
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

    // Gem presets: 213743 = Mastery, 213744 = Haste
    expect(screen.getByText('Mastery')).toBeInTheDocument();
    expect(screen.getByText('Haste')).toBeInTheDocument();
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

    const equippedBadges = screen.getAllByText('equipped');
    expect(equippedBadges).toHaveLength(16);
  });

  it('pre-selects equipped items and not bag items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const buttons = getItemButtons();
    // Equipped item (first) should be pressed
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    // Bag item (second) should not be pressed
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles item selection on click', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const buttons = getItemButtons();

    // Bag item starts unselected
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');

    // Click to select
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');

    // Click to deselect
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows "vault" badge for vault items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false, isVault: true }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const vaultBadges = screen.getAllByText('vault');
    expect(vaultBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows vault item count in header', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false, isVault: true }),
        makeItem({ slot: 'head', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('1 vault item')).toBeInTheDocument();
    expect(screen.getByText('1 bag item available to compare')).toBeInTheDocument();
  });

  it('does not pre-select vault items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false, isVault: true }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const buttons = getItemButtons();
    // Equipped = selected, vault = not selected
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('prevents deselecting the last selected item in a slot', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const buttons = getItemButtons();

    // Equipped item is the only selected item
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');

    // Try to deselect the only selected item — should be a no-op
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1/2 selected')).toBeInTheDocument();
  });

  it('allows deselecting when multiple items are selected in a slot', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    const buttons = getItemButtons();

    // Select the bag item too
    fireEvent.click(buttons[1]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2/2 selected')).toBeInTheDocument();

    // Now deselecting one should work (2 → 1)
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1/2 selected')).toBeInTheDocument();
  });

  it('updates selected count when toggling items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
        makeItem({ slot: 'head', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('1/3 selected')).toBeInTheDocument();

    // Select a bag item
    const buttons = getItemButtons();
    fireEvent.click(buttons[1]);

    expect(screen.getByText('2/3 selected')).toBeInTheDocument();
  });

  it('shows "all / none" buttons for slots with 2+ items', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByLabelText('Select all Head items')).toBeInTheDocument();
    expect(screen.getByLabelText('Deselect all Head items')).toBeInTheDocument();
  });

  it('does not show "all / none" for single-item slots', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true })],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.queryByLabelText('Select all Head items')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Deselect all Head items')).not.toBeInTheDocument();
  });

  it('"Select all" selects every item in the slot', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
        makeItem({ slot: 'head', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    // Initially only equipped is selected
    expect(screen.getByText('1/3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select all Head items'));

    expect(screen.getByText('3/3 selected')).toBeInTheDocument();
    const buttons = getItemButtons();
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('"Deselect all" keeps only the equipped item selected', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
        makeItem({ slot: 'head', id: 3, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    // Select all first
    fireEvent.click(screen.getByLabelText('Select all Head items'));
    expect(screen.getByText('3/3 selected')).toBeInTheDocument();

    // Deselect all
    fireEvent.click(screen.getByLabelText('Deselect all Head items'));
    expect(screen.getByText('1/3 selected')).toBeInTheDocument();

    // Only equipped item remains selected
    const buttons = getItemButtons();
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
  });

  it('"Select all" button is disabled when all items already selected', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    // Select all
    fireEvent.click(screen.getByLabelText('Select all Head items'));

    expect(screen.getByLabelText('Select all Head items')).toBeDisabled();
  });

  it('"Deselect all" button is disabled when only 1 item selected', () => {
    const profile = makeProfile({
      head: [
        makeItem({ slot: 'head', id: 1, isEquipped: true }),
        makeItem({ slot: 'head', id: 2, isEquipped: false }),
      ],
    });

    render(<GearPanel profile={profile} />);

    // Initially only 1 selected
    expect(screen.getByLabelText('Deselect all Head items')).toBeDisabled();
  });

  it('shows item level from parsed SimC data', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, ilvl: 263 })],
    });

    render(<GearPanel profile={profile} />);

    const ilvl = screen.getByTitle('Item Level');
    expect(ilvl).toHaveTextContent('263');
  });

  it('colors item name by quality', async () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true })],
    });

    render(<GearPanel profile={profile} />);

    // Wait for item cache to resolve (quality 4 = epic = purple-400)
    const itemName = await screen.findByText('Test Item 1');
    expect(itemName.className).toContain('text-purple-400');
  });

  it('shows enchant name when item has a known enchantId', () => {
    // 7340 = Enchant Ring – Cursed Devotion, stat: Crit
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, enchantId: 7340 })],
    });

    render(<GearPanel profile={profile} />);

    const enchantLabel = screen.getByText('Crit');
    expect(enchantLabel).toBeInTheDocument();
    expect(enchantLabel).toHaveAttribute('title', 'Enchant Ring – Cursed Devotion');
  });

  it('shows fallback label for unknown enchant IDs', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, enchantId: 9999 })],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('Enchant #9999')).toBeInTheDocument();
  });

  it('shows gem stat labels for known gem IDs', () => {
    const profile = makeProfile({
      head: [{
        slot: 'head',
        id: 1,
        bonusIds: [10355],
        gemIds: [213743], // Masterful Ysemerald = Mastery
        isEquipped: true,
      }],
    });

    render(<GearPanel profile={profile} />);

    const gemLabel = screen.getByTitle('Masterful Ysemerald');
    expect(gemLabel).toBeInTheDocument();
    expect(screen.getByText('Mastery')).toBeInTheDocument();
  });

  it('shows fallback label for unknown gem IDs', () => {
    const profile = makeProfile({
      head: [{
        slot: 'head',
        id: 1,
        bonusIds: [10355],
        gemIds: [999999],
        isEquipped: true,
      }],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('Gem #999999')).toBeInTheDocument();
  });

  it('does not show enchant or gem details when item has neither', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true })],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.queryByText(/Enchant/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gem #/)).not.toBeInTheDocument();
  });
});
