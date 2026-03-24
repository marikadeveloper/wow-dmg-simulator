# Architecture Decision Records

This file logs every non-obvious decision made during development.
Always add an entry here when you make a significant technical or UX choice.

---

## 2026-03-23 — Use Tauri instead of Electron or Docker

**Decision:** Desktop app via Tauri 2.x.

**Why:**

- Target users are WoW gamers — comfortable with installers, not terminals or Docker
- Tauri bundles the SimC sidecar and the React UI into a single native installer
- Smaller binary footprint than Electron (~5-15MB overhead vs ~150MB)
- GitHub Actions can produce `.dmg` + `.exe` automatically on each release
- React frontend is reused unchanged — Tauri only wraps it

**Rejected alternatives:**

- Electron: too heavy, same result
- Docker: requires Docker Desktop, alien to non-technical users
- Raw local install guide: too many steps, too many failure points

---

## 2026-03-23 — No separate HTTP backend; use Tauri IPC commands

**Decision:** All "backend" logic (spawning SimC, reading config) is implemented
as Tauri commands in Rust. No Express/Hono/Bun server runs inside the app.

**Why:**

- Tauri already provides a message-passing bridge between frontend and Rust
- Eliminates port conflicts, firewall issues, and "is the server running?" problems
- Rust is well-suited for spawning child processes and handling file I/O
- Simpler mental model: one process, not two

---

## 2026-03-23 — Run SimC processes sequentially, not in parallel

**Decision:** Only one SimC process runs at a time, even when there are many combinations.

**Why:**

- SimC itself is already multi-threaded and uses all available CPU cores
- Running multiple instances simultaneously would cause CPU thrashing and slower results
- Sequential execution gives predictable progress (1/N, 2/N, ...) that's easy to stream
- Users expect a progress bar, not a sudden result dump

---

## 2026-03-23 — Carry over equipped enchant when bag item lacks one

**Decision:** When reconstructing a profile for a bag item that has no enchant_id,
inherit the enchant_id from the currently equipped item in that slot.

**Why:**

- Users care about which item is better, assuming they will enchant it
- A bag item without an enchant would simulate lower than reality, skewing results
- This matches Raidbots' Top Gear behavior

**Open question:** Should we allow the user to override this (e.g. "simulate without enchant")? Defer to v2.

---

## 2026-03-23 — Cap combinations at 1000, warn above 200

**Decision:** Hard cap at 1000 combinations. Show a warning if count > 200.

**Why:**

- At 10k iterations, each sim takes ~5-30s. 1000 combos could be 8+ hours.
- Users don't always understand combinatorial explosion
- The UI should show live combo count as the user selects items
- At the 1000 cap, show a clear error: "Too many combinations. Deselect some items."

---

## 2026-03-23 — Use pnpm as the package manager

**Decision:** pnpm over npm or yarn.

**Why:** Faster installs, better monorepo support, works well with Vite + Tauri.

---

## 2026-03-23 — Use Wowhead XML API for item name resolution

**Decision:** Fetch item names and ilvl from `https://www.wowhead.com/item=ID&xml`.
Cache results in Tauri store with a 7-day TTL.

**Why Wowhead:**

- No auth required (unlike Blizzard Game Data API which needs OAuth)
- Returns item name, quality, and base ilvl — everything we need for the UI
- Wowhead has been stable for 20 years

**Fallback:** Show `Item #ID` if fetch fails and no cache entry exists.
The simulation still works — names are cosmetic only.

**Why not Blizzard API:**

- Requires registering an OAuth app and managing client credentials
- Not worth the complexity for a local desktop app with no server

---

## 2026-03-23 — Gem axes are per-item, not per-slot

**Decision:** Gem OptimizationAxes have a `parentItemId` field and only apply
in combinations where that specific item is selected for the slot.

**Why:** Different items in the same slot have different socket counts. Item A may
have 1 socket, item B may have 2. The gem combinations must reflect each item's
actual socket layout. See `docs/gem-enchant-axis.md` for full implementation spec.

---

## 2026-03-23 — Use ProfileSet instead of N sequential SimC processes

**Decision:** All combinations are written into a single `.simc` file using
SimC's `profileset` feature, and one SimC process runs all of them.

**Why:**

- Dramatically faster: SimC shares warm-up cost and uses iteration data across profiles
- Statistically more consistent: all combinations run against the same RNG seeds
- Simpler Rust code: one process spawn instead of a loop of N spawns
- Less temp file management

**How ProfileSet works:**

```
# Base profile (the character)
shaman="Thrall"
...

# Each combination is a named profileset
profileset.combo_0+=trinket1=,id=235616,...
profileset.combo_0+=trinket2=,id=235617,...
profileset.combo_1+=trinket1=,id=229379,...
profileset.combo_1+=trinket2=,id=219314,...
```

**DPS location in json2:** `profilesets.results[i].mean` (matched by name)
**Base character DPS:** `sim.players[0].collected_data.dps.mean`

**Caveat:** ProfileSet has a practical limit of a few hundred profiles before
SimC becomes slow to initialize. The 1000-combination cap still applies.

---

## 2026-03-23 — Gem and enchant optimization are separate from gear selection

**Decision:** The UI has three independent sections:

1. Gear slot selection (which items to compare)
2. Gem optimization (which gems to try in sockets)
3. Enchant optimization (which enchants to try per slot)

All three are combined into one set of combinations per run.

**Why separate UI sections:**

- Helps users understand what they're optimizing
- Makes the combination count explosion visible and attributable
- Users can run gear-only, gem-only, or enchant-only sims as needed

---

## 2026-03-23 — SimC exit code 1 is not always a failure

**Decision:** Do not treat SimC exit code 1 as an automatic simulation failure.

**Why:** SimC exits with code 1 even on successful simulations when non-fatal warnings
are present (e.g. unrecognized bonus_ids for newly added items). Instead, check whether
the json2 output file exists and contains a valid `sim.players[0].collected_data.dps.mean`.
Only mark the simulation as failed if the JSON is missing or malformed.
