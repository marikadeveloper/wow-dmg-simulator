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

function makeItem(overrides: Partial<{ slot: string; id: number; isEquipped: boolean; isVault: boolean; enchantId: number; ilvl: number; name: string; bonusIds: number[] }>) {
  return {
    slot: overrides.slot ?? 'head',
    id: overrides.id ?? 100,
    bonusIds: overrides.bonusIds ?? [10355],
    gemIds: [],
    isEquipped: overrides.isEquipped ?? true,
    ...(overrides.isVault && { isVault: true }),
    ...(overrides.enchantId != null && { enchantId: overrides.enchantId }),
    ...(overrides.ilvl != null && { ilvl: overrides.ilvl }),
    ...(overrides.name != null && { name: overrides.name }),
  };
}

/** Get only the item-toggle buttons inside gear cards (those with aria-pressed) */
function getItemButtons() {
  const gearCards = document.querySelectorAll('.gear-card');
  const buttons: HTMLElement[] = [];
  gearCards.forEach((card) => {
    card.querySelectorAll<HTMLElement>('button[aria-pressed]').forEach((btn) => {
      buttons.push(btn);
    });
  });
  return buttons;
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

    const { container } = render(<GearPanel profile={profile} />);

    // Check gear cards specifically (not optimization panel labels)
    const gearCards = container.querySelectorAll('.gear-card');
    expect(gearCards).toHaveLength(2);
    expect(screen.getByText('Trinket 1')).toBeInTheDocument();
  });

  it('does not render empty slots', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1 })],
    });

    const { container } = render(<GearPanel profile={profile} />);

    expect(screen.getByText('1/1 selected')).toBeInTheDocument();
    // Only 1 gear card rendered (head), not shoulders or back
    const gearCards = container.querySelectorAll('.gear-card');
    expect(gearCards).toHaveLength(1);
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

  it('renders gem icons with name and stat tooltip', () => {
    const profile = makeProfile({
      head: [
        {
          slot: 'head',
          id: 1,
          bonusIds: [10355],
          gemIds: [240892, 240904],
          isEquipped: true,
        },
      ],
    });

    render(<GearPanel profile={profile} />);

    // Gems shown as icons with name + stat in title tooltip (may appear in both item row and gem picker)
    expect(screen.getAllByTitle(/Flawless Masterful Peridot.*Haste \+ Mastery/s).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle(/Flawless Deadly Garnet.*Crit/s).length).toBeGreaterThanOrEqual(1);
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

  it('shows item level and gear track from parsed SimC data', () => {
    // bonus_id 12790 = Champion 6/6
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, ilvl: 263, bonusIds: [12790] })],
    });

    render(<GearPanel profile={profile} />);

    const ilvl = screen.getByTitle('Champion 6/6 — ilvl 263');
    expect(ilvl).toHaveTextContent('263');
    expect(ilvl).toHaveTextContent('Champion 6/6');
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

  it('shows enchant name with stat tooltip for known enchantId', () => {
    // 7964 = Amani Mastery, stat: Mastery
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, enchantId: 7964 })],
    });

    render(<GearPanel profile={profile} />);

    // The enchant name appears both in the item row (with title=stat) and in the
    // enchant optimization panel (as a chip). Find the one in the item row by its title.
    const enchantLabels = screen.getAllByText('Amani Mastery');
    expect(enchantLabels.length).toBeGreaterThanOrEqual(1);
    const itemRowLabel = enchantLabels.find((el) => el.getAttribute('title') === 'Mastery');
    expect(itemRowLabel).toBeDefined();
  });

  it('shows fallback label for unknown enchant IDs', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true, enchantId: 9999 })],
    });

    render(<GearPanel profile={profile} />);

    expect(screen.getByText('Enchant #9999')).toBeInTheDocument();
  });

  it('shows gem icon with name and stat tooltip for known gem IDs', () => {
    const profile = makeProfile({
      head: [{
        slot: 'head',
        id: 1,
        bonusIds: [10355],
        gemIds: [240892], // Flawless Masterful Peridot = Haste + Mastery
        isEquipped: true,
      }],
    });

    render(<GearPanel profile={profile} />);

    const gemIcons = screen.getAllByTitle(/Flawless Masterful Peridot.*Haste \+ Mastery/s);
    expect(gemIcons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows gem icon with fallback tooltip for unknown gem IDs', () => {
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

    expect(screen.getByTitle('Gem ID: 999999')).toBeInTheDocument();
  });

  it('does not show enchant or gem details on item row when item has neither', () => {
    const profile = makeProfile({
      head: [makeItem({ slot: 'head', id: 1, isEquipped: true })],
    });

    render(<GearPanel profile={profile} />);

    // No enchant label should appear inside gear card item rows
    // (the "Enchant Optimization" header is separate and expected)
    expect(screen.queryByText(/Enchant #/)).not.toBeInTheDocument();
    // Gem icons use title attributes, not text
    expect(screen.queryByTitle(/Gem ID/)).not.toBeInTheDocument();
  });

  it('shows "enchantable" badge on enchantable slots', () => {
    const profile = makeProfile({
      finger1: [makeItem({ slot: 'finger1', id: 1, isEquipped: true })],
    });
    render(<GearPanel profile={profile} />);
    expect(screen.getByText('enchantable')).toBeInTheDocument();
  });

  it('does not show "enchantable" badge on non-enchantable slots', () => {
    const profile = makeProfile({
      neck: [makeItem({ slot: 'neck', id: 1, isEquipped: true })],
    });
    render(<GearPanel profile={profile} />);
    expect(screen.queryByText('enchantable')).not.toBeInTheDocument();
  });

  it('shows "enchantable" badge on weapon slots', () => {
    const profile = makeProfile({
      main_hand: [makeItem({ slot: 'main_hand', id: 1, isEquipped: true })],
    });
    render(<GearPanel profile={profile} />);
    expect(screen.getByText('enchantable')).toBeInTheDocument();
  });
});
