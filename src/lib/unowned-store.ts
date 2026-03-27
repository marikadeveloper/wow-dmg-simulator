import { Store } from '@tauri-apps/plugin-store';
import type { GearItem } from './types';

const STORE_NAME = 'unowned-items.json';
const KEY = 'unownedItems';

/** Serializable format for persistence (Maps aren't JSON-friendly). */
type SerializedUnowned = Array<[string, GearItem[]]>;

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_NAME);
  }
  return storeInstance;
}

/** Save unowned items map to disk. */
export async function saveUnownedItems(items: Map<string, GearItem[]>): Promise<void> {
  try {
    const store = await getStore();
    const serialized: SerializedUnowned = Array.from(items.entries());
    await store.set(KEY, serialized);
    await store.save();
  } catch {
    // Non-critical — silently ignore persistence failures
  }
}

/** Load previously saved unowned items, or empty map if none. */
export async function loadUnownedItems(): Promise<Map<string, GearItem[]>> {
  try {
    const store = await getStore();
    const data = await store.get<SerializedUnowned>(KEY);
    if (data && Array.isArray(data)) {
      return new Map(data);
    }
  } catch {
    // Non-critical
  }
  return new Map();
}
