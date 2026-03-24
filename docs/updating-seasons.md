# Updating for a New Season

## Overview

All seasonal data lives in **one file**:

```
src/lib/presets/season-config.ts
```

That's the only file you need to edit. Everything else (UI dropdowns, SimC line
generation, combo counting) reads from it automatically.

After editing, run the validator to catch mistakes before releasing:

```bash
pnpm season:validate
```

---

## Step-by-Step Checklist

Do these steps in order. Each one has a "how to find the data" section below.

- [ ] **1. Update `CURRENT_SEASON`** — expansion name, season number, start date, max ilvl, SimC branch name
- [ ] **2. Update `GEAR_TRACKS`** — ilvl ranges + `bonusId` for each track
- [ ] **3. Update `SOCKET_BONUS_ID`** — the bonus_id that adds an extra socket
- [ ] **4. Update `GEM_PRESETS`** — current-season gems with correct `id` and names
- [ ] **5. Update `ENCHANT_PRESETS`** — current-season enchants with correct `id`, slot, names
- [ ] **6. Rebuild `items.db`** — regenerate the item search database from SimC source
- [ ] **7. Update SimC binary** — bundle the new SimC release for all platforms
- [ ] **8. Run `pnpm season:validate`** — must pass with 0 errors before releasing
- [ ] **9. Test with a real export string** — paste your own `/simc` output and run a sim
- [ ] **10. Tag a release** — `git tag vX.Y.Z` and push; GitHub Actions builds installers

---

## How to Find Each Value

### Gear track bonus_ids

These are not on any gaming guide website — you must get them from SimC source or Wowhead.

**Option A — Wowhead XML (fastest):**

1. Find a known item from the new season on Wowhead (e.g. a Myth-track trinket)
2. Fetch its XML: `https://www.wowhead.com/item=ITEM_ID&xml`
3. Look at the `<bonus_id>` field — it will be a slash-separated list
4. Repeat for items of different tracks
5. The bonus_id that differs between tracks is the track marker
6. Cross-check 2–3 items per track to be sure

**Option B — SimC item_data.inc:**

1. Go to: `https://github.com/simulationcraft/simc/blob/BRANCH/engine/dbc/generated/item_data.inc`
   (replace BRANCH with the new season's branch name, e.g. `midnight`)
2. Search for a known current-season item by name
3. Its bonus_ids list will include the track marker
4. Compare across multiple items/tracks

**Option C — SimC Discord / GitHub:**

- SimC Discord: https://discord.gg/simulationcraft
- GitHub issues: https://github.com/simulationcraft/simc/issues
- The maintainers usually post a season update thread with confirmed bonus_ids

---

### Socket bonus_id

Same process as gear tracks — use Option A or B.

- In TWW Season 2, it was `6935`
- Do NOT assume it carries over — verify for each season

---

### Gem IDs and Enchant IDs

**From Wowhead item XML:**

- Gems: search Wowhead for the new season's gems, fetch XML, read the `id` attribute
- Enchants: search Wowhead for current enchants, fetch `https://www.wowhead.com/spell=SPELL_ID&xml`

**From your own character's `/simc` export:**

- If you have gems equipped, your export string contains `gem_id=NNNNN`
- If you have enchants, your export contains `enchant_id=NNNNN`
- This is the fastest way to get confirmed values — just look at your own gear

**From SimC pull request notes:**

- SimC maintainers open a PR for each new season titled something like "Update for Season X"
- These PRs often list new gem/enchant IDs in the description

---

### SimC branch name

Find the current active branch on GitHub:

```
https://github.com/simulationcraft/simc/branches
```

It's usually the expansion name in lowercase (e.g. `midnight`, `the-war-within`).

---

### SimC binary URLs for CI

When you update the SimC branch, you also need to update the binary download URLs
in GitHub Actions (`.github/workflows/build.yml`) and the GitHub Secrets.

1. Go to: `https://github.com/simulationcraft/simc/releases`
2. Find the latest release for the new season
3. Download URLs follow the pattern:
   - Windows: `simc-VERSION-win64.7z`
   - macOS arm64: `simc-VERSION-macosx.dmg` or a `.tar.gz`
4. Update the three GitHub Secrets: `SIMC_MACOS_ARM64_URL`, `SIMC_MACOS_X64_URL`, `SIMC_WIN64_URL`

---

### Rebuilding items.db

Run the build script after updating `CURRENT_SEASON.simcBranch`:

```bash
pnpm build:item-db
```

This pulls `item_data.inc` from the SimC repo for the configured branch,
parses all equippable items, and writes `src-tauri/assets/items.db`.

Expected output: ~50,000–80,000 items, takes ~30 seconds.

---

## Validator Output Guide

```bash
pnpm season:validate
```

| Output                               | Meaning                                        |
| ------------------------------------ | ---------------------------------------------- |
| `✓ Myth: bonusId=XXXXX`              | Good — confirmed value                         |
| `✗ Hero track: bonusId is 0`         | **Blocking** — must fix before release         |
| `⚠ SOCKET_BONUS_ID is 0`             | Non-blocking warning — socket feature disabled |
| `✗ Gem "TODO: Mastery gem" has id=0` | **Blocking** — placeholder not replaced        |
| `✗ Duplicate enchant id: 1234`       | **Blocking** — copy-paste error in the config  |

The validator exits with code 1 (failure) if there are any errors.
GitHub Actions runs this before every release build — the build will fail if
the config is incomplete, preventing a release with broken seasonal data.

---

## Season History

| Season | Expansion | Start date | Max ilvl | SimC branch | Config updated |
| ------ | --------- | ---------- | -------- | ----------- | -------------- |
| S1     | Midnight  | 2026-03-17 | 289      | `midnight`  | ⬜ in progress |

Add a row here when you complete a season update.

---

## Time estimate

A complete season update with all values filled in takes approximately:

- **30–60 minutes** if you have a character with current gear (use your own `/simc` export for gem/enchant IDs)
- **2–3 hours** if starting from scratch using only web research

The hardest part is usually the gear track `bonus_ids` — everything else is fast.
