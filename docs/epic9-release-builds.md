# Epic 9.1 — Release Build Workflow

## What it does

GitHub Actions builds `.dmg` (macOS) and `.exe`/`.msi` (Windows) installers
automatically when a version tag is pushed.

## Trigger

Push a tag matching `v*`:

```bash
git tag v0.1.0
git push --tags
```

## Workflow file

`.github/workflows/build.yml`

## Build matrix

| Runner           | Target                       | Artifact          |
| ---------------- | ---------------------------- | ----------------- |
| `macos-latest`   | `aarch64-apple-darwin`       | `.dmg` (arm64)    |
| `macos-13`       | `x86_64-apple-darwin`        | `.dmg` (Intel)    |
| `windows-latest` | `x86_64-pc-windows-msvc`     | `.exe` and `.msi` |

## Pipeline stages

1. **Season validation** — `pnpm season:validate` runs on Ubuntu. If it fails, the build is blocked.
2. **Build** (3 jobs in parallel) — each job downloads the SimC sidecar, installs deps, and runs `tauri-action`.
3. **Release** — `tauri-action` creates a **draft** GitHub Release with all installers attached.

## Required GitHub Secrets

| Secret                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `SIMC_MACOS_ARM64_URL` | Direct download URL for SimC macOS arm64 binary |
| `SIMC_MACOS_X64_URL`   | Direct download URL for SimC macOS x64 binary   |
| `SIMC_WIN64_URL`       | Direct download URL for SimC Windows x64 `.exe` |

Get these from https://github.com/simulationcraft/simc/releases for the current season.

## SimC sidecar naming

Binaries must land in `src-tauri/binaries/` with Tauri's triple naming:

- `simc-aarch64-apple-darwin`
- `simc-x86_64-apple-darwin`
- `simc-x86_64-pc-windows-msvc.exe`

The workflow handles this automatically via the matrix config.

## Releasing a new version

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit: `chore: bump version to X.Y.Z`
3. Tag: `git tag vX.Y.Z && git push --tags`
4. Wait for the workflow to finish
5. Go to GitHub Releases, review the draft, and publish
