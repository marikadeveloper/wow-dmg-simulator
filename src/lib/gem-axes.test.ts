import { describe, it, expect } from 'vitest';
import { buildGemAxes } from './gem-axes';
import type { SimcProfile, GearItem } from './types';

function makeItem(slot: string, id: number, gemIds: number[], isEquipped = false): GearItem {
  return { slot, id, bonusIds: [10355], gemIds, isEquipped };
}

function makeProfile(gear: SimcProfile['gear']): SimcProfile {
  return {
    characterName: 'Test',
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

describe('buildGemAxes', () => {
  it('returns empty array when no gem IDs are provided', () => {
    const profile = makeProfile({
      head: [makeItem('head', 1, [240892], true)],
    });
    const selection = new Set(['head:0']);
    expect(buildGemAxes(profile, selection, [])).toEqual([]);
  });

  it('returns empty array when no selected items have sockets', () => {
    const profile = makeProfile({
      head: [makeItem('head', 1, [], true)],
    });
    const selection = new Set(['head:0']);
    expect(buildGemAxes(profile, selection, [240892])).toEqual([]);
  });

  it('creates one axis per socket for a single-socket item', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892], true)],
    });
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [240888, 240896]);

    expect(axes).toHaveLength(1);
    expect(axes[0].id).toBe('gem:head:100:socket_0');
    expect(axes[0].parentItemId).toBe(100);
    expect(axes[0].parentSlot).toBe('head');
    expect(axes[0].options).toHaveLength(2);
    expect(axes[0].options[0].id).toBe('gem_240888');
    expect(axes[0].options[1].id).toBe('gem_240896');
  });

  it('creates two axes for a two-socket item', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892, 240904], true)],
    });
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [240888]);

    expect(axes).toHaveLength(2);
    expect(axes[0].id).toBe('gem:head:100:socket_0');
    expect(axes[1].id).toBe('gem:head:100:socket_1');
    // Both should reference same parent item
    expect(axes[0].parentItemId).toBe(100);
    expect(axes[1].parentItemId).toBe(100);
  });

  it('creates separate axes per item in same slot', () => {
    const profile = makeProfile({
      head: [
        makeItem('head', 100, [240892], true),       // 1 socket
        makeItem('head', 200, [240892, 240904]),      // 2 sockets
      ],
    });
    const selection = new Set(['head:0', 'head:1']);
    const axes = buildGemAxes(profile, selection, [240888]);

    // Item 100: 1 socket = 1 axis, Item 200: 2 sockets = 2 axes
    expect(axes).toHaveLength(3);
    expect(axes[0].parentItemId).toBe(100);
    expect(axes[1].parentItemId).toBe(200);
    expect(axes[2].parentItemId).toBe(200);
  });

  it('ignores unselected items', () => {
    const profile = makeProfile({
      head: [
        makeItem('head', 100, [240892], true),
        makeItem('head', 200, [240892, 240904]),
      ],
    });
    // Only item at index 0 selected
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [240888]);

    expect(axes).toHaveLength(1);
    expect(axes[0].parentItemId).toBe(100);
  });

  it('works across multiple slots', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892], true)],
      chest: [makeItem('chest', 200, [240904], true)],
    });
    const selection = new Set(['head:0', 'chest:0']);
    const axes = buildGemAxes(profile, selection, [240888]);

    expect(axes).toHaveLength(2);
    expect(axes.find((a) => a.parentItemId === 100)).toBeDefined();
    expect(axes.find((a) => a.parentItemId === 200)).toBeDefined();
  });

  it('gem options use known preset names', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892], true)],
    });
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [240888]);

    expect(axes[0].options[0].label).toBe('Flawless Quick Peridot');
  });

  it('gem options fall back to "Gem #ID" for unknown IDs', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892], true)],
    });
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [999999]);

    expect(axes[0].options[0].id).toBe('gem_999999');
    expect(axes[0].options[0].label).toBe('Gem #999999');
  });

  it('gem simcLines are empty (merged by profileset builder)', () => {
    const profile = makeProfile({
      head: [makeItem('head', 100, [240892], true)],
    });
    const selection = new Set(['head:0']);
    const axes = buildGemAxes(profile, selection, [240888]);

    expect(axes[0].options[0].simcLines).toEqual([]);
  });
});
