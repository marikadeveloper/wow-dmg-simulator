# Sprint Status

Last updated: 2026-03-24

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
| 2.8  | "Select all" / "Deselect all" per slot                                      | ✅     |
| 2.9  | Items show item level, slot type, and key stats in the card                 | ✅     |
| 2.10 | Items show the name of the enchant it has and of the gem it has equipped    | ✅     |

**Epic status: ✅ 10/10 stories done**

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

| #   | Story                                                                      | Status     |
| --- | -------------------------------------------------------------------------- | ---------- |
| 4.1 | App detects which slots support enchanting                                 | ✅         |
| 4.2 | For enchantable slots, user can provide a list of enchant IDs to try       | ✅ backend |
| 4.3 | App generates combinations trying each enchant ID on each enchantable slot | ✅ backend |
| 4.4 | Enchant optimization can be combined with gear + gem optimization          | ✅ backend |
| 4.5 | App ships with a preset list of current-patch enchant IDs per slot         | ✅ presets |
| 4.6 | "No enchant" is always an option (enchant_id omitted)                      | ✅ backend |

**Epic status: 🟡 Combinator + presets done, all UI pending**

---

## EPIC 5 — Simulation Settings

| #   | Story                                                | Status     |
| --- | ---------------------------------------------------- | ---------- |
| 5.1 | Fight Style dropdown                                 | ✅ backend |
| 5.2 | Fight Length input (max_time)                        | ✅ backend |
| 5.3 | Fight Length Variance input (vary_combat_length)     | ✅ backend |
| 5.4 | Number of enemies input                              | ✅ backend |
| 5.5 | Iterations input (default 10000)                     | ✅ backend |
| 5.6 | Target Error mode (stop when error < N%)             | ⬜         |
| 5.7 | Threads input (default cpu_count - 1)                | ✅ backend |
| 5.8 | Settings panel is collapsible; defaults are sensible | ⬜         |

**Epic status: 🟡 ProfileSet builder handles all settings, UI not started**

---

## EPIC 6 — Simulation Execution

| #   | Story                                                             | Status     |
| --- | ----------------------------------------------------------------- | ---------- |
| 6.1 | "Run Top Gear" button starts the simulation run                   | ✅ backend |
| 6.2 | Progress bar shows X / N combinations completed                   | ⬜         |
| 6.3 | Simulationcraft logs show on the page                             | ⬜         |
| 6.4 | Results appear incrementally as each sim finishes                 | ⬜         |
| 6.5 | User can cancel an in-progress run                                | ⬜         |
| 6.6 | Estimated time remaining shown during run                         | ⬜         |
| 6.7 | Each completed sim shows its DPS immediately in the results table | ⬜         |

**Epic status: 🟡 Tauri run_simc command done, UI not started**

---

## EPIC 7 — Results Display

| #   | Story                                                       | Status |
| --- | ----------------------------------------------------------- | ------ |
| 7.1 | Results shown as ranked table: rank, DPS, delta vs equipped | ⬜     |
| 7.2 | Top result is highlighted                                   | ⬜     |
| 7.3 | Each result row shows which item is in each slot            | ⬜     |
| 7.4 | "Currently equipped" combination always shown for reference | ⬜     |
| 7.5 | Results are sortable by DPS                                 | ⬜     |
| 7.6 | Export results to CSV                                       | ⬜     |
| 7.7 | Show error margin from SimC output                          | ⬜     |
| 7.8 | Show if two results are within statistical noise            | ⬜     |

**Epic status: 🔴 json2 parser exists, UI not started**

---

## EPIC 8 — App Settings & Configuration

| #   | Story                                                       | Status     |
| --- | ----------------------------------------------------------- | ---------- |
| 8.1 | App uses bundled SimC sidecar by default                    | ✅ backend |
| 8.2 | Settings screen allows user to override SimC binary path    | ⬜         |
| 8.3 | App validates the SimC binary on launch and shows version   | ✅ backend |
| 8.4 | Settings are persisted across sessions (Tauri store plugin) | ⬜         |
| 8.5 | App shows SimC version in footer/about screen               | ⬜         |

**Epic status: 🟡 Tauri commands exist (validate_simc_binary), store not wired, UI missing**

---

## EPIC 9 — Distribution & Updates

| #   | Story                                                                      | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 9.1 | GitHub Actions builds .dmg (macOS) and .exe (Windows) on each release tag  | ⬜     |
| 9.2 | Installers are published to GitHub Releases                                | ⬜     |
| 9.3 | App checks for updates on launch and prompts user                          | ⬜     |
| 9.4 | macOS binary is properly code-signed (or gatekeeper workaround documented) | ⬜     |

**Epic status: 🔴 Not started**

---

## EPIC 10 — Unowned Item Search

| #     | Story                                                                          | Status     |
| ----- | ------------------------------------------------------------------------------ | ---------- |
| 10.1  | Each gear slot card has an "+ Add item to compare" search entry point          | ⬜         |
| 10.2  | Typing a name searches local item DB and Wowhead API in parallel               | ✅ backend |
| 10.3  | Search results show item name, slot type, and quality color                    | ⬜         |
| 10.4  | After selecting, user picks gear track (Myth/Hero/Champion/Veteran/Adventurer) | ✅ presets |
| 10.5  | Unowned items show a distinct [unowned] badge in the slot card                 | ⬜         |
| 10.6  | "Assume socket" checkbox available for unowned items                           | ⬜         |
| 10.7  | Unowned items excluded from SimC string if deselected                          | ⬜         |
| 10.8  | Search works fully offline using bundled items.db SQLite database              | ✅ backend |
| 10.9  | items.db is regenerated from SimC's item_data.inc by CI script                 | ✅ script  |
| 10.10 | Recently searched/added unowned items remembered across sessions               | ⬜         |
| 10.11 | User can search by item ID directly                                            | ⬜         |

**Epic status: 🟡 Backend search + item cache + build script done, UI not started**
