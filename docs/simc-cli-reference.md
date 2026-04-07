# SimulationCraft CLI Reference

## Basic Invocation

```bash
simc input.simc iterations=10000 threads=7 output=/dev/null json2=/tmp/result.json
```

On Windows, `/dev/null` does not exist — use `output=nul` instead.

---

## Key Flags Used By This App

| Flag            | Example                      | Description                                                                         |
| --------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `iterations=N`  | `iterations=10000`           | Number of fight iterations. Higher = more accurate, slower.                         |
| `threads=N`     | `threads=7`                  | CPU threads to use. Default: all cores. We set this to `cpu_count - 1`.             |
| `output=`       | `output=/dev/null`           | Suppresses the human-readable text report (we don't need it).                       |
| `json2=`        | `json2=/tmp/result_abc.json` | Writes machine-readable JSON output to this path. **Always use this.**              |
| `fight_style=`  | `fight_style=Patchwerk`      | Boss fight style. Patchwerk = single target stand-still (default for Sim Gear).     |
| `target_error=` | `target_error=0.1`           | Alternative to `iterations` — stops when DPS error < N%. Don't mix with iterations. |

---

## Full Command Used By The App (Rust pseudocode)

```rust
let output = Command::new(&simc_path)
    .arg(&input_file_path)
    .arg(format!("iterations={}", config.iterations))
    .arg(format!("threads={}", config.threads))
    .arg("output=nul")          // Windows; use /dev/null on macOS
    .arg(format!("json2={}", &json_output_path))
    .arg("fight_style=Patchwerk")
    .output()
    .await?;
```

On macOS/Linux, use `"output=/dev/null"`. Detect platform with `cfg!(target_os = "windows")`.

---

## JSON Output Structure (json2 format)

The relevant fields in the output JSON:

```json
{
  "version": "1210-01",
  "sim": {
    "players": [
      {
        "name": "Thrall",
        "specialization": "Enhancement",
        "collected_data": {
          "dps": {
            "mean": 854321.45,
            "min": 812000.0,
            "max": 901000.0,
            "median": 853000.0,
            "std_dev": 12000.0,
            "mean_std_dev": 1200.0
          }
        }
      }
    ],
    "statistics": {
      "elapsed_cpu_seconds": 14.3,
      "elapsed_time_seconds": 2.1
    }
  }
}
```

**The only field we need:** `sim.players[0].collected_data.dps.mean`

---

## Exit Codes

| Code     | Meaning                                            |
| -------- | -------------------------------------------------- |
| `0`      | Success                                            |
| `1`      | SimC encountered warnings OR errors (check stderr) |
| Non-zero | Fatal error                                        |

**Important:** SimC may exit with code `1` even on successful simulations if there are
non-fatal warnings in the profile (e.g. unknown bonus_ids). Always check if the JSON
output file was written and contains valid data, regardless of exit code. Only treat it
as a true failure if the JSON file is missing or malformed.

---

## Locating the Bundled Sidecar in Rust

```rust
use tauri::Manager;

fn get_simc_path(app: &tauri::AppHandle) -> PathBuf {
    // Tauri resolves the sidecar path automatically based on current platform/arch
    app.path().resource_dir()
       .unwrap()
       .join("binaries")
       .join(if cfg!(target_os = "windows") {
           "simc-x86_64-pc-windows-msvc.exe"
       } else if cfg!(target_arch = "aarch64") {
           "simc-aarch64-apple-darwin"
       } else {
           "simc-x86_64-apple-darwin"
       })
}
```

Or use Tauri's built-in sidecar API which handles this automatically:

```rust
tauri::api::process::Command::new_sidecar("simc")
```

---

## Temp File Strategy

- Use `std::env::temp_dir()` for portability
- Generate unique filenames with a UUID or timestamp per combination
- Clean up temp files after each sim completes (in a `finally`-equivalent)
- Input file: `simc_input_{uuid}.simc`
- Output file: `simc_output_{uuid}.json`
