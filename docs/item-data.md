# Item Data Resolution

## The Problem

The SimC addon export string only contains item IDs — not names, not item levels,
not stats. For example: `trinket1=,id=235616,bonus_id=10355/10257/1498/8767/10271`

The UI must show human-readable names: "Void-Scarred Effigy (ilvl 639)" not "id=235616".

---

## Strategy: Wowhead XML API + Local Cache

Wowhead exposes a public XML endpoint for every item (no authentication required):

```
GET https://www.wowhead.com/item=235616&xml
```

Returns XML like:

```xml
<wowhead>
  <item id="235616">
    <name><![CDATA[Void-Scarred Effigy]]></name>
    <level>639</level>
    <quality id="4">Epic</quality>
    <class id="4">Armor</class>
    <subclass id="0">Miscellaneous</subclass>
    <inventorySlot id="12">Trinket</inventorySlot>
    <icon displayId="..."><![CDATA[inv_icon_name]]></icon>
  </item>
</wowhead>
```

**Fields to extract:**

- `name` — display name
- `level` — item level (this is the BASE ilvl, not the bonus-upgraded ilvl)
- `quality` — for color coding (Poor=0, Common=1, Uncommon=2, Rare=3, Epic=4, Legendary=5)
- `inventorySlot` — confirmation of the slot (sanity check)

**Note on item level:** The `level` from Wowhead is the base ilvl. The actual equipped
ilvl depends on `bonus_ids` (upgrade tracks). For MVP, showing the base ilvl is acceptable.
A future enhancement could compute the actual ilvl from the bonus_id list.

---

## Caching Strategy

Item data changes rarely (only when Blizzard patches the game). Cache aggressively.

### Cache location

Use Tauri's `tauri-plugin-store` to persist a JSON cache in the OS app data directory.
The cache key is the item ID as a string.

```typescript
// src/lib/item-cache.ts
interface CachedItem {
  id: number;
  name: string;
  ilvl: number;
  quality: number; // 0-5
  slot: string; // normalized slot name
  fetchedAt: number; // timestamp for TTL
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getItemData(id: number): Promise<CachedItem | null> {
  // 1. Check Tauri store cache
  const cached = await store.get<CachedItem>(`item_${id}`);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  // 2. Fetch from Wowhead
  try {
    const xml = await fetchWowheadItem(id);
    const parsed = parseWowheadXml(xml, id);
    await store.set(`item_${id}`, { ...parsed, fetchedAt: Date.now() });
    return parsed;
  } catch {
    return cached ?? null; // fall back to stale cache if fetch fails
  }
}
```

### Batch fetching

When a SimC string is pasted, all item IDs are known immediately. Fetch all
of them in parallel with a concurrency limit to avoid hammering Wowhead:

```typescript
async function prefetchAllItems(profile: SimcProfile): Promise<void> {
  const allIds = getAllItemIds(profile); // flat array of unique IDs
  await pLimit(
    allIds.map((id) => () => getItemData(id)),
    5,
  ); // max 5 concurrent
}
```

Show a subtle loading indicator in each slot card while names are being fetched.
Once resolved, names appear in place. Never block the UI waiting for names.

---

## Fallback Behavior

If Wowhead is unreachable (offline mode) and no cache entry exists:

- Show `Item #235616` as the name
- Show `ilvl ?` for item level
- The simulation still works — names are only cosmetic

The app must be fully functional offline as long as item data was cached previously.

---

## Wowhead XML Fetch — Implementation Notes

The fetch must go through the Tauri backend (Rust), not the frontend, because
Wowhead returns CORS headers that block browser-style fetches.

```rust
// src-tauri/src/commands/item_data.rs
#[tauri::command]
pub async fn fetch_item_data(item_id: u32) -> Result<String, String> {
    let url = format!("https://www.wowhead.com/item={}&xml", item_id);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}
```

Add `reqwest` to `src-tauri/Cargo.toml`:

```toml
reqwest = { version = "0.11", features = ["json"] }
```

The TypeScript side calls `invoke<string>('fetch_item_data', { itemId: 235616 })`
and parses the returned XML string using the browser's `DOMParser`.

---

## Gem and Enchant Name Resolution

Gem and enchant names do NOT need Wowhead lookups — they come from the preset files:

- `src/lib/presets/gem-presets.ts` — maps gem_id → name
- `src/lib/presets/enchant-presets.ts` — maps enchant_id → name

If a gem or enchant ID is not in the presets (custom ID entered by user), show
`Gem #213743` or `Enchant #7340` as fallback.

---

## Item Quality Color Mapping

```typescript
const QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d', // Poor (grey)
  1: '#ffffff', // Common (white)
  2: '#1eff00', // Uncommon (green)
  3: '#0070dd', // Rare (blue)
  4: '#a335ee', // Epic (purple)
  5: '#ff8000', // Legendary (orange)
};
```

Use these colors for item name text in the gear slot cards.
