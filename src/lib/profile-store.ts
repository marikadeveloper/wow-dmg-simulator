import { Store } from '@tauri-apps/plugin-store';

const STORE_NAME = 'profile-store.json';
const KEY = 'lastSimcInput';

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_NAME);
  }
  return storeInstance;
}

/** Save the raw SimC input string for restoration on next launch. */
export async function saveLastInput(input: string): Promise<void> {
  try {
    const store = await getStore();
    await store.set(KEY, input);
    await store.save();
  } catch {
    // Non-critical — silently ignore persistence failures
  }
}

/** Load the previously saved SimC input string, or empty string if none. */
export async function loadLastInput(): Promise<string> {
  try {
    const store = await getStore();
    return (await store.get<string>(KEY)) ?? '';
  } catch {
    return '';
  }
}

/** Clear the saved SimC input. */
export async function clearLastInput(): Promise<void> {
  try {
    const store = await getStore();
    await store.delete(KEY);
    await store.save();
  } catch {
    // Non-critical
  }
}
