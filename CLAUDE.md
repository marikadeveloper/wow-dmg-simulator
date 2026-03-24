# WoW Top Gear — Local SimulationCraft Desktop App

## Current Status (last updated: 2026-03-24)

✅ Project scaffold (Tauri + React + Vite + TypeScript)
✅ SimC string parser (TypeScript, frontend)
⬜ Gear slot UI with multi-select
✅ Unowned item search (items.db + Wowhead API + gear track selector) — backend + scripts done, UI pending
✅ Gem optimization UI + combination generation — combinator done, UI pending
✅ Enchant optimization UI + combination generation — combinator done, UI pending
⬜ Simulation settings panel (fight style, length, enemies, iterations)
✅ SimC runner via ProfileSet (single process, all combos)
⬜ Results ranking view with delta vs equipped
✅ Settings screen (SimC binary path override, thread count) — backend done, UI pending
⬜ Cross-platform builds (GitHub Actions)

---

## Project Goal

A **desktop app** (Tauri) that replicates Raidbots' Top Gear feature, running 100% locally.
The user pastes a SimulationCraft addon export string, selects which gear items to compare
per slot, and the app runs the local SimC binary to rank combinations by DPS.

Target users: WoW players who are **not programmers**. The app must be a double-clickable
installer on both **macOS** and **Windows**.

---

## Design Principles (non-negotiable)

1. **One screen does everything.** Gear, gems, and enchants are all visible and
   configurable inline in the same screen. No separate pages or modal flows for
   the core optimization workflow.

2. **Smart defaults, zero configuration required.** The app runs correctly out of
   the box. Advanced settings (fight style, iterations, etc.) are collapsed by default.

3. **The user always knows what will happen before clicking Run.** Combination count,
   color-coded urgency badge, and time estimate are always visible and update live.

4. **Extensible by design.** New optimization types (future: talents, embellishments)
   are added by creating new `OptimizationAxis` sources — the combination generator
   and ProfileSet builder never need to change. See `docs/extensibility.md`.

5. **User-friendly language everywhere.** No SimC jargon in the UI. "fight_style=Patchwerk"
   becomes "Fight Style: Single Target". Enchant IDs are shown as names. Gem IDs are
   shown as names. Raw IDs are only exposed in "custom" escape hatches.

---

## Stack

- **UI:** React + Vite + TypeScript (inside `src/`)
- **Desktop shell:** Tauri 2.x (Rust, inside `src-tauri/`)
- **SimC binary:** bundled as a Tauri sidecar for both platforms
- **No separate HTTP backend** — Tauri commands (IPC) replace a REST API
- **Styling:** Tailwind CSS

## Repo Structure

```
wow-topgear/
├── CLAUDE.md                  ← you are here
├── src/                       ← React frontend
│   ├── components/
│   ├── lib/
│   │   ├── parser.ts          ← SimC string parser
│   │   ├── combinator.ts      ← combination generator
│   │   └── types.ts           ← shared TypeScript types
│   └── App.tsx
├── src-tauri/                 ← Tauri / Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── commands/
│   │       ├── run_simc.rs    ← spawns SimC binary, returns DPS
│   │       └── config.rs      ← reads/writes user config (simc path, threads)
│   ├── binaries/              ← SimC sidecars (gitignored, downloaded by CI)
│   │   ├── simc-x86_64-pc-windows-msvc.exe
│   │   └── simc-aarch64-apple-darwin
│   └── tauri.conf.json
├── docs/                      ← reference docs for Claude Code sessions
│   ├── architecture.md
│   ├── build-item-db.md
│   ├── decisions.md
│   ├── extensibility.md
│   ├── features.md            ← epics & user stories, canonical feature list
│   ├── gem-enchant-axis.md
│   ├── item-data.md
│   ├── item-search.md
│   ├── profileset-builder.md
│   ├── simc-string-format.md
│   ├── simc-cli-reference.md
│   ├── simc-wiki-reference.md ← SimC wiki URLs + key options summary
│   ├── tauri-build.md
│   ├── ui-ux.md
│   └── updating-seasons.md
└── .github/workflows/
    └── build.yml              ← cross-platform release builds
```

---

## Key Tauri Concepts for This Project

- **Tauri commands** are Rust functions decorated with `#[tauri::command]` and called
  from TypeScript via `invoke("command_name", { args })`. They replace HTTP endpoints.
- **Sidecars** are platform-specific binaries bundled inside the app. SimC is a sidecar.
  They are declared in `tauri.conf.json` under `bundle.externalBin`.
- **Tauri's `Command` API** (in Rust: `tauri::process::Command`) is used to spawn the
  SimC sidecar with arguments and capture stdout/stderr.
- **Events** (`emit` / `listen`) are used to stream simulation progress back to the UI
  while simulations are running (instead of WebSockets or SSE).

---

## Critical Constraints

### Combinations

- **Cap at 1000 combinations** before running — show the count to the user first
- Display a warning if count > 200 (will take a while)
- Combinations are the **cartesian product** of selected items per slot

### SimC Invocation — ProfileSet Architecture

- **Use ProfileSet**: all combinations are written into ONE `.simc` file using
  `profileset.NAME+=line` syntax. One SimC process runs all combinations.
  This is faster and statistically more consistent than N sequential processes.
- Always use `json2=<tempfile>` flag for machine-readable output
- DPS for base profile: `sim.players[0].collected_data.dps.mean`
- DPS for profileset results: `profilesets.results[i].mean` (matched by name)
- Talent strings are **FIXED** across all combinations — never modify them
- Threads: read from user config, default = `max(1, cpu_count - 1)`
- Only **one SimC process runs at a time**
- Each sim runs with `iterations=10000` by default (configurable)
- See `docs/simc-wiki-reference.md` for ProfileSet syntax details

### Simulation Settings (user-configurable, passed to SimC)

- `fight_style` — Patchwerk (default), CastingPatchwerk, LightMovement, HeavyMovement,
  HecticAddCleave, DungeonSlice, HelterSkelter
- `max_time` — fight duration in seconds (default 300)
- `vary_combat_length` — variance as fraction (default 0.2)
- `enemy=addN` lines — number of extra enemies (default 0 = 1 total)
- `iterations` — default 10000

### Unowned Item Search

- Bundled `items.db` SQLite (name + slot + base_ilvl only — no stats)
- Schema and FTS5 full-text search index defined in `docs/item-search.md`
- Search fires against local DB instantly; Wowhead API in parallel for misses
- Unowned items need a gear track selection (Myth/Hero/Champion/Veteran/Adventurer)
  which maps to a `bonus_id` — see `GEAR_TRACKS_TWW_S2` in `src/lib/presets/gear-track-presets.ts`
- SimC resolves all item stats internally from `id` + `bonus_id` — we never store stats
- `items.db` is regenerated from SimC's `item_data.inc` by `scripts/build-item-db.ts`
- Add `rusqlite = { version = "0.31", features = ["bundled"] }` to `Cargo.toml`

- Items with `gem_id` fields have sockets
- User provides a list of gem IDs to try per socket
- Combinations include all permutations of gems across all socketed items
- SimC syntax: `gem_id=213743/213744` (slash-separated per socket)

### Enchant Optimization

- Enchantable slots: neck, back, chest, wrist, hands, legs, feet, finger1, finger2, main_hand, off_hand
- User provides a list of enchant IDs to try per slot
- "No enchant" (omit enchant_id) is always an option
- Enchant combos multiply with gear combos — warn user aggressively about count

### Platform

- macOS: arm64 (Apple Silicon) + x86_64 (Intel) — ship a universal binary or two separate
- Windows: x86_64 only
- SimC binary paths inside the sidecar dir follow Tauri's naming convention:
  `simc-{arch}-{os}` (e.g. `simc-aarch64-apple-darwin`, `simc-x86_64-pc-windows-msvc.exe`)

### Never Do

- Never hardcode paths — always use Tauri's `app.path()` APIs
- Never run multiple SimC processes concurrently (CPU thrash)
- Never mutate the original parsed profile — always deep-clone before modifying
- Never block the Tauri main thread — use `async` Rust commands

---

## Key TypeScript Modules (canonical)

- `src/lib/types.ts` — ALL shared types, single source of truth
- `src/lib/parser.ts` — SimC string → SimcProfile
- `src/lib/combinator.ts` — OptimizationAxis[] → combinations[] (pure function)
- `src/lib/profileset-builder.ts` — combinations[] → .simc file string
- `src/lib/optimization-assembler.ts` — collects OptimizationAxis[] from all UI sections
- `src/lib/features.ts` — feature flags (check before implementing any flagged feature)
  ├── src/lib/presets/
  │ ├── season-config.ts ← THE ONLY FILE to edit for a new season
  │ └── gear-track-presets.ts ← re-exports from season-config (legacy compat)
  ├── scripts/
  │ ├── validate-season.ts ← run with `pnpm season:validate` before every release
  │ └── build-item-db.ts ← regenerates src-tauri/assets/items.db from SimC source

The OptimizationAxis pattern is the extensibility foundation — see `docs/extensibility.md`.
Every optimization type (gear, gems, enchants, future features) produces OptimizationAxis[].
The combinator only knows about axes, never about specific optimization types.

---

## TypeScript Types (canonical, live in `src/lib/types.ts`)

```typescript
interface OptimizationAxis {
  id: string; // e.g. "slot:trinket1", "enchant:finger1", "gem:head:socket1"
  label: string; // human-readable for UI
  options: OptimizationOption[];
}

interface OptimizationOption {
  id: string;
  label: string;
  simcLines: string[]; // lines to inject into the profileset for this option
}

interface GearItem {
  slot: string; // e.g. "head", "trinket1"
  id: number;
  bonusIds: number[];
  gemIds: number[];
  enchantId?: number;
  name?: string; // from tooltip lookup, optional
  isEquipped: boolean; // true = currently equipped, false = in bag
}

interface SimcProfile {
  characterName: string;
  realm: string;
  region: string;
  race: string;
  spec: string;
  level: number;
  talentString: string;
  gear: Record<string, GearItem[]>; // slot → items (first = equipped)
  rawLines: string[]; // original lines for reconstruction
}

interface SimResult {
  name: string; // "combo_0000" = baseline, "combo_0001"+ = profilesets
  isBaseline: boolean;
  dps: number;
  stdDev: number;
  meanStdDev: number; // use for statistical noise detection
  axes: Record<string, string>; // axisId → optionId for this combination
}
```

---

## Seasonal Data — How It Works

ALL season-specific constants live in ONE file: `src/lib/presets/season-config.ts`
This includes: gear tracks + bonus_ids, ilvl ranges, socket bonus_id, gem presets,
enchant presets, SimC branch name, current season label.

To update for a new season: edit ONLY that file, then run `pnpm season:validate`.
Full instructions are in `docs/updating-seasons.md`.

Never hardcode season-specific values anywhere outside `season-config.ts`.
If a component needs a gem list or gear track, it imports from season-config.

## Commands to Know

```bash
pnpm install             # install dependencies
pnpm tauri dev           # dev mode (hot reload)
pnpm tauri build         # production build (current platform)
pnpm dev                 # frontend only (no Tauri shell)
pnpm test                # run Vitest
pnpm season:validate     # validate season-config.ts — run before every release
pnpm build:item-db       # regenerate items.db from SimC source
```

## Skills

You must use the frontend-design skill when you are building the UI.
