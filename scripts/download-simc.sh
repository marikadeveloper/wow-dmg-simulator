#!/usr/bin/env bash
#
# Download the SimC nightly binary for the current platform.
# Reads version info from simc-version.json in the repo root.
#
# Usage:
#   ./scripts/download-simc.sh          # auto-detect platform
#   ./scripts/download-simc.sh macos    # force macOS
#   ./scripts/download-simc.sh win64    # force Windows
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$REPO_ROOT/simc-version.json"
BINARIES_DIR="$REPO_ROOT/src-tauri/binaries"

if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: simc-version.json not found at $VERSION_FILE"
  exit 1
fi

NIGHTLY_URL=$(python3 -c "import json; print(json.load(open('$VERSION_FILE'))['nightlyUrl'])")
VERSION=$(python3 -c "import json; print(json.load(open('$VERSION_FILE'))['version'])")
COMMIT=$(python3 -c "import json; print(json.load(open('$VERSION_FILE'))['commit'])")

# Detect or accept platform
PLATFORM="${1:-}"
if [ -z "$PLATFORM" ]; then
  case "$(uname -s)" in
    Darwin) PLATFORM="macos" ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="win64" ;;
    *) echo "ERROR: Unsupported OS $(uname -s). Pass 'macos' or 'win64' explicitly."; exit 1 ;;
  esac
fi

FILENAME=$(python3 -c "import json; print(json.load(open('$VERSION_FILE'))['files']['$PLATFORM'])")
DOWNLOAD_URL="${NIGHTLY_URL}${FILENAME}"

echo "SimC version: $VERSION (commit $COMMIT)"
echo "Platform:     $PLATFORM"
echo "Downloading:  $FILENAME"
echo ""

mkdir -p "$BINARIES_DIR"

case "$PLATFORM" in
  macos)
    TMPFILE=$(mktemp /tmp/simc-XXXXXX.dmg)
    echo "Downloading DMG..."
    curl -fSL --insecure "$DOWNLOAD_URL" -o "$TMPFILE"

    echo "Mounting DMG..."
    MOUNT_POINT=$(mktemp -d /tmp/simc-mount-XXXXXX)
    hdiutil attach "$TMPFILE" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

    # Find the simc binary
    if [ -f "$MOUNT_POINT/simc" ]; then
      SIMC_BIN="$MOUNT_POINT/simc"
    else
      SIMC_BIN=$(find "$MOUNT_POINT" -name "simc" -type f -perm +111 | head -1)
    fi

    if [ -z "$SIMC_BIN" ]; then
      echo "ERROR: Could not find simc binary in DMG. Contents:"
      ls -laR "$MOUNT_POINT"
      hdiutil detach "$MOUNT_POINT" -quiet
      rm "$TMPFILE"
      exit 1
    fi

    # The macOS binary is universal (x86_64 + arm64), copy for both targets
    cp "$SIMC_BIN" "$BINARIES_DIR/simc-aarch64-apple-darwin"
    chmod +x "$BINARIES_DIR/simc-aarch64-apple-darwin"
    cp "$SIMC_BIN" "$BINARIES_DIR/simc-x86_64-apple-darwin"
    chmod +x "$BINARIES_DIR/simc-x86_64-apple-darwin"

    hdiutil detach "$MOUNT_POINT" -quiet
    rm "$TMPFILE"
    rmdir "$MOUNT_POINT" 2>/dev/null || true

    echo ""
    echo "Installed:"
    echo "  $BINARIES_DIR/simc-aarch64-apple-darwin"
    echo "  $BINARIES_DIR/simc-x86_64-apple-darwin"
    ;;

  win64)
    if ! command -v 7z &>/dev/null; then
      echo "ERROR: 7z is required to extract Windows archives."
      echo "Install with: brew install p7zip"
      exit 1
    fi

    TMPFILE=$(mktemp /tmp/simc-XXXXXX.7z)
    TMPDIR=$(mktemp -d /tmp/simc-extract-XXXXXX)

    echo "Downloading 7z archive..."
    curl -fSL --insecure "$DOWNLOAD_URL" -o "$TMPFILE"

    echo "Extracting..."
    7z x "$TMPFILE" -o"$TMPDIR" -y > /dev/null

    SIMC_EXE=$(find "$TMPDIR" -name "simc.exe" | head -1)
    if [ -z "$SIMC_EXE" ]; then
      echo "ERROR: Could not find simc.exe in archive. Contents:"
      ls -laR "$TMPDIR"
      rm -rf "$TMPFILE" "$TMPDIR"
      exit 1
    fi

    cp "$SIMC_EXE" "$BINARIES_DIR/simc-x86_64-pc-windows-msvc.exe"

    rm -rf "$TMPFILE" "$TMPDIR"

    echo ""
    echo "Installed:"
    echo "  $BINARIES_DIR/simc-x86_64-pc-windows-msvc.exe"
    ;;

  *)
    echo "ERROR: Unknown platform '$PLATFORM'. Use 'macos' or 'win64'."
    exit 1
    ;;
esac

echo ""
echo "Done! SimC $VERSION ($COMMIT) ready for Tauri build."
