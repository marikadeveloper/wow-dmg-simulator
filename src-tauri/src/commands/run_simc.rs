use std::sync::Mutex;
use tauri::Emitter;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use uuid::Uuid;

/// Shared state holding the active SimC child process (if any).
pub struct SimState {
    pub child: Mutex<Option<CommandChild>>,
}

impl Default for SimState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

#[derive(serde::Serialize, Clone)]
struct SimcProgressPayload {
    line: String,
}

#[tauri::command]
pub async fn run_top_gear(
    app: tauri::AppHandle,
    state: tauri::State<'_, SimState>,
    simc_content: String,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join(format!("simc_input_{}.simc", id));
    let output_path = temp_dir.join(format!("simc_output_{}.json", id));

    // Write the .simc input file
    std::fs::write(&input_path, &simc_content).map_err(|e| {
        format!("Failed to write SimC input file: {}", e)
    })?;

    // Build sidecar command
    let output_flag = if cfg!(target_os = "windows") {
        "output=nul".to_string()
    } else {
        "output=/dev/null".to_string()
    };

    let (mut rx, child) = app
        .shell()
        .sidecar("simc")
        .map_err(|e| e.to_string())?
        .args([
            input_path.to_str().unwrap(),
            &format!("json2={}", output_path.display()),
            &output_flag,
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Store child so cancel_sim can kill it
    {
        let mut guard = state.child.lock().unwrap();
        *guard = Some(child);
    }

    // Collect stderr for error reporting
    let mut stderr_lines = Vec::new();
    let mut was_cancelled = false;

    // Stream events until process terminates
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                let text = String::from_utf8_lossy(&line).to_string();
                stderr_lines.push(text.clone());
                let _ = app.emit("simc-progress", SimcProgressPayload { line: text });
            }
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line).to_string();
                let _ = app.emit("simc-progress", SimcProgressPayload { line: text });
            }
            CommandEvent::Terminated(status) => {
                // On Unix, killed processes have a signal; on Windows, exit code != 0
                // Check if the child was already taken (cancelled)
                let child_taken = state.child.lock().unwrap().is_none();
                if child_taken || status.signal.is_some() {
                    was_cancelled = true;
                }
                break;
            }
            _ => {}
        }
    }

    // Clear child from state
    {
        let mut guard = state.child.lock().unwrap();
        *guard = None;
    }

    // Clean up input file regardless of outcome
    let _ = std::fs::remove_file(&input_path);

    if was_cancelled {
        // Clean up output file if it was partially written
        let _ = std::fs::remove_file(&output_path);
        return Err("Simulation cancelled".to_string());
    }

    // SimC exits 1 on warnings — check for JSON output, not just exit code
    if !output_path.exists() {
        let stderr_text = stderr_lines.join("\n");
        return Err(format!(
            "SimC failed: JSON output file was not created. stderr: {}",
            stderr_text
        ));
    }

    let json_content =
        std::fs::read_to_string(&output_path).map_err(|e| e.to_string());

    // Clean up output file
    let _ = std::fs::remove_file(&output_path);

    json_content
}

#[tauri::command]
pub async fn cancel_sim(
    state: tauri::State<'_, SimState>,
) -> Result<(), String> {
    let child = {
        let mut guard = state.child.lock().unwrap();
        guard.take()
    };

    if let Some(child) = child {
        child.kill().map_err(|e| e.to_string())?;
    }

    Ok(())
}
