use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;

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

    // Attempt to run simc --version
    match app
        .shell()
        .sidecar("simc")
        .map_err(|e| e.to_string())?
        .args(["--version"])
        .output()
        .await
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            if !stdout.is_empty() || output.status.success() {
                Ok(BinaryStatus {
                    ok: true,
                    version: Some(stdout.trim().to_string()),
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
pub async fn get_config() -> Result<AppConfig, String> {
    // TODO: Read from tauri-plugin-store
    Ok(AppConfig::default())
}

#[tauri::command]
pub async fn set_config(_config: AppConfig) -> Result<(), String> {
    // TODO: Write to tauri-plugin-store
    Ok(())
}
