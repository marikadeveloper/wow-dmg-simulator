# Sprint Status

Last updated: 2026-04-02

---

## EPIC 1 — Profile Import

| #   | Story                                                                        | Status |
| --- | ---------------------------------------------------------------------------- | ------ |
| 1.1 | User pastes a SimC addon export string into a textarea and the app parses it | ✅     |
| 1.2 | App displays character summary after parsing (name, realm, spec, level)      | ✅     |
| 1.3 | App shows a clear error message if the string is malformed or empty          | ✅     |
| 1.4 | App remembers the last pasted string between sessions                        | ✅     |

**Epic status: ✅ 4/4 stories done**

---

## EPIC 2 — Gear Slot Selection

| #    | Story                                                                       | Status |
| ---- | --------------------------------------------------------------------------- | ------ |
| 2.1  | App shows all gear slots as columns, each listing equipped item + bag items | ✅     |
| 2.2  | Items show the item name in the card instead of "Item #itemId"              | ✅     |
| 2.3  | Equipped item is pre-selected and highlighted differently from bag items    | ✅     |
| 2.4  | Vault items are shown aswell with a vault icon                              | ✅     |
| 2.5  | User can select/deselect multiple items per slot to include in comparison   | ✅     |
| 2.6  | Live combination counter updates as user selects items                      | ✅     |
| 2.7  | Warning if combinations > 200; hard block if > 1000                         | ✅     |
| 2.8  | User can bypass the 1000 combination limit via toggle in combination counter | ✅     |
| 2.9  | "Select all" / "Deselect all" per slot                                      | ✅     |
| 2.10 | Items show item level, slot type, and key stats in the card                 | ✅     |
| 2.11 | Items show the name of the enchant it has and of the gem it has equipped    | ✅     |

**Epic status: ✅ 11/11 stories done**

---

## EPIC 3 — Gem Optimization

| #   | Story                                                                             | Status |
| --- | --------------------------------------------------------------------------------- | ------ |
| 3.1 | App detects which equipped/selected items have gem sockets                        | ✅     |
| 3.2 | User can provide a list of gem IDs to try (preset picker + multi-select)          | ✅     |
| 3.3 | App generates combinations with every permutation of provided gems across sockets | ✅     |
| 3.4 | Gem optimization can be combined with gear slot selection in one run              | ✅     |
| 3.5 | App ships with a preset list of current-patch gem IDs for convenience             | ✅     |

**Epic status: ✅ 5/5 stories done**

---

## EPIC 4 — Enchant Optimization

| #   | Story                                                                      | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 4.1 | App detects which slots support enchanting                                 | ✅     |
| 4.2 | For enchantable slots, user can provide a list of enchant IDs to try       | ✅     |
| 4.3 | App generates combinations trying each enchant ID on each enchantable slot | ✅     |
| 4.4 | Enchant optimization can be combined with gear + gem optimization          | ✅     |
| 4.5 | App ships with a preset list of current-patch enchant IDs per slot         | ✅     |
| 4.6 | "No enchant" is always an option (enchant_id omitted)                      | ✅     |

**Epic status: ✅ 6/6 stories done**

---

## EPIC 5 — Simulation Settings

| #    | Story                                                                            | Status |
| ---- | -------------------------------------------------------------------------------- | ------ |
| 5.1  | Fight Style dropdown                                                             | ✅     |
| 5.2  | Fight Length input (max_time)                                                    | ✅     |
| 5.3  | Fight Length Variance input (vary_combat_length)                                 | ✅     |
| 5.4  | Number of enemies input                                                          | ✅     |
| 5.5  | Iterations input (default 10000)                                                 | ✅     |
| 5.6  | Target Error mode (stop when error < N%)                                         | ✅     |
| 5.7  | Threads input (default cpu_count - 1)                                            | ✅     |
| 5.8  | Settings panel is collapsible; defaults are sensible                             | ✅     |
| 5.9  | Check if the combinations chosen are a valid input for simulationcraft           | ✅     |
| 5.10 | Item Sets: minimum set bonus filter per tier set (0/2/4 set)                     | ✅     |
| 5.11 | Item Upgrade Currency: user inputs crest budget, upgrade items to max affordable | ✅     |
| 5.12 | Catalyst Charges: limit how many catalyst-converted items per combination        | ✅     |

**Epic status: ✅ 12/12 stories done**

---

## EPIC 6 — Simulation Execution

| #   | Story                                                             | Status |
| --- | ----------------------------------------------------------------- | ------ |
| 6.1 | "Run Top Gear" button starts the simulation run                   | ✅     |
| 6.2 | Progress bar shows X / N combinations completed                   | ✅     |
| 6.3 | Simulationcraft logs show on the page                             | ✅     |
| 6.4 | Results appear incrementally as each sim finishes                 | ✅     |
| 6.5 | User can cancel an in-progress run                                | ✅     |
| 6.6 | Estimated time remaining shown during run                         | ✅     |
| 6.7 | Each completed sim shows its DPS immediately in the results table | ✅     |

**Epic status: ✅ 7/7 stories done**

---

## EPIC 7 — Results Display

| #    | Story                                                       | Status |
| ---- | ----------------------------------------------------------- | ------ |
| 7.1  | Results shown as ranked table: rank, DPS, delta vs equipped | ✅     |
| 7.2  | Top result is highlighted                                   | ✅     |
| 7.3  | Each result row shows which item is in each slot            | ✅     |
| 7.4  | "Currently equipped" combination always shown for reference | ✅     |
| 7.5  | Results are sortable by DPS                                 | ✅     |
| 7.6  | Export results to CSV                                       | ✅     |
| 7.7  | Show error margin from SimC output                          | ✅     |
| 7.8  | Show if two results are within statistical noise            | ✅     |
| 7.9  | Horizontal bar chart visualization of top results           | ✅     |
| 7.10 | Diff highlighting: show which slots changed vs equipped     | ✅     |
| 7.11 | Paper doll visualization of gear for best result            | ✅     |

**Epic status: ✅ 11/11 stories done**

---

## EPIC 8 — App Settings & Configuration

| #   | Story                                                       | Status |
| --- | ----------------------------------------------------------- | ------ |
| 8.1 | App uses bundled SimC sidecar by default                    | ✅     |
| 8.2 | Settings screen allows user to override SimC binary path    | ✅     |
| 8.3 | App validates the SimC binary on launch and shows version   | ✅     |
| 8.4 | Settings are persisted across sessions (Tauri store plugin) | ✅     |
| 8.5 | App shows SimC version in footer/about screen               | ✅     |

**Epic status: ✅ 5/5 stories done**

---

## EPIC 9 — Distribution & Updates

| #   | Story                                                                      | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 9.1 | GitHub Actions builds .dmg (macOS) and .exe (Windows) on each release tag  | ✅     |
| 9.2 | Installers are published to GitHub Releases                                | ✅     |
| 9.3 | App checks for updates on launch and prompts user                          | ✅     |
| 9.4 | macOS binary is properly code-signed (or gatekeeper workaround documented) | ✅     |

**Epic status: ✅ 4/4 stories done**

---

## EPIC 10 — Unowned Item Search

| #     | Story                                                                          | Status |
| ----- | ------------------------------------------------------------------------------ | ------ |
| 10.1  | Each gear slot card has an "+ Add item to compare" search entry point          | ✅     |
| 10.2  | Typing a name searches local item DB and Wowhead API in parallel               | ✅     |
| 10.3  | Search results show item name, slot type, and quality color                    | ✅     |
| 10.4  | After selecting, user picks gear track (Myth/Hero/Champion/Veteran/Adventurer) | ✅     |
| 10.5  | Unowned items show a distinct [unowned] badge in the slot card                 | ✅     |
| 10.6  | "Assume socket" checkbox available for unowned items                           | ✅     |
| 10.7  | Unowned items excluded from SimC string if deselected                          | ✅     |
| 10.8  | Search works fully offline using bundled items.db SQLite database              | ✅     |
| 10.9  | items.db is regenerated from SimC's item_data.inc by CI script                 | ✅     |
| 10.10 | Recently searched/added unowned items remembered across sessions               | ✅     |
| 10.11 | User can search by item ID directly                                            | ✅     |
| 10.12 | User can refresh local DB                                                      | ✅     |

**Epic status: ✅ 12/12 stories done**

## EPIC 11 — Smart Sim (Multi-Stage Simulation)

| #     | Story                                                                      | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| 11.1  | Create `smart-sim-runner.ts` orchestrator with multi-stage pipeline logic  | ✅     |
| 11.2  | Implement `selectSurvivors` culling function with statistical tie-breaking | ✅     |
| 11.3  | Add `buildProfileSetFileForSubset` to profileset-builder.ts                | ✅     |
| 11.4  | Auto-select stage count based on combination count (1/2/3 stages)          | ✅     |
| 11.5  | Wire smart-sim-runner into the simulation hook                             | ✅     |
| 11.6  | UI: staged progress display (Stage 1/2/3 labels, per-stage progress bar)   | ✅     |
| 11.7  | UI: "Smart Sim" toggle in advanced sim settings                            | ✅     |
| 11.8  | Handle cancellation mid-stage                                              | ✅     |
| 11.9  | Baseline combo_0000 always survives all stages                             | ✅     |
| 11.10 | Unit tests for culling, stage count, subset builder, full pipeline         | ✅     |
| 11.11 | Show "Smart Sim" label in results metadata                                 | ✅     |
| 11.12 | User-configurable stage target errors in advanced settings                 | ✅     |

**Epic status: ✅ 12/12 stories done**

---

## EPIC 12 — Droptimizer

### 12A — Loot Table Database

| #    | Story                                                                                 | Status |
| ---- | ------------------------------------------------------------------------------------- | ------ |
| 12.1 | `scripts/build-loot-db.ts` scrapes Wowhead → loot table DB (instance → boss → items) | ✅     |
| 12.2 | Loot DB: raid difficulty → ilvl mappings + boss tier positions                        | ✅     |
| 12.3 | Loot DB: M+ dungeon → items + keystone level → ilvl table                             | ✅     |
| 12.4 | Loot DB: world boss → items (fixed ilvl)                                              | ✅     |
| 12.5 | Loot DB: catalyst mappings (non-tier → tier conversions)                              | ✅     |
| 12.6 | CI regenerates loot DB each season (`pnpm build:loot-db`)                             | ✅     |

**Sub-epic status: ✅ 6/6 stories done**

### 12B — Navigation & Source Selection

| #     | Story                                                                          | Status |
| ----- | ------------------------------------------------------------------------------ | ------ |
| 12.7  | App navigation: Top Gear / Droptimizer tabs after character loaded             | ✅     |
| 12.8  | Source selector UI: clickable cards for each source type                       | ✅     |
| 12.9  | Raid source: difficulty selector (RF/Normal/Heroic/Mythic + gear track label)  | ✅     |
| 12.10 | M+ source: dungeon selector (All/individual) + keystone level selector         | ✅     |
| 12.11 | World bosses source: no difficulty selector (fixed ilvl)                       | ✅     |
| 12.12 | Catalyst source: tier pieces for character's class/spec                        | ✅     |

**Sub-epic status: ✅ 6/6 stories done**

### 12C — Item List & Configuration

| #     | Story                                                                     | Status |
| ----- | ------------------------------------------------------------------------- | ------ |
| 12.13 | Show all droppable items filtered by class/spec/armor type                | ✅     |
| 12.14 | Item row: name, ilvl, slot, source label (boss/dungeon name)              | ✅     |
| 12.15 | Group by: Item Slot (default) or Boss/Dungeon                             | ✅     |
| 12.16 | "Already wearing this item or better" indicator                           | ✅     |
| 12.17 | "Include Catalyst Items" checkbox (default checked)                       | ✅     |
| 12.18 | "Include Off-Spec Items" checkbox                                         | ✅     |
| 12.19 | "Preferred Gem" dropdown for socketed items                               | ✅     |
| 12.20 | "Add Vault Socket" checkbox                                               | ✅     |
| 12.21 | "Upgrade up to" selector                                                  | ✅     |
| 12.22 | "Upgrade All Equipped Gear to Same Level" checkbox                        | ✅     |

**Sub-epic status: ✅ 10/10 stories done**

### 12D — Droptimizer Simulation

| #     | Story                                                                     | Status |
| ----- | ------------------------------------------------------------------------- | ------ |
| 12.23 | ProfileSet generation: one profileset per drop (single-swap vs baseline)  | ⬜     |
| 12.24 | Enchants inherited from currently equipped item in same slot              | ⬜     |
| 12.25 | Gems/sockets inherited from current neck or first ring                    | ⬜     |
| 12.26 | Rings tried in both slots; trinkets tried in both slots automatically     | ⬜     |
| 12.27 | Unique-Equipped constraint: skip duplicate ring/trinket in same combo     | ⬜     |
| 12.28 | Reuse Smart Sim (Epic 11) for multi-stage adaptive precision              | ⬜     |
| 12.29 | Dual wield classes try weapons in both hands                              | ⬜     |

**Sub-epic status: ⬜ 0/7 stories done**

### 12E — Results Display

| #     | Story                                                                     | Status |
| ----- | ------------------------------------------------------------------------- | ------ |
| 12.30 | Boss/Dungeon Summary view: items grouped by encounter + DPS delta         | ⬜     |
| 12.31 | Per-boss metrics: Expected Value, Best Drop, Priority rank                | ⬜     |
| 12.32 | Priority ranking algorithm (EV grouping → upgrade probability → best)     | ⬜     |
| 12.33 | Sort options: Priority / Boss Order / Expected Value / Best               | ⬜     |
| 12.34 | Item Ranking view: flat list sorted by DPS delta                          | ⬜     |
| 12.35 | Equipped baseline always shown with "Current Gear" label                  | ⬜     |
| 12.36 | Upgrade/downgrade highlighting                                            | ⬜     |
| 12.37 | Ring/trinket slot variations with "N variations hidden" toggle            | ⬜     |
| 12.38 | Relative DPS toggle (% vs absolute)                                       | ⬜     |
| 12.39 | DPS distribution chart per item                                           | ⬜     |
| 12.40 | Results header: "Droptimizer • Source • Difficulty - Name - DPS"          | ⬜     |

**Sub-epic status: ⬜ 0/11 stories done**

**Epic status: ⬜ 22/40 stories done**
