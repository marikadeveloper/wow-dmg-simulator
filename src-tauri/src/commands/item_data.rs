use serde::{Deserialize, Serialize};

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
