# Tauri Build, Sidecar & CI Reference

---

## SimC Sidecar — How It Works

A Tauri "sidecar" is a bundled external binary. Tauri copies it into the app bundle
and resolves its path at runtime. The binary must be named following Tauri's
triple-target convention.

### Required binary names (place in `src-tauri/binaries/`)

| Platform            | Binary name                       |
| ------------------- | --------------------------------- |
| macOS Apple Silicon | `simc-aarch64-apple-darwin`       |
| macOS Intel         | `simc-x86_64-apple-darwin`        |
| Windows x64         | `simc-x86_64-pc-windows-msvc.exe` |

These names are mandatory — Tauri will not find the sidecar otherwise.

### tauri.conf.json — sidecar declaration

```json
{
  "bundle": {
    "externalBin": ["binaries/simc"]
  }
}
```

Tauri automatically appends the target triple suffix when bundling.

### tauri.conf.json — permissions

```json
{
  "app": {
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "shell": {
      "open": false,
      "sidecar": true,
      "scope": [
        {
          "name": "binaries/simc",
          "sidecar": true
        }
      ]
    }
  }
}
```

### Invoking the sidecar in Rust

```rust
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn run_sim_gear(
    app: tauri::AppHandle,
    simc_file_path: String,
    json_output_path: String,
) -> Result<String, String> {
    let output = app
        .shell()
        .sidecar("simc")
        .map_err(|e| e.to_string())?
        .args([
            &simc_file_path,
            &format!("json2={}", json_output_path),
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    // SimC exits 1 on warnings — check for JSON output, not just exit code
    let json_exists = std::path::Path::new(&json_output_path).exists();
    if !json_exists {
        return Err(format!(
            "SimC failed (exit {}): {}",
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    std::fs::read_to_string(&json_output_path).map_err(|e| e.to_string())
}
```

### Required Cargo dependencies (src-tauri/Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-store = "2"
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
tokio = { version = "1", features = ["full"] }
```

---

## macOS Gatekeeper / Quarantine

When a macOS user downloads the `.dmg` and extracts the app, macOS quarantines
all binaries inside it (including the SimC sidecar). This causes:

```
zsh: operation not permitted: /path/to/simc
```

### Solution: remove quarantine in the Rust command

```rust
#[cfg(target_os = "macos")]
fn remove_quarantine(path: &std::path::Path) {
    // xattr -d com.apple.quarantine <path>
    let _ = std::process::Command::new("xattr")
        .args(["-d", "com.apple.quarantine", path.to_str().unwrap()])
        .output();
}
```

Call this once on app startup (or lazily before the first sim run) targeting the
sidecar binary path.

### Long-term solution: code signing

Code-sign the app with an Apple Developer certificate. Requires a paid Apple
Developer Program membership ($99/year). For MVP, the quarantine removal approach
is acceptable. Add a note in the README about right-clicking → Open for first launch.

---

## GitHub Actions — Release Build Workflow

File: `.github/workflows/build.yml`

```yaml
name: Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: macos-latest # Apple Silicon
            args: '--target aarch64-apple-darwin'
          - platform: macos-13 # Intel Mac
            args: '--target x86_64-apple-darwin'
          - platform: windows-latest # Windows x64
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin' || matrix.platform == 'macos-13' && 'x86_64-apple-darwin' || '' }}

      - name: Download SimC binary (macOS arm64)
        if: matrix.platform == 'macos-latest'
        run: |
          # Download from SimC GitHub releases or build from source
          # See: https://github.com/simulationcraft/simc/releases
          curl -L "$SIMC_MACOS_ARM64_URL" -o src-tauri/binaries/simc-aarch64-apple-darwin
          chmod +x src-tauri/binaries/simc-aarch64-apple-darwin
        env:
          SIMC_MACOS_ARM64_URL: ${{ secrets.SIMC_MACOS_ARM64_URL }}

      - name: Download SimC binary (macOS x86_64)
        if: matrix.platform == 'macos-13'
        run: |
          curl -L "$SIMC_MACOS_X64_URL" -o src-tauri/binaries/simc-x86_64-apple-darwin
          chmod +x src-tauri/binaries/simc-x86_64-apple-darwin
        env:
          SIMC_MACOS_X64_URL: ${{ secrets.SIMC_MACOS_X64_URL }}

      - name: Download SimC binary (Windows)
        if: matrix.platform == 'windows-latest'
        run: |
          Invoke-WebRequest -Uri "$env:SIMC_WIN64_URL" -OutFile "src-tauri\binaries\simc-x86_64-pc-windows-msvc.exe"
        shell: pwsh
        env:
          SIMC_WIN64_URL: ${{ secrets.SIMC_WIN64_URL }}

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # For macOS code signing (optional, set up later):
          # APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          # APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          # APPLE_ID: ${{ secrets.APPLE_ID }}
          # APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'WoW Gear Sim v${{ github.ref_name }}'
          releaseBody: 'See the assets below for installers.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

### GitHub Secrets to configure

| Secret                 | Value                                              |
| ---------------------- | -------------------------------------------------- |
| `SIMC_MACOS_ARM64_URL` | URL to the SimC arm64 macOS binary (or build step) |
| `SIMC_MACOS_X64_URL`   | URL to the SimC x86_64 macOS binary                |
| `SIMC_WIN64_URL`       | URL to the SimC Windows x64 .exe                   |

### Where to get SimC binaries for CI

SimC releases are published at: https://github.com/simulationcraft/simc/releases
Download the latest release binaries for each platform. Alternatively, store
them in a private S3 bucket or GitHub release artifact and point the secrets there.

For the MVP, acceptable to pin to a specific SimC release version and update it manually.
Later, automate version tracking by querying the SimC releases API.

---

## Local Development Setup

Prerequisites:

1. Rust (via rustup): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Node.js 20+
3. pnpm: `npm i -g pnpm`
4. SimC binary for your local platform, placed in `src-tauri/binaries/` with the
   correct triple name (see above)

```bash
pnpm install
pnpm tauri dev    # hot reload — frontend changes apply instantly
```

---

## Output Artifacts

| Platform      | File                             | Where it appears |
| ------------- | -------------------------------- | ---------------- |
| macOS arm64   | `WoWGearSim_1.0.0_aarch64.dmg`   | GitHub Release   |
| macOS x86_64  | `WoWGearSim_1.0.0_x64.dmg`       | GitHub Release   |
| Windows       | `WoWGearSim_1.0.0_x64-setup.exe` | GitHub Release   |
| Windows (MSI) | `WoWGearSim_1.0.0_x64_en-US.msi` | GitHub Release   |
