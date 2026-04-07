# Epic 9.2 — Installers Published to GitHub Releases

## How it works

The `tauri-action` step in `.github/workflows/build.yml` automatically uploads
built installers to a **draft** GitHub Release. All three platform jobs contribute
artifacts to the same release.

## Artifacts per platform

| Platform          | Installer files                                          |
| ----------------- | -------------------------------------------------------- |
| macOS arm64       | `WoW Gear Sim_X.Y.Z_aarch64.dmg`                        |
| macOS Intel       | `WoW Gear Sim_X.Y.Z_x64.dmg`                            |
| Windows           | `WoW Gear Sim_X.Y.Z_x64-setup.exe`, `...x64_en-US.msi` |

Exact filenames are determined by `productName` and `version` in `src-tauri/tauri.conf.json`.

## Draft vs published

Releases are created as **drafts** (`releaseDraft: true`). This gives you a chance
to review the release notes and verify the artifacts before making them public.

To publish: go to https://github.com/marikadeveloper/wow-dmg-simulator/releases,
find the draft, and click **Publish release**.

## Release body

The workflow auto-generates a release body with a platform/file table. You can
edit it in the GitHub UI before publishing.

## Depends on

- Story 9.1 (the build workflow that produces the artifacts)
