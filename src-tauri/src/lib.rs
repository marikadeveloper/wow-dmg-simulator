mod commands;

use commands::config::{get_config, set_config, validate_simc_binary};
use commands::item_data::{fetch_item_data, search_items};
use commands::run_simc::{run_top_gear, cancel_sim, SimState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build());

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .manage(SimState::default())
        .invoke_handler(tauri::generate_handler![
            run_top_gear,
            cancel_sim,
            fetch_item_data,
            search_items,
            validate_simc_binary,
            get_config,
            set_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
