use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSearchResult {
    pub item_id: u32,
    pub name: String,
    pub slot: String,
    pub base_ilvl: u32,
    pub quality: u32,
    pub source: String, // "local" | "wowhead"
}

/// In-memory cache for Wowhead search results. Entries expire after 10 minutes.
struct WowheadCache {
    entries: HashMap<String, (Instant, Vec<ItemSearchResult>)>,
}

impl WowheadCache {
    fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    fn get(&self, query: &str) -> Option<&Vec<ItemSearchResult>> {
        if let Some((ts, results)) = self.entries.get(query) {
            if ts.elapsed() < Duration::from_secs(600) {
                return Some(results);
            }
        }
        None
    }

    fn insert(&mut self, query: String, results: Vec<ItemSearchResult>) {
        // Evict old entries if cache grows too large
        if self.entries.len() > 200 {
            let cutoff = Instant::now() - Duration::from_secs(600);
            self.entries.retain(|_, (ts, _)| *ts > cutoff);
        }
        self.entries.insert(query, (Instant::now(), results));
    }
}

static WOWHEAD_CACHE: std::sync::LazyLock<Mutex<WowheadCache>> =
    std::sync::LazyLock::new(|| Mutex::new(WowheadCache::new()));

/// Map Wowhead inventorySlot IDs to SimC slot names.
fn wowhead_slot_to_simc(slot_id: u32) -> Option<&'static str> {
    match slot_id {
        1 => Some("head"),
        2 => Some("neck"),
        3 => Some("shoulder"),
        5 => Some("chest"),
        6 => Some("waist"),
        7 => Some("legs"),
        8 => Some("feet"),
        9 => Some("wrist"),
        10 => Some("hands"),
        11 => Some("finger1"), // ring
        12 => Some("trinket1"), // trinket
        15 => Some("back"),     // cloak
        16 => Some("main_hand"),
        17 => Some("main_hand"), // two-hand → main_hand
        13 => Some("main_hand"), // one-hand → main_hand
        21 => Some("main_hand"), // main hand explicit
        22 => Some("off_hand"),
        23 => Some("off_hand"),  // held in off hand
        14 => Some("off_hand"),  // shield
        20 => Some("chest"),     // robe → chest
        _ => None,
    }
}

/// Parse Wowhead search XML response into ItemSearchResults.
/// Uses simple string scanning — no XML crate needed.
fn parse_wowhead_search_xml(xml: &str) -> Vec<ItemSearchResult> {
    let mut results = Vec::new();

    // Split on "<item " to find each item block
    for chunk in xml.split("<item ").skip(1) {
        // Extract id attribute
        let item_id = extract_attr(chunk, "id")
            .and_then(|s| s.parse::<u32>().ok());

        // Extract name from <n> tag (may have CDATA)
        let name = extract_cdata_or_text(chunk, "n");

        // Extract inventorySlot id
        let slot_id = extract_nested_attr(chunk, "inventorySlot", "id")
            .and_then(|s| s.parse::<u32>().ok());

        // Extract quality
        let quality = extract_nested_attr(chunk, "quality", "id")
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(4);

        if let (Some(id), Some(n), Some(sid)) = (item_id, name, slot_id) {
            if let Some(slot) = wowhead_slot_to_simc(sid) {
                results.push(ItemSearchResult {
                    item_id: id,
                    name: n,
                    slot: slot.to_string(),
                    base_ilvl: 0, // Wowhead search doesn't give base ilvl
                    quality,
                    source: "wowhead".to_string(),
                });
            }
        }
    }

    results
}

/// Extract an attribute value from a tag-like string: `id="123"` → "123"
fn extract_attr(s: &str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    let start = s.find(&pattern)? + pattern.len();
    let end = s[start..].find('"')? + start;
    Some(s[start..end].to_string())
}

/// Extract attribute from a nested tag: `<inventorySlot id="17">` → "17"
fn extract_nested_attr(s: &str, tag: &str, attr: &str) -> Option<String> {
    let open = format!("<{} ", tag);
    let idx = s.find(&open)?;
    extract_attr(&s[idx..], attr)
}

/// Extract text content from a tag, handling CDATA: `<n><![CDATA[Name]]></n>` → "Name"
fn extract_cdata_or_text(s: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    let start = s.find(&open)? + open.len();
    let end = s[start..].find(&close)? + start;
    let inner = &s[start..end];
    // Strip CDATA wrapper if present
    if let Some(cdata_start) = inner.find("<![CDATA[") {
        let content_start = cdata_start + 9;
        if let Some(cdata_end) = inner[content_start..].find("]]>") {
            return Some(inner[content_start..content_start + cdata_end].to_string());
        }
    }
    Some(inner.trim().to_string())
}

/// Search Wowhead API. Returns results or empty vec on failure.
async fn search_wowhead(query: &str) -> Vec<ItemSearchResult> {
    // Check cache first
    {
        let cache = WOWHEAD_CACHE.lock().unwrap();
        if let Some(cached) = cache.get(query) {
            return cached.clone();
        }
    }

    let url = format!(
        "https://www.wowhead.com/search?q={}&xml",
        urlencoding(query)
    );

    let client = reqwest::Client::new();
    let result = tokio::time::timeout(
        Duration::from_secs(3),
        client
            .get(&url)
            .header("User-Agent", "WoWTopGear/1.0")
            .send(),
    )
    .await;

    let results = match result {
        Ok(Ok(response)) => {
            if let Ok(text) = response.text().await {
                parse_wowhead_search_xml(&text)
            } else {
                Vec::new()
            }
        }
        _ => Vec::new(), // timeout or network error — silently return empty
    };

    // Cache the results
    {
        let mut cache = WOWHEAD_CACHE.lock().unwrap();
        cache.insert(query.to_string(), results.clone());
    }

    results
}

/// Minimal URL encoding for search queries.
fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "+".to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[tauri::command]
pub async fn fetch_item_data(item_id: u32) -> Result<String, String> {
    let url = format!("https://www.wowhead.com/item={}&xml", item_id);
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_items(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<ItemSearchResult>, String> {
    let trimmed = query.trim().to_string();
    if trimmed.len() < 2 {
        return Ok(Vec::new());
    }

    // Fire local DB and Wowhead search in parallel
    let local_future = search_local_db(app, trimmed.clone());
    let wowhead_future = async {
        // Only hit Wowhead for queries >= 3 chars to reduce API load
        if trimmed.len() >= 3 {
            search_wowhead(&trimmed).await
        } else {
            Vec::new()
        }
    };

    let (local_results, wowhead_results) = tokio::join!(local_future, wowhead_future);

    // Merge: local results first, then Wowhead results not already in local
    let mut seen_ids: std::collections::HashSet<u32> = std::collections::HashSet::new();
    let mut merged: Vec<ItemSearchResult> = Vec::new();

    for item in local_results {
        seen_ids.insert(item.item_id);
        merged.push(item);
    }

    for item in wowhead_results {
        if !seen_ids.contains(&item.item_id) {
            seen_ids.insert(item.item_id);
            merged.push(item);
        }
    }

    // Limit to 10 total results
    merged.truncate(10);

    Ok(merged)
}

/// Search the bundled SQLite items.db.
async fn search_local_db(app: tauri::AppHandle, query: String) -> Vec<ItemSearchResult> {
    #[allow(unused_imports)]
    use tauri::Manager;

    let mut results: Vec<ItemSearchResult> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        let db_path = resource_dir.join("assets").join("items.db");
        if db_path.exists() {
            if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                // Append * for prefix matching in FTS5
                let fts_query = format!("{}*", query.replace('"', ""));
                let mut stmt = match conn.prepare(
                    "SELECT i.item_id, i.name, i.slot, i.base_ilvl \
                     FROM items_fts \
                     JOIN items i ON items_fts.rowid = i.item_id \
                     WHERE items_fts MATCH ?1 \
                     LIMIT 10",
                ) {
                    Ok(s) => s,
                    Err(_) => return results,
                };

                let rows = match stmt.query_map([&fts_query], |row| {
                    Ok(ItemSearchResult {
                        item_id: row.get(0)?,
                        name: row.get(1)?,
                        slot: row.get(2)?,
                        base_ilvl: row.get(3)?,
                        quality: 4, // default to epic
                        source: "local".to_string(),
                    })
                }) {
                    Ok(r) => r,
                    Err(_) => return results,
                };

                for row in rows {
                    if let Ok(item) = row {
                        results.push(item);
                    }
                }
            }
        }
    }

    results
}
