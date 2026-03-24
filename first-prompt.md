Read CLAUDE.md and every file in docs/ before doing anything else.
The full spec, all constraints, all naming conventions, and all architectural
decisions live there. Do not proceed until you have read all 12 docs files.

---

I'm building a WoW Top Gear desktop app. Scaffold the entire project foundation
in the order below. After each numbered step, confirm it compiles/runs before
moving to the next.

---

## Step 1 — Initialize the Tauri + React + TypeScript project

```bash
pnpm create tauri-app@latest wow-topgear --template react-ts --manager pnpm
cd wow-topgear
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @tauri-apps/plugin-shell @tauri-apps/plugin-store
```

- Configure Tailwind v4 in `vite.config.ts` using the `@tailwindcss/vite` plugin
- Add `@import "tailwindcss"` to `src/index.css`
- Add `tauri-plugin-shell` and `tauri-plugin-store` to `src-tauri/Cargo.toml`
  (exact versions and feature flags are in `docs/tauri-build.md`)
- Register both plugins in `src-tauri/src/main.rs`
- Configure the SimC sidecar in `tauri.conf.json` exactly as specified in
  `docs/tauri-build.md` — the `externalBin` declaration and shell permissions

---

## Step 2 — Shared TypeScript types

Create `src/lib/types.ts` with exactly the types defined in CLAUDE.md:
`OptimizationAxis`, `OptimizationOption`, `GearItem`, `SimcProfile`,
`SimResult`, `AppConfig`, and `CombinationSpec`.

No additions, no omissions. This file is the single source of truth.

---

## Step 3 — Season config + feature flags

Create `src/lib/presets/season-config.ts` exactly as defined in the
`season-config.ts` artifact. This is the single source of truth for all
seasonal data (gear tracks, gems, enchants, socket bonus_id, SimC branch).
Leave all `bonusId: 0` and `id: 0` placeholders as-is — do not invent values.

Create `src/lib/features.ts` as defined in `docs/extensibility.md`:

```typescript
export const FEATURES = {
  GEM_OPTIMIZATION: true,
  ENCHANT_OPTIMIZATION: true,
  EMBELLISHMENT_COMPARISON: false,
  TALENT_COMPARISON: false,
} as const;
```

---

## Step 4 — Build-item-db script (stub)

Create `scripts/build-item-db.ts` and `scripts/validate-season.ts` exactly
as defined in their respective artifacts. For `build-item-db.ts`, implement
the full script as specced in `docs/build-item-db.md` including the
`parseItemData` function — use the inventory type mapping from that doc.
Add `better-sqlite3` and `tsx` to devDependencies.

Also create `src-tauri/assets/` directory with a `.gitkeep` so the path exists.
Add `items.db` to `.gitignore` (it is generated, not committed).
Add the `resources` array to `tauri.conf.json` as specified in `docs/build-item-db.md`.

---

## Step 5 — SimC string parser

Create `src/lib/parser.ts` exporting:

```typescript
export function parseSimcString(input: string): SimcProfile;
```

Follow `docs/simc-string-format.md` exactly:

- Extract character metadata (class/name, level, race, region, server, spec, talents)
- Parse equipped gear lines (`slot=,id=N,...`) with `isEquipped: true`
- Parse bag item lines (`# slot=,id=N,...`) with `isEquipped: false`
- Parse `bonus_id`, `gem_id` (slash-separated → number[]), `enchant_id`
- Store ALL original lines verbatim in `rawLines`
- Ignore: header comments, `professions=`, `role=`, blank lines
- Never ignore: `spec=`, `talents=`, gear lines

Write comprehensive Vitest unit tests in `src/lib/parser.test.ts` using the
full example string from `docs/simc-string-format.md` as the fixture. Test:

- Metadata extraction
- Equipped item parsing
- Bag item parsing (isEquipped: false)
- Multi-value fields (bonus_id, gem_id)
- Missing optional fields (no enchant, no gems) don't throw

---

## Step 6 — Combination generator

Create `src/lib/combinator.ts` exporting:

```typescript
export function countCombinations(axes: OptimizationAxis[]): number;

export function generateCombinations(
  axes: OptimizationAxis[],
  cap?: number, // default 1000
): CombinationSpec[];
```

Rules from `docs/extensibility.md` and `docs/gem-enchant-axis.md`:

- Cartesian product of all axes
- Axes with `parentItemId` are conditional — they only participate in combinations
  where the matching item was chosen on the parent slot axis (see gem-enchant-axis.md
  for the full conditional cartesian product algorithm)
- Axes with 0 or 1 options do not multiply the count
- Enforce the cap — throw a typed error if exceeded, not a silent truncation
- Combination names: `combo_0000` = reserved for baseline, `combo_0001`+ for sets
- Each `CombinationSpec` includes `name`, `axes` (axisId → optionId), and
  `overrideLines` (the SimC lines that differ from the base profile)

Write unit tests in `src/lib/combinator.test.ts` covering:

- Single axis (no multiplication)
- Multiple unconditional axes (cartesian product)
- Conditional gem axes (only active for their parent item)
- Cap enforcement
- Baseline detection (zero overrides = currently equipped)

---

## Step 7 — ProfileSet builder

Create `src/lib/profileset-builder.ts` exporting:

```typescript
export function buildProfileSetFile(
  profile: SimcProfile,
  combinations: CombinationSpec[],
  settings: SimSettings,
): string;
```

Follow `docs/profileset-builder.md` exactly — this is the most critical transform.
The output is the `.simc` file content passed to the SimC binary. It must contain:

1. Global sim options (fight_style, max_time, vary_combat_length, iterations,
   threads, process_priority, output=nul/dev/null, json2=path,
   profileset_work_threads=2)
2. Base character profile (from `profile.rawLines`, unmodified)
3. Enemy lines if `settings.numEnemies > 1`
4. ProfileSet entries — one per non-baseline combination, using `=` for the first
   line and `+=` for subsequent lines, names in double quotes

Also export:

```typescript
export function parseSimCResults(
  jsonText: string,
  manifest: Map<string, CombinationSpec>,
): SimResult[];
```

Parses the json2 output. Base DPS from `sim.players[0].collected_data.dps.mean`.
ProfileSet DPS from `profilesets.results[i].mean`. Returns sorted by DPS desc.
Include `meanStdDev` for noise detection. See `docs/profileset-builder.md` for
the full output schema.

Write unit tests covering:

- File structure (sections appear in correct order)
- Single combination (only base profile, no profilesets)
- Multiple combinations (correct = vs += usage)
- Multi-enemy output
- Result parsing (base + profilesets merged and sorted)

---

## Step 8 — Item data fetching (Rust + TypeScript)

**Rust side** — create `src-tauri/src/commands/item_data.rs`:

```rust
#[tauri::command]
pub async fn fetch_item_data(item_id: u32) -> Result<String, String>
```

Fetches `https://www.wowhead.com/item={id}&xml` using `reqwest`.
On macOS, also implement `remove_quarantine(path)` as described in
`docs/tauri-build.md` to strip the quarantine xattr from the SimC sidecar.

**TypeScript side** — create `src/lib/item-cache.ts`:

- `getItemData(id: number): Promise<CachedItem | null>`
- `prefetchAllItems(profile: SimcProfile): Promise<void>` — parallel with
  concurrency limit of 5, using the pattern in `docs/item-data.md`
- Cache via `@tauri-apps/plugin-store` with 7-day TTL
- Fallback: return `{ name: 'Item #ID', ilvl: 0, quality: 0 }` if both
  fetch and cache fail — never block or throw

---

## Step 9 — Rust SimC runner + first-run binary validation

Create `src-tauri/src/commands/run_simc.rs` with:

```rust
#[tauri::command]
pub async fn run_top_gear(
  app: tauri::AppHandle,
  simc_content: String,
) -> Result<String, String>
```

Steps inside the command:

1. Write `simc_content` to a temp file (`uuid.simc`) via `std::env::temp_dir()`
2. Create a second temp path for json output (`uuid.json`)
3. Invoke the SimC sidecar via `app.shell().sidecar("simc")` with args from
   `docs/tauri-build.md` — including platform-conditional `output=nul` vs
   `output=/dev/null`
4. After completion, check if the json output file exists (do NOT rely on exit
   code alone — SimC exits 1 on warnings even on success)
5. Read and return the json file contents
6. Clean up both temp files in all exit paths (success, error, panic)

Also create `validate_simc_binary` command in `commands/config.rs`:

```rust
#[tauri::command]
pub async fn validate_simc_binary(app: tauri::AppHandle) -> Result<BinaryStatus, String>
```

This command:

1. On macOS: strips quarantine xattr from the sidecar path (silent, via `xattr -d com.apple.quarantine`) — see `docs/tauri-build.md`
2. Attempts to run `simc --version` via the sidecar
3. Returns `BinaryStatus { ok: bool, version: Option<String>, error: Option<String> }`

This is called once on app startup. The frontend shows an error screen if `ok` is false.

Register all commands in `main.rs`: `run_top_gear`, `fetch_item_data`,
`search_items`, `validate_simc_binary`, `get_config`, `set_config`.

---

## Step 10 — Config commands stub

Create `src-tauri/src/commands/config.rs` with `get_config` and `set_config`
commands. `AppConfig` shape is in CLAUDE.md. Persist via `tauri-plugin-store`.
Default: `simcBinaryPath: null`, `iterations: 10000`, `threads: cpu_count - 1`.

---

## Step 11 — Update CLAUDE.md

Mark all completed steps ✅ in the "Current Status" section.

---

## Hard constraints (apply to every step)

- Never use `any` in TypeScript — use `unknown` and narrow it
- All Rust Tauri commands must be `async`
- Parser must never throw on missing optional fields — always use safe defaults
- Combinator is a pure function — no side effects, no I/O
- ProfileSet builder is a pure function — takes data in, returns a string out
- Do not install any UI component library — Tailwind only for now
- Do not start building React UI components yet — foundation only in this session
