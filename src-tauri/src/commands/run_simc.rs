use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

#[tauri::command]
pub async fn run_top_gear(
    app: tauri::AppHandle,
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

    let result = app
        .shell()
        .sidecar("simc")
        .map_err(|e| e.to_string())?
        .args([
            input_path.to_str().unwrap(),
            &format!("json2={}", output_path.display()),
            &output_flag,
        ])
        .output()
        .await
        .map_err(|e| e.to_string());

    // Clean up input file regardless of outcome
    let _ = std::fs::remove_file(&input_path);

    // Check result
    let _output = result?;

    // SimC exits 1 on warnings — check for JSON output, not just exit code
    if !output_path.exists() {
        return Err(format!(
            "SimC failed: JSON output file was not created. stderr: {}",
            String::from_utf8_lossy(&_output.stderr)
        ));
    }

    let json_content =
        std::fs::read_to_string(&output_path).map_err(|e| e.to_string());

    // Clean up output file
    let _ = std::fs::remove_file(&output_path);

    json_content
}
