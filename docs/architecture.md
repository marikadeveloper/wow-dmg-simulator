# Architecture

## Full Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER PASTES SimC addon export string                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  parser.ts  (frontend, pure TypeScript)                         │
│  SimC string → SimcProfile                                      │
│  • Extracts character metadata, talents, rawLines               │
│  • Parses equipped gear lines  (isEquipped: true)               │
│  • Parses bag item lines       (isEquipped: false)              │
└────────────────────────┬────────────────────────────────────────┘
                         │ SimcProfile
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  item-cache.ts  (frontend)                                      │
│  Prefetches item names for all IDs via invoke("fetch_item_data")│
│  Caches in Tauri store (7-day TTL)                              │
│  Falls back to "Item #ID" if offline                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ SimcProfile + resolved names
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GEAR & OPTIMIZATION PANEL  (React UI)                          │
│  • GearSlotCard per slot — shows equipped + bag + unowned items │
│  • User selects items, gems, enchants to compare               │
│  • EnchantSelector — reads ENCHANT_PRESETS from season-config  │
│  • GemSelector — reads GEM_PRESETS from season-config          │
│  • ItemSearch — calls invoke("search_items") for unowned gear  │
│  • SimSettings — fight style, duration, enemies, iterations    │
└────────────────────────┬────────────────────────────────────────┘
                         │ selections
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  optimization-assembler.ts  (frontend)                          │
│  Collects OptimizationAxis[] from all UI sections               │
│  Exposes live combination count for the counter widget          │
└────────────────────────┬────────────────────────────────────────┘
                         │ OptimizationAxis[]
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  combinator.ts  (frontend, pure function)                       │
│  OptimizationAxis[] → CombinationSpec[]                         │
│  • Cartesian product of all axes                                │
│  • Gem axes are conditional on parent item selection            │
│  • Enforces 1000-combination hard cap                           │
│  • combo_0000 = baseline (currently equipped, no overrides)     │
│  • combo_0001+ = profileset entries                             │
└────────────────────────┬────────────────────────────────────────┘
                         │ CombinationSpec[]
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  profileset-builder.ts  (frontend, pure function)               │
│  CombinationSpec[] + SimcProfile + SimSettings → .simc string   │
│  Sections in order:                                             │
│    1. Global options (fight_style, max_time, iterations, etc.)  │
│    2. Base character profile (from rawLines, unmodified)        │
│    3. Enemy lines (if numEnemies > 1)                           │
│    4. ProfileSet entries (profileset."combo_NNNN"= ...)         │
│  Also builds Map<name, CombinationSpec> manifest for parsing    │
└────────────────────────┬────────────────────────────────────────┘
                         │ .simc file content string
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  invoke("run_top_gear", { simcContent })  ← Tauri IPC           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  run_simc.rs  (Rust, async Tauri command)                       │
│  1. Write simcContent to temp file  (uuid.simc)                 │
│  2. Create temp path for JSON output (uuid.json)                │
│  3. Invoke SimC sidecar via app.shell().sidecar("simc")         │
│  4. Wait for exit — check JSON file exists, NOT exit code       │
│     (SimC exits 1 on warnings even when successful)             │
│  5. Read and return JSON file content                           │
│  6. Clean up both temp files in all exit paths                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ json2 output string
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  profileset-builder.ts → parseSimCResults()  (frontend)         │
│  Parses json2 output:                                           │
│  • Base DPS: sim.players[0].collected_data.dps.mean             │
│  • ProfileSet DPS: profilesets.results[i].mean                  │
│  • Merges with manifest → SimResult[]                           │
│  • Sorted by DPS descending                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ SimResult[]
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESULTS TABLE  (React UI)                                      │
│  • Ranked table with DPS + delta vs equipped                    │
│  • Currently equipped row always pinned (📌)                    │
│  • ≈ badge for combinations within statistical noise            │
│  • Expand row for full item/gem/enchant breakdown               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tauri IPC Commands

All Rust backend logic is exposed as Tauri commands. No HTTP server runs inside the app.

| Command                | Input                  | Output                   | Defined in              |
| ---------------------- | ---------------------- | ------------------------ | ----------------------- |
| `run_top_gear`         | `simc_content: String` | `String` (json2 content) | `commands/run_simc.rs`  |
| `fetch_item_data`      | `item_id: u32`         | `String` (Wowhead XML)   | `commands/item_data.rs` |
| `search_items`         | `query: String`        | `Vec<ItemSearchResult>`  | `commands/item_data.rs` |
| `get_config`           | —                      | `AppConfig`              | `commands/config.rs`    |
| `set_config`           | `AppConfig`            | —                        | `commands/config.rs`    |
| `validate_simc_binary` | —                      | `BinaryStatus`           | `commands/config.rs`    |

---

## Key Architectural Rules

1. **`combinator.ts` and `profileset-builder.ts` are pure functions** — no I/O, no side effects, fully testable without Tauri.

2. **All SimC knowledge lives in `docs/`**, not in code comments. Code is kept clean; the docs explain the why.

3. **`season-config.ts` is the only file edited for seasonal updates** — no other file should contain season-specific IDs or ilvl values.

4. **The SimC binary exit code is not reliable** — always check whether the json2 output file exists rather than checking `exit_code == 0`. SimC exits 1 on warnings even for successful simulations.

5. **Gem axes are conditional** — they have a `parentItemId` and only participate in combinations where that item is selected. See `docs/gem-enchant-axis.md`.

6. **ProfileSet parallel mode** is always enabled via `profileset_work_threads=2` — this is significantly faster than sequential mode for large combination sets.

---

## Item Search Architecture

```
User types in search box
        │  (debounced 400ms)
        ▼
invoke("search_items", { query })
        │
        ├─► SQLite FTS5 query on items.db (instant, offline)
        │   src-tauri/assets/items.db
        │
        └─► Wowhead search API (parallel, online)
            https://www.wowhead.com/search?q=QUERY&xml

Results merged, deduplicated by item_id, up to 10 shown
User selects item → gear track picker appears
Track selection → bonus_id from GEAR_TRACKS in season-config.ts
Final SimC line: slot=,id=ITEM_ID,bonus_id=TRACK_BONUS_ID
```

---

## Season Config Architecture

All season-specific data flows from a single file:

```
src/lib/presets/season-config.ts
    │
    ├── GEAR_TRACKS          → ItemSearch track picker dropdown
    ├── GEM_PRESETS          → GemSelector dropdowns
    ├── ENCHANT_PRESETS      → EnchantSelector dropdowns
    ├── SOCKET_BONUS_ID      → "Assume socket" checkbox
    └── CURRENT_SEASON       → scripts/build-item-db.ts (SimC branch)

Validation: pnpm season:validate (run before every release)
```

---

## First-Run Experience

On first launch, the app:

1. Runs `validate_simc_binary` Tauri command to check the sidecar is accessible
2. On macOS, strips quarantine xattr from the sidecar binary (silent, automatic)
3. If binary check passes → show the main screen with paste area
4. If binary check fails → show an error screen with instructions

The main screen before any string is pasted shows:

- A large paste area / drag target in the center
- Brief one-line instructions: "Paste your `/simc` export from the WoW addon"
- A link to explain how to get the SimC addon

---

## File Structure

```
src/
├── components/
│   ├── FirstRun.tsx           ← shown on first launch / binary error
│   ├── PasteScreen.tsx        ← main input area before string is pasted
│   ├── gear/
│   │   ├── GearSlotCard.tsx   ← one card per slot
│   │   └── ItemSearch.tsx     ← inline search for unowned items
│   ├── optimizations/
│   │   ├── GemSelector.tsx    ← gem options per socket
│   │   └── EnchantSelector.tsx ← enchant options per slot
│   ├── results/
│   │   ├── ResultsTable.tsx
│   │   └── ResultRow.tsx
│   └── settings/
│       └── SimSettings.tsx    ← fight style, duration, enemies, iterations
├── lib/
│   ├── types.ts
│   ├── parser.ts
│   ├── combinator.ts
│   ├── profileset-builder.ts
│   ├── optimization-assembler.ts
│   ├── item-cache.ts
│   ├── features.ts
│   └── presets/
│       └── season-config.ts   ← ONLY file edited for seasonal updates
├── hooks/
│   ├── useSimulation.ts       ← manages sim run state + Tauri invoke
│   └── useProfile.ts          ← manages parsed SimcProfile state
└── App.tsx
```
