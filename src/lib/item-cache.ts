import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import type { SimcProfile } from './types';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORE_NAME = 'item-cache.json';

export interface CachedItem {
  id: number;
  name: string;
  ilvl: number;
  quality: number; // 0-5
  slot: string;
  fetchedAt: number; // timestamp for TTL
}

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_NAME);
  }
  return storeInstance;
}

/**
 * Parse Wowhead XML response into a CachedItem.
 */
function parseWowheadXml(xml: string, itemId: number): CachedItem | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const itemEl = doc.querySelector('item');
    if (!itemEl) return null;

    const name = itemEl.querySelector('name')?.textContent ?? `Item #${itemId}`;
    const level = parseInt(itemEl.querySelector('level')?.textContent ?? '0', 10);
    const qualityEl = itemEl.querySelector('quality');
    const quality = parseInt(qualityEl?.getAttribute('id') ?? '0', 10);
    const slotEl = itemEl.querySelector('inventorySlot');
    const slot = slotEl?.textContent ?? '';

    return {
      id: itemId,
      name,
      ilvl: level,
      quality,
      slot,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Get item data by ID. Checks cache first, then fetches from Wowhead.
 * Returns null if both fail — never throws.
 */
export async function getItemData(id: number): Promise<CachedItem | null> {
  try {
    const store = await getStore();
    const cached = await store.get<CachedItem>(`item_${id}`);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }

    // Fetch from Wowhead via Tauri backend (avoids CORS)
    const xml = await invoke<string>('fetch_item_data', { itemId: id });
    const parsed = parseWowheadXml(xml, id);

    if (parsed) {
      await store.set(`item_${id}`, parsed);
      await store.save();
      return parsed;
    }

    // Fall back to stale cache if fresh fetch failed to parse
    return cached ?? null;
  } catch {
    // Fallback: return cached if available, otherwise null
    try {
      const store = await getStore();
      return (await store.get<CachedItem>(`item_${id}`)) ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Prefetch item data for all items in a parsed SimC profile.
 * Runs in parallel with a concurrency limit of 5.
 * Never blocks or throws — items that fail to resolve will show as "Item #ID".
 */
export async function prefetchAllItems(profile: SimcProfile): Promise<void> {
  const allIds = getAllItemIds(profile);
  await pLimit(
    allIds.map((id) => () => getItemData(id)),
    5,
  );
}

/**
 * Get a display-safe item name. Returns "Item #ID" as fallback.
 */
export function getItemDisplayName(id: number, cached: CachedItem | null): string {
  return cached?.name ?? `Item #${id}`;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function getAllItemIds(profile: SimcProfile): number[] {
  const ids = new Set<number>();
  for (const items of Object.values(profile.gear)) {
    for (const item of items) {
      ids.add(item.id);
    }
  }
  return Array.from(ids);
}

/**
 * Run async tasks with a concurrency limit.
 */
async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}
