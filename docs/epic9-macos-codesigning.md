# Epic 9.4 — macOS Code Signing & Gatekeeper

## Current approach: quarantine removal (no Apple Developer cert)

macOS quarantines all binaries inside a downloaded `.dmg`, including the SimC
sidecar. Without code signing, users see "app is damaged" or "operation not
permitted" errors.

### Automatic workaround (implemented)

`src-tauri/src/commands/config.rs` → `remove_quarantine_from_sidecar()` runs
`xattr -d com.apple.quarantine` on the SimC sidecar binary when the app first
validates the binary. This is called from `validate_simc_binary()`, which runs
on app launch.

It strips quarantine from both architecture variants:
- `simc-aarch64-apple-darwin`
- `simc-x86_64-apple-darwin`

### User-facing workaround

First-time macOS users must bypass Gatekeeper for the app itself:

1. Open Finder, navigate to the app
2. Right-click → **Open** (not double-click)
3. Click **Open** in the dialog

Or via terminal:

```bash
xattr -d com.apple.quarantine /Applications/WoW\ Top\ Gear.app
```

This only needs to be done once.

---

## Future: proper Apple code signing

When you have an Apple Developer Program membership ($99/year), you can sign
the app so Gatekeeper accepts it without workarounds.

### GitHub Secrets to add

| Secret | Value |
|--------|-------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_TEAM_ID` | 10-character team ID from developer.apple.com |

### How to get the certificate

1. Go to https://developer.apple.com/account/resources/certificates
2. Create a **Developer ID Application** certificate
3. Export it as `.p12` from Keychain Access
4. Base64-encode it: `base64 -i certificate.p12 | pbcopy`

### Enable in CI

In `.github/workflows/build.yml`, uncomment the Apple signing env vars in the
"Build Tauri app" step:

```yaml
env:
  APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
  APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

`tauri-action` handles the rest — it signs the `.app` bundle and submits it for
Apple notarization automatically.

### After signing is enabled

- Remove or keep the `remove_quarantine_from_sidecar()` call — it's harmless
  on signed apps (the xattr simply won't exist)
- Remove the "right-click → Open" instruction from release notes
- The auto-updater will also work more smoothly since macOS won't quarantine
  downloaded updates from a signed app
