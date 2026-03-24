use serde::{Deserialize, Serialize};

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
    use tauri::Manager;

    let mut results: Vec<ItemSearchResult> = Vec::new();

    // Try local SQLite search first
    if let Ok(resource_dir) = app.path().resource_dir() {
        let db_path = resource_dir.join("assets").join("items.db");
        if db_path.exists() {
            if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                let mut stmt = conn
                    .prepare(
                        "SELECT i.item_id, i.name, i.slot, i.base_ilvl \
                         FROM items_fts \
                         JOIN items i ON items_fts.rowid = i.item_id \
                         WHERE items_fts MATCH ?1 \
                         LIMIT 10",
                    )
                    .map_err(|e| e.to_string())?;

                let rows = stmt
                    .query_map([&query], |row| {
                        Ok(ItemSearchResult {
                            item_id: row.get(0)?,
                            name: row.get(1)?,
                            slot: row.get(2)?,
                            base_ilvl: row.get(3)?,
                            quality: 4, // default to epic
                            source: "local".to_string(),
                        })
                    })
                    .map_err(|e| e.to_string())?;

                for row in rows {
                    if let Ok(item) = row {
                        results.push(item);
                    }
                }
            }
        }
    }

    // TODO: Fire Wowhead search API in parallel, merge and deduplicate

    Ok(results)
}
