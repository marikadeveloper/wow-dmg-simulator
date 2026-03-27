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

/// Wowhead suggestions API response.
#[derive(Deserialize)]
struct WowheadSuggestionsResponse {
    results: Vec<WowheadSuggestion>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WowheadSuggestion {
    #[serde(rename = "type")]
    result_type: u32,
    id: u32,
    name: String,
    quality: Option<u32>,
}

/// Search Wowhead suggestions API. Returns results or empty vec on failure.
async fn search_wowhead(query: &str) -> Vec<ItemSearchResult> {
    // Check cache first
    {
        let cache = WOWHEAD_CACHE.lock().unwrap();
        if let Some(cached) = cache.get(query) {
            return cached.clone();
        }
    }

    let url = format!(
        "https://www.wowhead.com/search/suggestions-template?q={}",
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
            match response.json::<WowheadSuggestionsResponse>().await {
                Ok(data) => {
                    data.results
                        .into_iter()
                        // type 3 = items
                        .filter(|r| r.result_type == 3)
                        .take(8)
                        .map(|r| ItemSearchResult {
                            item_id: r.id,
                            name: r.name,
                            // Suggestions API doesn't include slot — resolved by frontend
                            slot: String::new(),
                            base_ilvl: 0,
                            quality: r.quality.unwrap_or(4),
                            source: "wowhead".to_string(),
                        })
                        .collect()
                }
                Err(_) => Vec::new(),
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
