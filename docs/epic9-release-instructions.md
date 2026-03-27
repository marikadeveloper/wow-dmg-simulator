# Release Instructions

## Distribution Model

The app is distributed as direct downloads from **GitHub Releases**:

- **macOS**: `.dmg` — user mounts it and drags the app to Applications
- **Windows**: `-setup.exe` — standard installer wizard

Users find the download at the repo's Releases page. After the first install,
the built-in auto-updater handles future versions (see story 9.3).

There is no app store, no website hosting, no CDN. GitHub is the only
distribution channel for now.

---

## First-Time Setup (do once, before your very first release)

### 1. Generate the updater signing keypair

```bash
pnpm tauri signer generate -- -w ~/.tauri/wow-topgear.key
```

This creates two files:
- `~/.tauri/wow-topgear.key` — private key (never commit this)
- `~/.tauri/wow-topgear.key.pub` — public key

### 2. Add the public key to the app config

Copy the **contents** of `wow-topgear.key.pub` and paste it into
`src-tauri/tauri.conf.json` → `plugins.updater.pubkey`:

```json
"updater": {
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6...",
  ...
}
```

Commit this change.

### 3. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in the GitHub repo and add:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/wow-topgear.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you chose (or empty string) |
| `SIMC_MACOS_ARM64_URL` | Direct download URL for SimC macOS arm64 binary |
| `SIMC_MACOS_X64_URL` | Direct download URL for SimC macOS x64 binary |
| `SIMC_WIN64_URL` | Direct download URL for SimC Windows x64 `.exe` |

SimC binaries: download from https://github.com/simulationcraft/simc/releases
and host them somewhere stable (GitHub Release asset, S3 bucket, etc.).

---

## Before Every Release

### 1. Update season config (if new season)

Edit `src/lib/presets/season-config.ts` and run:

```bash
pnpm season:validate
```

Must pass with 0 errors. See `docs/updating-seasons.md` for full checklist.

### 2. Bump the version

Update the version in **both** files (they must match):

- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"`

Use semver: `MAJOR.MINOR.PATCH` (e.g. `0.2.0`, `1.0.0`).

### 3. Run tests

```bash
pnpm test
```

### 4. Commit the version bump

```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to X.Y.Z"
```

### 5. Tag and push

```bash
git tag vX.Y.Z
git push && git push --tags
```

This triggers the GitHub Actions release workflow.

### 6. Wait for the build

Monitor at: https://github.com/marikadeveloper/wow-dmg-simulator/actions

The workflow runs:
1. Season config validation (Ubuntu)
2. Three parallel builds (macOS arm64, macOS x64, Windows x64)
3. Uploads all artifacts to a **draft** GitHub Release

---

## After the Build Completes

### 1. Review the draft release

Go to https://github.com/marikadeveloper/wow-dmg-simulator/releases

Check that the draft has all expected artifacts:

| Platform | Expected files |
|----------|---------------|
| macOS arm64 | `.dmg`, `.app.tar.gz`, `.app.tar.gz.sig` |
| macOS x64 | `.dmg`, `.app.tar.gz`, `.app.tar.gz.sig` |
| Windows | `-setup.exe`, `.exe.sig`, `.msi`, `.msi.sig` |
| All | `latest.json` |

The `.sig` files and `latest.json` are required for auto-update to work.

### 2. Write the release notes

Replace the auto-generated body with a human-written changelog. Include
install instructions since users download directly from this page:

```markdown
## What's new

- Feature A
- Feature B
- Bug fix C

## Install

**macOS** — Download the `.dmg` for your chip:
- Apple Silicon (M1/M2/M3/M4): `WoW Top Gear_X.Y.Z_aarch64.dmg`
- Intel: `WoW Top Gear_X.Y.Z_x64.dmg`

Open the `.dmg`, drag the app to Applications.
First launch: right-click the app → **Open** (macOS Gatekeeper prompt).

**Windows** — Download `WoW Top Gear_X.Y.Z_x64-setup.exe` and run it.
If SmartScreen warns you, click "More info" → "Run anyway".

**Already installed?** The app checks for updates on launch automatically.
```

### 3. Publish the release

Click **Publish release**. This makes the installers publicly downloadable
and enables auto-update for existing users (their app will find `latest.json`
at the `latest` URL).

### 4. Smoke test the installers

Download and install on at least one platform to verify:
- `.dmg` mounts and app drags to Applications correctly
- `.exe` installer runs and creates the app shortcut
- App launches without errors
- SimC sidecar binary runs (paste a profile and run a sim)
- Version shown in footer matches the release tag

### 5. Verify auto-update (from second release onwards)

Open a previous version of the app. It should show the update banner
within a few seconds of launch. Click "Update now" and confirm it
downloads, installs, and relaunches to the new version.

### 6. Share the link

The download URL for the latest release is always:

```
https://github.com/marikadeveloper/wow-dmg-simulator/releases/latest
```

Share this link with users. It always points to the most recent published release.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Build fails at season validation | `season-config.ts` has placeholders | Fill in all `TODO` values, run `pnpm season:validate` locally |
| Build fails at Rust compile | Missing or misnamed SimC sidecar | Check that the `SIMC_*_URL` secrets point to valid downloads |
| No `latest.json` in release | Signing not configured | Add `TAURI_SIGNING_PRIVATE_KEY` secret and ensure `pubkey` is set in `tauri.conf.json` |
| Auto-update doesn't trigger | `pubkey` is empty in config | Paste your public key into `tauri.conf.json` → `plugins.updater.pubkey` |
| macOS: "app is damaged" | Gatekeeper quarantine | Right-click → Open, or the app's built-in quarantine removal handles it |
| Windows: SmartScreen warning | App not EV code-signed | Expected for unsigned apps — user clicks "More info" → "Run anyway" |
| macOS: SimC "operation not permitted" | Sidecar quarantined | The app removes this automatically on launch; if it persists, run `xattr -d com.apple.quarantine /Applications/WoW\ Top\ Gear.app` |
