# Architecture

## Data Flow

```
User pastes SimC string
        │
        ▼
[parser.ts] — runs entirely in the browser/frontend
  Parses raw text into SimcProfile
  Groups items by slot (equipped + bag)
        │
        ▼
[Gear Slot UI]
  User selects which items to compare per slot
  Combination count is calculated and shown live
        │
        ▼
[combinator.ts] — runs in frontend
  Cartesian product of selected items → array of combinations
  Each combination = full SimC profile string ready for SimC
        │
        ▼
invoke("run_top_gear", { combinations }) ← Tauri IPC call
        │
        ▼
[src-tauri/src/commands/run_simc.rs] — Rust, runs in background thread
  For each combination:
    1. Write profile string to temp file
    2. Spawn SimC sidecar with args
    3. Wait for exit, read json2 output
    4. Extract DPS from JSON
    5. Emit progress event to frontend
  Return Vec<SimResult> sorted by DPS desc
        │
        ▼
[Results UI]
  Shows ranked table: item combination → DPS → delta vs equipped
```

---

## Tauri IPC Commands

All backend logic is exposed as Tauri commands (defined in Rust, called from TypeScript).

| Command              | Input                    | Output        | Description                        |
| -------------------- | ------------------------ | ------------- | ---------------------------------- |
| `run_top_gear`       | `combinations: string[]` | `SimResult[]` | Run all simulations, return ranked |
| `get_config`         | —                        | `AppConfig`   | Read persisted user config         |
| `set_config`         | `AppConfig`              | —             | Persist user config                |
| `validate_simc_path` | `path: string`           | `bool`        | Check if a binary exists and runs  |
| `get_cpu_count`      | —                        | `number`      | For default thread recommendation  |

---

## Tauri Events (server → UI streaming)

| Event          | Payload                                              | Description                      |
| -------------- | ---------------------------------------------------- | -------------------------------- |
| `sim-progress` | `{ done: number, total: number, latest: SimResult }` | Emitted after each sim completes |
| `sim-error`    | `{ combinationId: string, stderr: string }`          | Emitted if SimC exits non-zero   |

---

## AppConfig Type

```typescript
interface AppConfig {
  simcBinaryPath: string | null; // null = use bundled sidecar
  iterations: number; // default 10000
  threads: number; // default cpu_count - 1
}
```

Config is stored using Tauri's `store` plugin (persisted JSON in the OS app data dir).

---

## Combination Generation

Given slots with selected items:

```
head:    [item_A, item_B]
trinket: [item_X, item_Y, item_Z]
ring:    [item_M, item_N]
```

Cartesian product = 2 × 3 × 2 = **12 combinations**.

Only slots where the user selected **more than one item** contribute to the product.
Slots with exactly one selected item are pinned — they don't multiply the count.

---

## SimC Profile Reconstruction

To build a SimC input string for a given combination:

1. Start from `SimcProfile.rawLines`
2. For each gear slot in the combination, replace the corresponding line
3. Leave all other lines (talents, buffs, metadata) untouched

This ensures we never accidentally drop SimC directives we didn't parse.

---

## Platform-Specific Notes

### macOS

- SimC sidecar: `simc-aarch64-apple-darwin` (Apple Silicon) or `simc-x86_64-apple-darwin` (Intel)
- Tauri builds a `.dmg` installer
- The binary may need to be un-quarantined — handle this in the Rust command if `permission denied`

### Windows

- SimC sidecar: `simc-x86_64-pc-windows-msvc.exe`
- Tauri builds a `.msi` and/or NSIS `.exe` installer
- Temp files go to `%TEMP%` via Rust's `std::env::temp_dir()`
