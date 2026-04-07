use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "config.json";
const STORE_KEY: &str = "app_config";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub simc_binary_path: Option<String>,
    pub iterations: u32,
    pub threads: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        let cpu_count = std::thread::available_parallelism()
            .map(|p| p.get() as u32)
            .unwrap_or(4);
        Self {
            simc_binary_path: None,
            iterations: 10000,
            threads: std::cmp::max(1, cpu_count - 1),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryStatus {
    pub ok: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn validate_simc_binary(app: tauri::AppHandle) -> Result<BinaryStatus, String> {
    // On macOS, strip quarantine xattr from the sidecar
    #[cfg(target_os = "macos")]
    {
        if let Ok(sidecar) = app.shell().sidecar("simc") {
            // We can't easily get the path from the sidecar command,
            // so we attempt to run it directly — quarantine removal
            // is done via a separate utility call if needed.
            let _ = sidecar;
        }
        remove_quarantine_from_sidecar(&app);
    }

    // Attempt to run simc with no args — it prints a version header and exits.
    // Note: SimC does NOT support --version; all CLI args are treated as input
    // files or key=value options, so passing --version causes an error on Windows.
    match app
        .shell()
        .sidecar("simc")
        .map_err(|e| e.to_string())?
        .output()
        .await
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            // SimC prints its version header as the first line of stdout,
            // e.g. "SimulationCraft 1110-01 for World of Warcraft 11.1.0.58238 ..."
            let version = extract_simc_version(&stdout)
                .or_else(|| extract_simc_version(&stderr));

            if version.is_some() {
                Ok(BinaryStatus {
                    ok: true,
                    version,
                    error: None,
                })
            } else if !stdout.is_empty() || output.status.success() {
                // Got some output but couldn't parse version — still OK
                Ok(BinaryStatus {
                    ok: true,
                    version: stdout.lines().next().map(|l| l.trim().to_string()),
                    error: None,
                })
            } else if stderr.contains("Nothing to sim!") {
                // SimC ran but had nothing to simulate (expected with no args)
                Ok(BinaryStatus {
                    ok: true,
                    version: None,
                    error: None,
                })
            } else {
                Ok(BinaryStatus {
                    ok: false,
                    version: None,
                    error: Some(format!("SimC returned error: {}", stderr.trim())),
                })
            }
        }
        Err(e) => Ok(BinaryStatus {
            ok: false,
            version: None,
            error: Some(format!("Failed to run SimC binary: {}", e)),
        }),
    }
}

/// Extract the SimC version from output text.
/// Looks for lines starting with "SimulationCraft" (the version header).
fn extract_simc_version(text: &str) -> Option<String> {
    text.lines()
        .find(|line| line.starts_with("SimulationCraft"))
        .map(|line| line.trim().to_string())
}

#[cfg(target_os = "macos")]
fn remove_quarantine_from_sidecar(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Ok(resource_dir) = app.path().resource_dir() {
        let sidecar_path = resource_dir.join("binaries").join("simc-aarch64-apple-darwin");
        let _ = std::process::Command::new("xattr")
            .args(["-d", "com.apple.quarantine"])
            .arg(&sidecar_path)
            .output();

        // Also try x86_64 variant
        let sidecar_path_x64 = resource_dir.join("binaries").join("simc-x86_64-apple-darwin");
        let _ = std::process::Command::new("xattr")
            .args(["-d", "com.apple.quarantine"])
            .arg(&sidecar_path_x64)
            .output();
    }
}

#[tauri::command]
pub async fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    match store.get(STORE_KEY) {
        Some(value) => {
            serde_json::from_value::<AppConfig>(value).map_err(|e| e.to_string())
        }
        None => Ok(AppConfig::default()),
    }
}

#[tauri::command]
pub async fn set_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(&config).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, value);
    Ok(())
}

/// Read the persisted config (non-command helper for other modules).
pub fn read_config(app: &tauri::AppHandle) -> AppConfig {
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(_) => return AppConfig::default(),
    };
    match store.get(STORE_KEY) {
        Some(value) => serde_json::from_value::<AppConfig>(value).unwrap_or_default(),
        None => AppConfig::default(),
    }
}

/// Validate a user-provided SimC binary path (not the bundled sidecar).
#[tauri::command]
pub async fn validate_custom_binary(path: String) -> Result<BinaryStatus, String> {
    // Run without args — SimC doesn't support --version.
    match tokio::process::Command::new(&path)
        .output()
        .await
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            let version = extract_simc_version(&stdout)
                .or_else(|| extract_simc_version(&stderr));

            if version.is_some() {
                Ok(BinaryStatus {
                    ok: true,
                    version,
                    error: None,
                })
            } else if !stdout.is_empty() || output.status.success() {
                Ok(BinaryStatus {
                    ok: true,
                    version: stdout.lines().next().map(|l| l.trim().to_string()),
                    error: None,
                })
            } else {
                Ok(BinaryStatus {
                    ok: false,
                    version: None,
                    error: Some(format!("Binary returned error: {}", stderr.trim())),
                })
            }
        }
        Err(e) => Ok(BinaryStatus {
            ok: false,
            version: None,
            error: Some(format!("Failed to run binary at '{}': {}", path, e)),
        }),
    }
}
