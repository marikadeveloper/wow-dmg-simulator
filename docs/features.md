# Feature Breakdown — Epics & User Stories

This is the authoritative feature list for the app.
Stories marked 🚀 are MVP (ship first). Stories marked 🔮 are post-MVP.
Stories marked ❌ are explicitly out of scope for now.

---

## EPIC 1 — Profile Import

_The user gets their character into the app._

| #   | Story                                                                         | Priority |
| --- | ----------------------------------------------------------------------------- | -------- |
| 1.1 | User pastes a SimC addon export string into a textarea and the app parses it  | 🚀       |
| 1.2 | App displays character summary after parsing (name, realm, spec, level, ilvl) | 🚀       |
| 1.3 | App shows a clear error message if the string is malformed or empty           | 🚀       |
| 1.4 | App remembers the last pasted string between sessions                         | 🔮       |

---

## EPIC 2 — Gear Slot Selection

_The user chooses which items to compare._

| #   | Story                                                                         | Priority |
| --- | ----------------------------------------------------------------------------- | -------- |
| 2.1 | App shows all gear slots as columns, each listing equipped item + bag items   | 🚀       |
| 2.2 | Equipped item is pre-selected and highlighted differently from bag items      | 🚀       |
| 2.3 | User can select/deselect multiple items per slot to include in the comparison | 🚀       |
| 2.4 | Live combination counter updates as user selects items ("X combinations")     | 🚀       |
| 2.5 | Warning shown if combinations > 200; hard block with message if > 1000        | 🚀       |
| 2.6 | "Select all" / "Deselect all" per slot                                        | 🔮       |
| 2.7 | Items show item level, slot type, and key stats in the card                   | 🔮       |

---

## EPIC 3 — Gem Optimization

_The user finds the best gems for their gear._

SimC supports swapping `gem_id` values per item. We generate combinations
by trying different gem IDs in slots that have `gem_id` fields.

| #   | Story                                                                                 | Priority |
| --- | ------------------------------------------------------------------------------------- | -------- |
| 3.1 | App detects which equipped/selected items have gem sockets                            | 🚀       |
| 3.2 | User can provide a list of gem IDs to try (manual input, comma-separated)             | 🚀       |
| 3.3 | App generates combinations with every permutation of the provided gems across sockets | 🚀       |
| 3.4 | Gem optimization can be combined with gear slot selection in one run                  | 🚀       |
| 3.5 | App ships with a preset list of current-patch gem IDs for convenience                 | 🔮       |

**SimC syntax:** `head=,id=235602,bonus_id=...,gem_id=213743/213744`
Multiple gem sockets: `gem_id=213743/213744` (slash-separated, one per socket)

---

## EPIC 4 — Enchant Optimization

_The user finds the best enchants for their gear._

SimC supports swapping `enchant_id` values per item.

| #   | Story                                                                                                                           | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 4.1 | App detects which slots support enchanting (neck, back, chest, wrist, hands, legs, feet, finger1, finger2, main_hand, off_hand) | 🚀       |
| 4.2 | For enchantable slots, user can provide a list of enchant IDs to try                                                            | 🚀       |
| 4.3 | App generates combinations trying each enchant ID on each enchantable slot                                                      | 🚀       |
| 4.4 | Enchant optimization can be combined with gear + gem optimization                                                               | 🚀       |
| 4.5 | App ships with a preset list of current-patch enchant IDs per slot                                                              | 🔮       |
| 4.6 | "No enchant" is always an option (enchant_id omitted)                                                                           | 🚀       |

**SimC syntax:** `finger1=,id=235614,...,enchant_id=7340`

---

## EPIC 5 — Simulation Settings

_The user configures how SimC runs the fight._

| #   | Story                                                                                                                             | Priority |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 5.1 | **Fight Style** dropdown: Patchwerk, CastingPatchwerk, LightMovement, HeavyMovement, HecticAddCleave, DungeonSlice, HelterSkelter | 🚀       |
| 5.2 | **Fight Length** input: `max_time` in seconds (default 300)                                                                       | 🚀       |
| 5.3 | **Fight Length Variance** input: `vary_combat_length` as % (default 20%)                                                          | 🚀       |
| 5.4 | **Number of enemies** input: how many `enemy=` lines to add (default 1)                                                           | 🚀       |
| 5.5 | **Iterations** input: default 10000, range 1000–100000                                                                            | 🚀       |
| 5.6 | Alternative **Target Error** mode: stop when error < N% (replaces iterations)                                                     | 🔮       |
| 5.7 | **Threads** input: default cpu_count - 1                                                                                          | 🚀       |
| 5.8 | Settings panel is collapsible; defaults are sensible so most users never open it                                                  | 🚀       |
| 5.10 | **Item Sets**: App detects tier sets from equipped/selected gear and shows a minimum set bonus filter (0/2/4 set) per tier set. Combinations that don't meet the minimum are excluded. | 🔮       |
| 5.11 | **Item Upgrade Currency**: User inputs how many upgrade crests they own (e.g. Hero Dawncrest, Myth Dawncrest). A button upgrades selected items to the max affordable ilvl within budget. Upgraded items are included as additional combinations. | 🔮       |
| 5.12 | **Catalyst Charges**: User sets how many Catalyst charges they want to use (0–6). This limits how many Catalyst-converted tier items can appear in a single combination. Requires "Copy and Modify" (unowned item flow) to add the catalyst version of an item. | 🔮       |

**Fight style reference:**

- `Patchwerk` — single target, no movement, pure ST DPS check (default, most used)
- `CastingPatchwerk` — Patchwerk but boss casts (good for interrupt value)
- `LightMovement` — occasional movement (~15s every 85s)
- `HeavyMovement` — frequent movement (~25s every 20s)
- `HecticAddCleave` — boss + frequent add waves + movement (M+ / cleave fights)
- `DungeonSlice` — mixed single/AoE, emulates a dungeon run (do NOT use DPS value for comparison, only for gear decisions)
- `HelterSkelter` — movement + stuns + interrupts + target switching

---

## EPIC 6 — Simulation Execution

_The app runs SimC and reports progress._

| #   | Story                                                              | Priority |
| --- | ------------------------------------------------------------------ | -------- |
| 6.1 | "Run Top Gear" button starts the simulation run                    | 🚀       |
| 6.2 | Progress bar shows X / N combinations completed                    | 🚀       |
| 6.3 | Results appear incrementally as each sim finishes (not all at end) | 🚀       |
| 6.4 | User can cancel an in-progress run                                 | 🚀       |
| 6.5 | Estimated time remaining shown during run                          | 🔮       |
| 6.6 | Each completed sim shows its DPS immediately in the results table  | 🚀       |

---

## EPIC 7 — Results Display

_The user reads and acts on the results._

| #   | Story                                                                                | Priority |
| --- | ------------------------------------------------------------------------------------ | -------- |
| 7.1 | Results shown as a ranked table: rank, DPS, Δ vs equipped (absolute + %)             | 🚀       |
| 7.2 | Top result is highlighted (best combination found)                                   | 🚀       |
| 7.3 | Each result row shows which item is in each slot for that combination                | 🚀       |
| 7.4 | "Currently equipped" combination is always shown for reference, even if not the best | 🚀       |
| 7.5 | Results are sortable by DPS                                                          | 🔮       |
| 7.6 | Export results to CSV                                                                | 🔮       |
| 7.7 | Show error margin (std_dev / mean_std_dev) from SimC output                          | 🔮       |
| 7.8 | Show if two results are within statistical noise of each other                       | 🔮       |
| 7.9 | Horizontal bar chart visualization of top results (à la Raidbots)                    | 🔮       |
| 7.10 | Diff highlighting: slots that changed vs equipped are visually called out           | 🔮       |
| 7.11 | Paper doll visualization showing gear icons for the best result                     | 🔮       |

---

## EPIC 8 — App Settings & Configuration

_The app is configurable and works out of the box._

| #   | Story                                                                         | Priority |
| --- | ----------------------------------------------------------------------------- | -------- |
| 8.1 | App uses bundled SimC sidecar by default — user does not need to install SimC | 🚀       |
| 8.2 | Settings screen allows user to override SimC binary path (for power users)    | 🔮       |
| 8.3 | App validates the SimC binary on launch and shows version                     | 🚀       |
| 8.4 | Settings are persisted across sessions (Tauri store plugin)                   | 🚀       |
| 8.5 | App shows SimC version in footer/about screen                                 | 🔮       |

---

## EPIC 9 — Distribution & Updates

_Non-technical users can install and keep the app up to date._

| #   | Story                                                                                            | Priority |
| --- | ------------------------------------------------------------------------------------------------ | -------- |
| 9.1 | GitHub Actions builds `.dmg` (macOS arm64 + x86_64) and `.exe` (Windows x64) on each release tag | 🚀       |
| 9.2 | Installers are published to GitHub Releases                                                      | 🚀       |
| 9.3 | App checks for updates on launch and prompts user                                                | 🔮       |
| 9.4 | macOS binary is properly code-signed (or at least gatekeeper workaround is documented)           | 🔮       |

---

## EPIC 10 — Unowned Item Search

_The user simulates gear they don't own yet to decide if it's worth farming._

| #     | Story                                                                                                                                        | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 10.1  | Each gear slot card has an "+ Add item to compare" search entry point                                                                        | 🚀       |
| 10.2  | Typing a name searches both local item DB and Wowhead API in parallel                                                                        | 🚀       |
| 10.3  | Search results show item name, slot type, and quality color                                                                                  | 🚀       |
| 10.4  | After selecting an unowned item, user picks the gear track (Myth/Hero/Champion/Veteran/Adventurer) which determines the simulated ilvl range | 🚀       |
| 10.5  | Unowned items show a distinct `[unowned]` badge in the slot card                                                                             | 🚀       |
| 10.6  | "Assume socket" checkbox available for unowned items                                                                                         | 🚀       |
| 10.7  | Unowned items are excluded from the SimC string if deselected, like any other item                                                           | 🚀       |
| 10.8  | Search works fully offline using the bundled `items.db` SQLite database                                                                      | 🚀       |
| 10.9  | `items.db` is regenerated from SimC's `item_data.inc` by a CI script each release                                                            | 🚀       |
| 10.10 | Recently searched/added unowned items are remembered across sessions                                                                         | 🔮       |
| 10.11 | User can search by item ID directly (e.g. paste `235620`)                                                                                    | 🔮       |

**Key constraint:** SimC knows all item stats internally from the item ID + bonus_ids.
The app only needs to resolve item names for the UI. No stat DB required.
See `docs/item-search.md` for full implementation spec.

---

## EPIC 11 — Smart Sim (Multi-Stage Simulation)

_The app runs large sims much faster by culling bad combinations early._

Inspired by Raidbots' Smart Sim and AutoSimC. Instead of running all
combinations at full precision, the app runs 3 stages of increasing accuracy,
eliminating obvious losers after each stage. For 200+ combos this can be ~30x
faster than brute-force.

See `docs/smart-sim.md` for research and `docs/smart-sim-implementation.md`
for the technical design.

| #     | Story                                                                                                                                                    | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 11.1  | Create `smart-sim-runner.ts` orchestrator with multi-stage pipeline logic (stage loop, culling between stages, callbacks for progress/IPC)               | 🚀       |
| 11.2  | Implement `selectSurvivors` culling function — top-N% with statistical tie-breaking using `mean_std_dev`                                                 | 🚀       |
| 11.3  | Add `buildProfileSetFileForSubset` to `profileset-builder.ts` — builds a .simc file for a subset of combos with a stage-specific `target_error` override | 🚀       |
| 11.4  | Auto-select stage count based on combination count: 1 stage (< 50), 2 stages (50-199), 3 stages (200+)                                                  | 🚀       |
| 11.5  | Wire smart-sim-runner into the simulation hook — call `run_top_gear` once per stage, feed survivors into the next stage                                  | 🚀       |
| 11.6  | UI: staged progress display — show Stage 1/2/3 labels, per-stage progress bar, combo count per stage                                                    | 🚀       |
| 11.7  | UI: "Smart Sim" toggle in advanced sim settings (enabled by default for 50+ combos, hidden for small sims)                                               | 🚀       |
| 11.8  | Handle cancellation mid-stage — kill SimC process, return partial results from completed stages                                                          | 🚀       |
| 11.9  | Baseline (`combo_0000`) always survives all stages so it appears in the final ranking                                                                    | 🚀       |
| 11.10 | Unit tests: `selectSurvivors` culling logic, `getStageCount` thresholds, `buildProfileSetFileForSubset` output, full pipeline with mocked `runSimC`      | 🚀       |
| 11.11 | Show "Smart Sim" label in results metadata (like Raidbots shows "10,250 (Smart Sim)")                                                                    | 🔮       |
| 11.12 | User-configurable stage target errors in advanced settings (power users)                                                                                 | 🔮       |

**Key constraint:** No Rust backend changes needed. The existing `run_top_gear`
command is called once per stage. The orchestration is entirely in TypeScript.

---

## OUT OF SCOPE (for now) ❌

These features exist on Raidbots but are not part of this app's initial scope:

| Feature                             | Why deferred                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| **Droptimizer** (what to farm)      | Different sim type entirely, much more complex                      |
| **Quick Sim** (single DPS snapshot) | Useful but not the core use case                                    |
| **Talent comparison**               | Combinations explode extremely fast with talents added              |
| **Stat weights / scale factors**    | Different SimC mode (`calculate_scale_factors=1`), separate feature |
| **Custom APL editor**               | Advanced power-user feature, defer to v2                            |
| **DungeonRoute** fight style        | Requires custom enemy/pull definitions, very complex UI             |
| **Raid buff overrides**             | (bloodlust, fort, etc.) SimC applies sensible defaults              |

---

## Combination Explosion Reference

Before building the gem/enchant optimization, understand the math:

| Gear slots                  | Items each | Gem options            | Enchant options per slot | Total          |
| --------------------------- | ---------- | ---------------------- | ------------------------ | -------------- |
| 2 (trinkets)                | 3 each     | —                      | —                        | 9              |
| 2 (trinkets) + 2 (rings)    | 3 each     | —                      | 3 enchants each          | 9 × 9 = 81     |
| 2 trinkets + 2 rings + gems | 3 each     | 3 gem types, 4 sockets | 3 enchants               | could be 1000s |

**Rule of thumb:** Gear + enchant optimization should be run separately from gem optimization, or the UI must warn users very clearly about combo count before they run.
