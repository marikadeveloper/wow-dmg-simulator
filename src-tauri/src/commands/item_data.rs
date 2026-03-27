use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSearchResult {
    pub item_id: u32,
    pub name: String,
    pub slot: String,
    pub base_ilvl: u32,
    pub quality: u32,
    pub source: String, // "local"
}

/// Fetch a single item's XML data from Wowhead (used by item-cache for tooltips).
#[tauri::command]
pub async fn fetch_item_data(item_id: u32) -> Result<String, String> {
    let url = format!("https://www.wowhead.com/item={}&xml", item_id);
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}

/// Search the bundled items.db for equippable items by name.
/// Uses FTS5 full-text search for fast prefix matching.
#[tauri::command]
pub async fn search_items(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<ItemSearchResult>, String> {
    #[allow(unused_imports)]
    use tauri::Manager;

    let trimmed = query.trim().to_string();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let mut results: Vec<ItemSearchResult> = Vec::new();

    // Check if the query is a numeric item ID
    let is_id_search = trimmed.parse::<u32>().is_ok();

    if !is_id_search && trimmed.len() < 2 {
        return Ok(Vec::new());
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let db_path = resource_dir.join("assets").join("items.db");
        if db_path.exists() {
            if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                if is_id_search {
                    // Search by item ID directly
                    let item_id: u32 = trimmed.parse().unwrap();
                    let _ = conn.query_row(
                        "SELECT item_id, name, slot, base_ilvl FROM items WHERE item_id = ?1",
                        [item_id],
                        |row| {
                            results.push(ItemSearchResult {
                                item_id: row.get(0)?,
                                name: row.get(1)?,
                                slot: row.get(2)?,
                                base_ilvl: row.get(3)?,
                                quality: 4,
                                source: "local".to_string(),
                            });
                            Ok(())
                        },
                    );
                } else {
                    // Full-text search by name
                    let fts_query = format!("{}*", trimmed.replace('"', ""));
                    let mut stmt = match conn.prepare(
                        "SELECT i.item_id, i.name, i.slot, i.base_ilvl \
                         FROM items_fts \
                         JOIN items i ON items_fts.rowid = i.item_id \
                         WHERE items_fts MATCH ?1 \
                         LIMIT 10",
                    ) {
                        Ok(s) => s,
                        Err(_) => return Ok(results),
                    };

                    let rows = match stmt.query_map([&fts_query], |row| {
                        Ok(ItemSearchResult {
                            item_id: row.get(0)?,
                            name: row.get(1)?,
                            slot: row.get(2)?,
                            base_ilvl: row.get(3)?,
                            quality: 4,
                            source: "local".to_string(),
                        })
                    }) {
                        Ok(r) => r,
                        Err(_) => return Ok(results),
                    };

                    for row in rows {
                        if let Ok(item) = row {
                            results.push(item);
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

/// Inventory type → SimC slot mapping (mirrors scripts/build-item-db.ts).
fn inv_type_to_slot(inv_type: u32) -> Option<&'static str> {
    match inv_type {
        1 => Some("head"),
        2 => Some("neck"),
        3 => Some("shoulder"),
        5 => Some("chest"),
        6 => Some("waist"),
        7 => Some("legs"),
        8 => Some("feet"),
        9 => Some("wrist"),
        10 => Some("hands"),
        11 => Some("finger"),
        12 => Some("trinket"),
        13 | 17 | 21 => Some("main_hand"),
        14 | 22 | 23 => Some("off_hand"),
        16 => Some("back"),
        20 => Some("chest"), // robe
        _ => None,
    }
}

/// Parse a numeric field that may be hex (0x...) or decimal.
fn parse_field(s: &str) -> Option<u32> {
    let s = s.trim();
    if s.starts_with("0x") || s.starts_with("0X") {
        u32::from_str_radix(&s[2..], 16).ok()
    } else {
        s.parse().ok()
    }
}

/// Download SimC's item_data.inc and rebuild items.db.
/// `branch` is the SimC GitHub branch (e.g. "midnight").
#[tauri::command]
pub async fn refresh_item_db(
    app: tauri::AppHandle,
    branch: String,
) -> Result<u32, String> {
    #[allow(unused_imports)]
    use tauri::Manager;

    let url = format!(
        "https://raw.githubusercontent.com/simulationcraft/simc/{}/engine/dbc/generated/item_data.inc",
        branch
    );

    // Download
    let text = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Parse items: { "Name", id, field, field, ... }
    let re = Regex::new(r#"\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*([\s\S]*?)\}"#)
        .map_err(|e| e.to_string())?;

    // Skip inventory types: 0 (non-equippable), 4 (shirt), 15 (ranged), 19 (tabard)
    let skip: std::collections::HashSet<u32> = [0, 4, 15, 19].into_iter().collect();

    struct ParsedItem {
        id: u32,
        name: String,
        slot: String,
        base_ilvl: u32,
    }

    let comment_re = Regex::new(r"/\*.*?\*/").map_err(|e| e.to_string())?;
    let mut items: Vec<ParsedItem> = Vec::new();

    for cap in re.captures_iter(&text) {
        let name = cap[1].to_string();
        let id: u32 = match cap[2].parse() {
            Ok(v) if v > 0 => v,
            _ => continue,
        };
        let rest = &cap[3];
        let cleaned = comment_re.replace_all(rest, "");
        let fields: Vec<&str> = cleaned.split(',').map(|f| f.trim()).filter(|f| !f.is_empty()).collect();

        if fields.len() < 8 {
            continue;
        }

        let ilvl = parse_field(fields[3]).unwrap_or(0);
        let inv_type = match parse_field(fields[7]) {
            Some(v) => v,
            None => continue,
        };

        if skip.contains(&inv_type) {
            continue;
        }

        let slot = match inv_type_to_slot(inv_type) {
            Some(s) => s.to_string(),
            None => continue,
        };

        items.push(ParsedItem { id, name, slot, base_ilvl: ilvl });
    }

    if items.is_empty() {
        return Err("No items parsed — the file format may have changed".to_string());
    }

    // Write to items.db
    let db_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("assets")
        .join("items.db");

    // Ensure parent dir exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Remove old DB
    if db_path.exists() {
        std::fs::remove_file(&db_path).map_err(|e| e.to_string())?;
    }

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "CREATE TABLE items (
            item_id   INTEGER PRIMARY KEY,
            name      TEXT NOT NULL,
            slot      TEXT NOT NULL,
            base_ilvl INTEGER NOT NULL DEFAULT 0
        );
        CREATE VIRTUAL TABLE items_fts USING fts5(
            name, content='items', content_rowid='item_id'
        );
        CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
            INSERT INTO items_fts(rowid, name) VALUES (new.item_id, new.name);
        END;",
    )
    .map_err(|e| e.to_string())?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let count;
    {
        let mut stmt = tx
            .prepare("INSERT OR IGNORE INTO items (item_id, name, slot, base_ilvl) VALUES (?1, ?2, ?3, ?4)")
            .map_err(|e| e.to_string())?;

        let mut seen = HashMap::<u32, bool>::new();
        for item in &items {
            if seen.contains_key(&item.id) {
                continue;
            }
            seen.insert(item.id, true);
            let _ = stmt.execute(rusqlite::params![item.id, item.name, item.slot, item.base_ilvl]);
        }
        count = seen.len() as u32;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(count)
}
