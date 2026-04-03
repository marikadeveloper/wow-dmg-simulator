# Droptimizer Research Notes

## Page 1: Landing / Configuration Page (01-landing-page.png)

URL: https://www.raidbots.com/simbot/droptimizer

### Input Methods
1. **Load from Armory** — Region (US/EU/KR/TW), Realm, Character name (NOT implementing for v1)
2. **Load from SimC Addon** — paste SimC string into textarea

### Navigation Tabs (top bar)
- TOP GEAR | **DROPTIMIZER** | QUICK SIM | ADVANCED | MORE

### Droptimizer-Specific Options (NOT YET VISIBLE — need to load a character first)
- The page shows "Load your character from the Armory or SimC addon above" before character is loaded
- After loading, likely shows dungeon/raid instance selection and item difficulty options

### Simulation Options (collapsible section, same as Top Gear)
- **Fight Style**: Patchwerk (default), Dungeon Slice, Target Dummy, Execute Patchwerk, Hectic Add Cleave, Light Movement, Heavy Movement, Casting Patchwerk, Cleave Add
- **Number of Bosses**: 1-10 (default 1)
- **Fight Length**: 20s, 40s, 1m, 1m30s, 2m, 3m, 4m, 5m (default), 6m, 7m, 8m, 9m, 10m
- **SimC Version**: Weekly (default), Nightly, Latest

### Trinket Options
- Shows currently equipped trinket (e.g. "CRUCIBLE OF ERRATIC ENERGIES")
- Checkboxes for trinket modifiers: Violence, Sustenance, Predation (these are trinket-specific options)

### Raid Buff Presets
- **Presets**: "OPTIMAL RAID BUFFS" | "NO BUFFS"
- **Consumables** (all default to "SimC Default"):
  - Potion (searchable dropdown)
  - Food (searchable dropdown)
  - Flask (searchable dropdown)
  - Augmentation (searchable dropdown)
  - Weapon Rune (dropdown with many options: Refulgent Whetstone, Thalassian Phoenix Oil, Oil of Dawn, Smuggler's Enchanted Edge, etc. — supports Main Hand, Dual Wield, and combinations)
- **Raid Buffs** (checkboxes):
  - Bloodlust (checked by default)
  - Arcane Intellect (checked by default)
  - Power Word: Fortitude (checked by default)
  - Mark of the Wild (unchecked)
  - Battle Shout (unchecked)
  - Mystic Touch (5% Physical Damage) (unchecked)
  - Chaos Brand (3% Magic Damage) (unchecked)
  - Skyfury (unchecked)
  - Hunter's Mark (unchecked)
  - Power Infusion (Beta) (unchecked)
  - Bleeding (unchecked) — "Affects Bloodseeker talent for Survival Hunters"

### Misc Options
- Detailed SimC Report (checkbox, unchecked)

### Collapsible Sections (at bottom)
- Custom APL and SimC Options (SimC Defaults)
- Report and Notification Options
- Show SimC Input

### Run Button
- **"RUN DROPTIMIZER"** button
- **High Precision** checkbox: "2x more precise, 4x slower" (checked by default)

### Footer Warning
- "Results are only as good as the SimulationCraft model for your spec!"

---

---

## Page 2: After SimC String Loaded (02-after-simc-paste.png)

### Character Display
- After pasting SimC string, the character's gear is displayed as a paperdoll with item icons
- Each gear slot shows an icon linking to Wowhead with full bonus_id/ench/gem/ilvl data
- Character info: Smarika, Frost Mage, Level 90, Blood Elf, EU/Nemesis
- Hero spec shown: Spellslinger

### Core Droptimizer Concept
> "Choose a source and Droptimizer will evaluate all Personal Loot against your currently equipped gear."
> Link: "More info on how Droptimizer works" → https://support.raidbots.com/article/59-droptimizer-how-does-it-work

### SOURCES Section
The user picks ONE source to evaluate. Sources are displayed as a horizontal list of clickable cards/buttons:

**Current Season Sources:**
1. **Season 1 Raids** (category header)
2. **March on Quel'Danas** (raid instance)
3. **The Dreamrift** (raid instance)
4. **The Voidspire** (raid instance)
5. **World Bosses**
6. **Mythic+ Dungeons**
7. **Normal Dungeons**
8. **PVP Season 1 (Conquest)**
9. **PVP Season 1 (Bloody Tokens)**
10. **PVP Season 1 (Honor)**
11. **Catalyst Season 1**
12. **Epic Profession Items**
13. **Rare Profession Items**
14. **PVP Profession Items**

**Checkbox:** "Show Previous Tiers" — toggles visibility of older content

After selecting a source: "Choose a source above" placeholder text (need to click one to see what happens next)

### NOTES / LIMITATIONS
Important behavioral notes for our implementation:
1. Your equipped weapons are used. To test Two Hand vs Main/Off Hand you need multiple sims.
2. Enchants are copied from your current items.
3. Necklace/rings sockets and gems are copied from your current neck or first ring.
4. Rings and trinkets are tried in both slots (as long as Unique-Equipped constraint is not violated).
5. Dual wield classes try weapons in both hands.
6. Simulation time is slower when there are more potential upgrades.
7. Droptimizer always uses "Smart Sim" (likely adaptive iteration counts).

---

## Key Differences from Top Gear (observed so far)
- Droptimizer does NOT let you select items per slot manually
- Instead, user selects a CONTENT SOURCE (raid, dungeon, PVP, etc.)
- The app automatically identifies ALL items from that source that could drop for the character's class/spec
- Each potential drop is simulated as a replacement for the current equipped item in that slot
- Result: a ranked list of "which drops from this content would be the biggest DPS upgrade"

## How Droptimizer Works (inferred)
1. User loads character (SimC string)
2. User selects a content source (e.g., "March on Quel'Danas" raid)
3. App looks up all items that drop from that source for the character's class/spec
4. For each potential drop item:
   - Determine which slot it goes in
   - If it's a higher ilvl than equipped → simulate swapping it in
   - Enchants are copied from currently equipped item in that slot
   - Gems/sockets copied from current neck/first ring
5. Each item is simmed as a profileset (swap one item at a time)
6. Results ranked by DPS delta vs. current gear

## Data Requirements for Our Implementation
- Need a database mapping: content source → list of items that drop
- Need to know which items are available for which class/spec (armor type, etc.)
- Need difficulty/ilvl mapping per source (e.g., Mythic raid = ilvl X, Heroic = ilvl Y)
- Item difficulty selector likely appears after choosing a source (need to see next step)

---

## Page 3: After Selecting "Season 1 Raids" Source (03-season1-raids-selected.png)

### RAID DIFFICULTY Selector
Shows 4 difficulty columns, each with TWO labels (raid difficulty + gear track):
| Raid Difficulty | Gear Track |
|----------------|------------|
| Raid Finder    | Veteran    |
| Normal         | Champion   |
| **Heroic**     | **Hero**   |
| Mythic         | Myth       |

The selected difficulty appears to be **Heroic/Hero** (based on the ilvl values shown).

### ITEMS TO SIM Section

**Grouping options:** "Group By" → "Item Slot" | "Boss"
(Currently grouped by Item Slot)

**Checkboxes:**
- "Include Off-Spec Items" (unchecked)
- "Include Catalyst Items" (checked) — adds tier set catalyst versions

**Upgrade options:**
- "Upgrade up to:" dropdown (currently "Base level, no upgrades") — searchable dropdown
- "Upgrade All Equipped Gear to the Same Level" checkbox (unchecked)

**Gem options:**
- "Preferred Gem:" searchable dropdown (currently "Select...")
- "Add Vault Socket" checkbox (unchecked)

### Item List Structure
Items are grouped by **slot** with headers: MAIN HAND, OFF HAND, HEAD, NECK, SHOULDER, BACK, CHEST, WRIST, HANDS, WAIST, LEGS, FEET, FINGER, TRINKET

Each item row shows:
- **Item icon** (linked to Wowhead with full bonus_id, ilvl, spec, enchant data)
- **Item name** (e.g., "Belo'melorn, the Shattered Talon")
- **Item level** (e.g., "269")
- **Boss/source name** (e.g., "Belo'ren, Child of Al'ar", "Midnight Falls", "Crown of the Cosmos")

Items come from ALL THREE raid instances in Season 1 combined.

**Note:** Items already have enchants applied (copied from current gear) and gems (copied from current neck/ring1). The Wowhead URLs confirm this — each item URL includes `ench=` and `gems=` parameters.

### Sample Items (partial list):
**MAIN HAND:**
- Belo'melorn, the Shattered Talon (269) — Belo'ren, Child of Al'ar
- Brazier of the Dissonant Dirge (269) — Midnight Falls  
- Blade of the Blind Verdict (266) — Lightblinded Vanguard

**OFF HAND:**
- Grimoire of the Eternal Light (263) — Vorasius
- Tome of Alnscorned Regret (263) — Catalyst item

**TRINKET:**
- Locus-Walker's Ribbon (269) — Crown of the Cosmos
- Shadow of the Empyrean Requiem (269) — Midnight Falls
- Vaelgor's Final Stare (266) — Vaelgor & Ezzorak
- Wraps of Cosmic Madness (263) — Fallen-King Salhadaar
- Gaze of the Alnseer (263) — Chimaerus the Undreamt God

### Key Observations
1. **"Season 1 Raids" selects ALL raids at once** — not one specific raid
2. Items span all 3 instances with mixed ilvls based on boss difficulty tier (end bosses = higher ilvl)
3. The difficulty selector maps **raid difficulty → gear track** (Heroic = Hero track)
4. Each item's ilvl is determined by: difficulty + boss position (end bosses drop higher)
5. Catalyst items are included by default (tier set versions)
6. All items are **pre-filtered for the character's class/spec** (only cloth/mage-usable items shown)
7. The "Upgrade up to" feature lets you sim items at upgraded ilvls (not just base drop level)
8. "Add Vault Socket" lets you sim items as if they came from the Great Vault (which adds a socket)

---

## Page 4: Results Page (04-current-state.png)

URL: https://www.raidbots.com/simbot/report/5oqwhJr2JBobDFNSm9Maiw
Title: "Droptimizer • Season 1 Raids • Heroic - Smarika - 74,496 DPS"

### Page Header
- "« Back to Droptimizer" link
- "Droptimizer • Season 1 Raids • Heroic"
- Character name with links to: WoW Armory, Warcraft Logs, Raider.IO
- Character paperdoll (same as config page)
- Warning banner: "The sim generated some warning/error messages..."

### BOSS SUMMARY Section
Shows results **grouped by boss encounter**, with each boss showing:
- Boss name (e.g., "Chimaerus the Undreamt God", "Crown of the Cosmos", "Midnight Falls", etc.)
- Item icons for each droppable item from that boss
- **DPS delta** shown as percentage AND absolute DPS for each item (e.g., "3.1%" = "2,243 DPS")
- Green = upgrade, Red = downgrade, "-" = not simmed (already same or worse ilvl)
- "CAT" badge on Catalyst items
- Items with gems show gem icon overlay

**Per-boss summary stats:**
- **Expected Value** (weighted average DPS gain across all drops from that boss)
- **Best** (highest single-item DPS gain from that boss)
- **Priority** rank (1 = most valuable boss to kill)

**Sort options:** Priority | Boss Order | Expected Value | Best
**Toggle:** "Relative DPS" checkbox (shows % vs absolute)

**Example Boss Results:**
| Boss | Priority | Expected Value | Best |
|------|----------|---------------|------|
| Chimaerus the Undreamt God | 1 | +487 DPS | +2,243 DPS |
| Crown of the Cosmos | 2 | +494 DPS | +1,977 DPS |
| Vaelgor & Ezzorak | 3 | ... | +2,224 DPS |
| Belo'ren, Child of Al'ar | 4 | ... | +599 DPS |
| Midnight Falls | 5 | ... | +1,282 DPS |

### ITEM RANKING Section (below Boss Summary)
Title: "Droptimizer (DPS)"
A flat ranked list of ALL items sorted by DPS gain, best first.

**Controls:**
- "GO TO EQUIPPED" button (scrolls to baseline)
- "Show All Variations" checkbox (some items have multiple slot variations)
- "Relative DPS" checkbox
- "Show Smart Sim Stage" checkbox

**Each item row shows:**
- Item icon (linked to Wowhead)
- Item name
- Item level
- **Slot** it was simmed in (e.g., "Trinket 2", "Finger 1", "Waist")
- **Boss name + difficulty** (e.g., "Chimaerus the Undreamt God - Heroic")
- **Absolute DPS** (e.g., "74,496")
- **DPS delta** (e.g., "+2,243")
- **Variations hidden** count (e.g., "1 variation hidden" for rings/trinkets tried in alt slot)
- **DPS Distribution chart** (min/mean/max/stddev dot chart)

**Top ranked items:**
1. Gaze of the Alnseer (263) — Trinket 2 — Chimaerus — +2,243 DPS
2. Vaelgor's Final Stare (266) — Trinket 2 — Vaelgor & Ezzorak — +2,224 DPS
3. Locus-Walker's Ribbon (269) — Trinket 2 — Crown of the Cosmos — +1,977 DPS
4. Shadow of the Empyrean Requiem (269) — Trinket 2 — Midnight Falls — +1,282 DPS
5. Sin'dorei Band of Hope (269) — Finger 1 — Belo'ren, Child of Al'ar — +599 DPS
6. Bond of Light (266) — Finger 1 — Lightblinded Vanguard — +482 DPS
7. Whisper-Inscribed Sash (269) — Waist — Belo'ren, Child of Al'ar — ...

**Highlighted items** = 0.05% or better DPS increase

### Simulation Details (bottom)
- Fight style: Patchwerk
- Duration: 5 minutes (varies 240-360 seconds)
- Targets: 1 boss target
- Margin of Error: ~37 DPS (0.05%)
- Iterations: 10,437 (Smart Sim) — adaptive iteration count
- Actors: 49 (= 48 item variations + 1 baseline)
- Processing Time: 0:55
- SimC Version: Weekly (build Mar 31)

### Collapsible Sections
- SimC Notifications
- Raw Input
- Original Addon Input
- Share Report URL

---

## Complete Droptimizer Feature Summary

### Core Flow
1. **Input**: Paste SimC string (or load from Armory)
2. **Select Source**: Choose ONE content source (raid tier, dungeon pool, PVP, profession items, etc.)
3. **Select Difficulty**: Pick raid difficulty / M+ level / PVP track
4. **Configure Options**: Upgrade level, gems, vault socket, off-spec items, catalyst items
5. **Sim Options**: Fight style, duration, bosses, consumables, raid buffs (same as Top Gear)
6. **Run**: Sims all potential drops as profilesets against baseline
7. **Results**: Two views:
   - **Boss Summary**: grouped by boss, showing priority ranking (which boss to target)
   - **Item Ranking**: flat list sorted by DPS delta (which items are biggest upgrades)

### Key Data Requirements
- **Source → Items mapping**: need to know which items drop from each source/boss
- **Class/spec filtering**: only show items usable by the character
- **Difficulty → ilvl mapping**: each difficulty determines item level
- **Boss → ilvl tier**: end bosses drop higher ilvl than early bosses within same difficulty
- **Catalyst mapping**: which items can be converted to tier set pieces
- **Enchant/gem inheritance**: copy enchants from current gear, gems from current neck/ring

### What We Need for Our Implementation
1. **Loot table database**: source/boss → items (can potentially extract from SimC data or Wowhead API)
2. **Season config updates**: add source definitions, difficulty mappings
3. **New UI**: source selector, difficulty picker, item list with checkboxes
4. **ProfileSet generation**: one profileset per item (swap single item at a time)
5. **Results UI**: boss summary view + item ranking view
6. **Homepage**: two buttons — Top Gear | Droptimizer

---

## Page 5: World Bosses Source Selected (05-world-bosses.png)

### Key Differences from Raids
- **No difficulty selector** — world bosses have a fixed ilvl (250)
- **Fewer items** — much smaller loot pool
- **Same options**: Include Off-Spec Items, Include Catalyst Items, Upgrade up to, Preferred Gem, Add Vault Socket
- **Same NOTES/LIMITATIONS** section

### World Boss Names (from item source labels)
- **Thorm'belan** (drops: Blooming Thornblade - Main Hand)
- **Predaxas** (drops: Voidbender's Spire - Main Hand)
- **Lu'ashal** (drops: Radiant Eversong Scepter - Off Hand)
- **Cragpine** (drops: Chain of the Ancient Watcher - Neck, Forgotten Farstrider's Insignia - Trinket)

### Items (all ilvl 250)
- **MAIN HAND**: Blooming Thornblade (Thorm'belan), Voidbender's Spire (Predaxas)
- **OFF HAND**: Radiant Eversong Scepter (Lu'ashal)
- **NECK**: Chain of the Ancient Watcher (Cragpine) — has gem socket
- **CHEST**: 2 items including a Catalyst version
- **FINGER**: 1 item with gem socket
- **TRINKET**: Forgotten Farstrider's Insignia (Cragpine)

### Observation
World Bosses is the simplest source type — no difficulty selection, fixed ilvl, small item pool. Good test case for our implementation.

---

## Page 6: World Bosses Results (06-world-bosses-results.png)

URL: https://www.raidbots.com/simbot/report/x2R8kveCBjPT6AJJ4jT149
Title: "Droptimizer • World Bosses - Smarika - 72,949 DPS"

### Baseline DPS: 72,342 (Current Gear)

### BOSS SUMMARY (4 world bosses)
Each boss shows item icons with DPS delta, plus Expected Value / Best / Priority.

All 4 bosses show the same "+607 DPS" for their best item — this is the Forgotten Farstrider's Insignia trinket which appears highlighted (upgrade) on every boss row since it's the only upgrade.

### ITEM RANKING (sorted by DPS delta)
| Rank | Item | ilvl | Slot | Boss | DPS | Delta |
|------|------|------|------|------|-----|-------|
| 1 | Forgotten Farstrider's Insignia | 250 | Trinket 2 | Cragpine | 72,949 | **+607** |
| — | **Equipped (Current Gear)** | — | — | — | **72,342** | **—** |
| 3 | Chain of the Ancient Watcher | 250 | Neck | Cragpine | 71,810 | -533 |
| 4 | Encroaching Shadow Signet | 250 | Finger 1 | Predaxas | 71,628 | -714 |
| 5 | Wretched Scholar's Gilded Robe | 250 | Chest | Cragpine | 69,444 | -2,899 |
| 6 | Voidbender's Spire | 250 | Main Hand | Predaxas | 68,752 | -3,590 |

### Key Observations
- **"Equipped" baseline row** appears in the ranking list (labeled "Current Gear" with DPS 72,342 and "—" delta)
- Only 1 item is an upgrade (+607), all others are downgrades (lower ilvl than current gear)
- Items with a "·" marker appear to indicate they were eliminated by Smart Sim (not fully simmed)
- The DPS distribution chart appears for each item (min/mean/max/stddev)
- "Show Smart Sim Stage" checkbox at bottom — reveals which items were quick-eliminated vs fully simmed

---

## Page 7: Mythic+ Dungeons — All Dungeons (07-mythic-plus-dungeons.png)

### DUNGEONS Selector
Horizontal list of dungeon buttons. Can select:
- **All Dungeons** (requires Raidbots Premium — note: we won't have this restriction)
- Individual dungeons:
  - Algeth'ar Academy
  - Magisters' Terrace
  - Maisara Caverns
  - Nexus-Point Xenas
  - Pit of Saron
  - Seat of the Triumvirate
  - Skyreach
  - Windrunner Spire

### DUNGEON LEVEL Selector
Horizontal buttons showing keystone level → item level mapping:

| Level | ilvl |
|-------|------|
| Heroic | 224 |
| Mythic | 246 |
| Mythic 2 | 250 |
| Mythic 3 | 250 |
| Mythic 4 | 253 |
| Mythic 5 | 256 |
| Mythic 6 | 259 |
| Mythic 7 | 259 |
| Mythic 8 | 263 |
| Mythic 9 | 263 |
| Mythic 10 | 266 |
| +7-9 Vault | 269 |
| +10 Vault | 272 |

Currently selected: **+10 Vault (272)** — items shown at ilvl 272.
Note: Vault levels show what ilvl you'd get from the Great Vault reward, not end-of-dungeon drops.

### Group By Options
- **Item Slot** (default)
- **Dungeon** (groups items by which dungeon they drop from)

### Premium Restriction
- "Simming all options is only available for Raidbots Premium members."
- "All Dungeons" is premium-only; individual dungeons are free
- (Our app won't have this restriction since we run locally)

### Items (sample from MAIN HAND, all ilvl 272)
- Surgeon's Needle — Pit of Saron
- Spellboon Saber — Algeth'ar Academy
- Splitshroud Stinger — Magisters' Terrace
- Ceremonial Hexblade — Maisara Caverns
- Skybreaker's Blade — (another dungeon)

Each item shows: icon, name, ilvl, **dungeon source name** (not boss name — unlike raids)

### Same Options as Raids
- Include Off-Spec Items, Include Catalyst Items
- Upgrade up to, Preferred Gem, Add Vault Socket
- Upgrade All Equipped Gear to the Same Level

### Key Differences from Raid Source
1. **Dungeon selector** (individual or all) instead of automatic "all raids"
2. **Dungeon Level selector** instead of raid difficulty — maps keystone level to ilvl
3. **Vault levels** included (Great Vault rewards at higher ilvl)
4. Items show **dungeon name** instead of **boss name** as source
5. Group By has "Dungeon" option instead of "Boss"

---

## Page 8: Single Dungeon Selected — Algeth'ar Academy (08-single-dungeon.png)

### Key Differences from "All Dungeons"
1. **No "Group By" option** — since all items are from one dungeon, grouping is unnecessary
2. **No dungeon name shown** on items — since it's obvious which dungeon they come from
3. **Smaller item list** — only items from Algeth'ar Academy
4. **No premium restriction** — single dungeon droptimizer is free on Raidbots
5. **Same DUNGEON LEVEL selector** — still shows all keystone levels

### Items (selected level: Mythic 10, ilvl 266)
Sample items from Algeth'ar Academy:
- **MAIN HAND**: Spellboon Saber (266), Final Grade (266) — "You are already wearing this item or a better version"
- **OFF HAND**: Vexamus' Expulsion Rod (266)
- **HEAD**: Organized Pontificator's Mask (266), Voidbreaker's Veil (266, CAT — Catalyst)

### "Already wearing" indicator
When you already have the same item (or better), the item shows: **"You are already wearing this item or a better version"** — useful feedback for the user.

### Catalyst Items
Catalyst versions show a "CAT" badge on the item icon (same as in raids).

---

## Page 9: Single Dungeon Results — Algeth'ar Academy Mythic 10 (09-current.png)

URL: https://www.raidbots.com/simbot/report/16HN3urEWz4LVUD92Pe76C
Title: "Droptimizer • Mythic+ Dungeons • Mythic 10 • Algeth'ar Academy - Smarika - 72,583 DPS"

### DUNGEON SUMMARY (instead of BOSS SUMMARY)
Shows ONE dungeon row: **Algeth'ar Academy**
- Same layout as Boss Summary: item icons with DPS deltas, Expected Value, Best, Priority
- Sort/toggle options identical to raids

### Item Ranking
| Rank | Item | ilvl | Slot | Source | DPS | Delta |
|------|------|------|------|--------|-----|-------|
| 1 | Platinum Star Band | 266 | Finger 2 | Algeth'ar Academy - Mythic 10 | 72,583 | **+329** |
| 2 | Voidbreaker's Encryption (CAT) | 266 | Back | Algeth'ar Academy - Mythic 10 | 72,431 | **+177** |
| 3 | Voidbreaker's Gloves (CAT) | 266 | Hands | Algeth'ar Academy - Mythic 10 | 72,350 | **+96** |
| 4 | Potion-Stained Cloak | 266 | Back | Algeth'ar Academy - Mythic 10 | 72,273 | **+19** |
| — | **Equipped (Current Gear)** | — | — | — | **72,254** | **—** |
| 6 | Organized Pontificator's Mask | 266 | Head | Algeth'ar Academy - Mythic 10 | 70,122 | -2,132 |
| 7 | Bronze Challenger's Robe | 266 | Chest | Algeth'ar Academy - Mythic 10 | 70,022 | ... |
| 8 | Experimental Safety Gloves | 266 | Hands | Algeth'ar Academy - Mythic 10 | ... | ... |

### Key Observations
- **"DUNGEON SUMMARY"** heading used instead of "BOSS SUMMARY" for M+ sources
- Source label format: **"Dungeon Name - Mythic Level"** (e.g., "Algeth'ar Academy - Mythic 10")
- Items below Equipped baseline have "·" Smart Sim marker (quick-eliminated)
- Catalyst items (CAT) can be upgrades even in a dungeon context (tier set value)

---

# PART 2: DEEP RESEARCH FINDINGS

## A. How Droptimizer Works (from Raidbots Help Article)

Source: https://support.raidbots.com/article/59-droptimizer-how-does-it-work

### Core Simulation Model
- **Single-swap only**: Droptimizer changes ONE piece at a time against current gear. No combinatorial explosion.
- **Trinkets and rings** are tried in both slots automatically. Dual wield classes try weapons in both hands.
- Each potential drop is simmed as a separate profileset.

### Result Metrics
- **Expected Value**: Average DPS increase from a boss's loot table. Items worse than current gear count as **0 DPS** (not negative). Unsimmed items also count as 0.
  - Example: Boss drops 4 items, one is +1000 DPS, three are downgrades → EV = (1000+0+0+0)/4 = 250 DPS
- **Best Drop**: Highest single-item DPS gain from that boss.
- **Priority**: Combines Expected Value + upgrade probability + Best Drop.
  - Groups bosses within 0.2% DPS of each other in Expected Value
  - Then ranks by upgrade probability (3/3 items being upgrades > 2/3)
  - Ties broken by Best Drop
  - Conservative approach: values reliable upgrades over lottery bosses

### Limitations
- Only evaluates the best "next" upgrade — does NOT account for multi-step gearing
- Caster weapons are complicated (MH+OH vs staff comparison)

---

## B. Loot Table Data Sources

### SimC Does NOT Include Loot Tables
SimC has item data (`item_data.inc`, `item_bonus.inc`) but NO boss-to-item mappings. However, SimC's DBC extraction tool knows about Journal DBC tables:
- `JournalInstance` — dungeon/raid instances
- `JournalEncounter` — boss encounters
- `JournalEncounterItem` — **maps encounter_id → item_id** (the key table)
- `JournalItemXDifficulty` — which difficulties each item is available on

### How Raidbots Does It
Raidbots extracts loot tables from **WoW's DBC/DB2 game data** using SimC's CASC extraction tools. Does NOT use the Blizzard REST API or Wowhead.

### Blizzard Game Data API (RECOMMENDED for our app)
The Blizzard API has Journal endpoints:
| Endpoint | Returns |
|---|---|
| `GET /data/wow/journal-instance/index` | All instances |
| `GET /data/wow/journal-instance/{id}` | Instance details + encounters |
| `GET /data/wow/journal-encounter/{id}` | Encounter details + **item drops** |

- Free, well-documented, OAuth2 client credentials
- Gives us exactly `boss → item_id[]` mappings
- Item IDs match SimC IDs
- Limitation: may not include zone drops, BoE trash loot

### Recommended Implementation
Create `scripts/build-loot-db.ts` that:
1. Calls Blizzard Journal API endpoints
2. Builds a static JSON/SQLite database: `instance → encounters[] → items[]`
3. Bundles in the app, regenerated each season

---

## C. Item Level Distribution — Midnight Season 1

### Gear Track Ranks
| Track | 1/6 | 2/6 | 3/6 | 4/6 | 5/6 | 6/6 |
|---|---|---|---|---|---|---|
| **Adventurer** | 220 | 224 | 227 | 230 | 233 | 237 |
| **Veteran** | 233 | 237 | 240 | 243 | — | — |
| **Champion** | 246 | 250 | 253 | 256 | 259 | 263 |
| **Hero** | 259 | 263 | 266 | 269 | 272 | 276 |
| **Myth** | 272 | 276 | 279 | 282 | 285 | 289 |

Max ilvl: **289** (Myth 6/6)

### Raid Boss ilvl by Difficulty (4 tiers within each difficulty)
| Boss Tier | Raid Finder | Normal | Heroic | Mythic |
|---|---|---|---|---|
| Early (1) | 233 | 246 | 259 | 272 |
| Early-Mid (2-3) | 237 | 250 | 263 | 276 |
| Mid-Late (4-5) | 240 | 253 | 266 | 279 |
| End Boss (6) | 243 | 256 | 269 | 282 |

Matches the Raidbots data we observed (Heroic: 259/263/266/269).

### Mythic+ Keystone → End-of-Dungeon ilvl
| Key Level | ilvl | Track |
|---|---|---|
| Heroic | 224 | Adventurer |
| M0 | 246 | Champion 1/6 |
| +2 | 250 | Champion 2/6 |
| +3 | 250 | Champion 2/6 |
| +4 | 253 | Champion 3/6 |
| +5 | 256 | Champion 4/6 |
| +6 | 259 | Hero 1/6 |
| +7 | 259 | Hero 1/6 |
| +8 | 263 | Hero 2/6 |
| +9 | 263 | Hero 2/6 |
| +10+ | 266 | Hero 3/6 (cap) |

### Great Vault Rewards (M+)
| Key Level | ilvl | Track |
|---|---|---|
| +7 | 269 | Hero 4/6 |
| +8-9 | 269 | Hero 4/6 |
| +10 | 272 | Myth 1/6 |
| +12 | 276 | Myth 2/6 |
| +15 | 279 | Myth 3/6 |
| +18 | 282 | Myth 4/6 (cap) |

### World Bosses
- **ilvl 250** (Champion 2/6), confirmed by our screenshots
- 4 bosses: Cragpine, Lu'ashal, Predaxas, Thorm'belan

### PvP
| Source | Item Level |
|---|---|
| Honor Gear | 276 |
| Bloody Tokens | 276 |
| Conquest Gear | 289 |

---

## D. Smart Sim — Multi-Stage Adaptive Simulation

### What It Is
Smart Sim is a **3-stage adaptive simulation** that eliminates clearly worse options early, saving massive computation time. Originated from AutoSimC.

### The Algorithm
| Stage | Target Error | ~Iterations | Purpose |
|---|---|---|---|
| 1 | 1% | ~100-200 | Quick triage — eliminate ~95% of combinations |
| 2 | 0.2% | ~1,000-2,000 | Narrow to competitive candidates |
| 3 | 0.05% | ~10,000+ | Final precision ranking |

Only top performers from each stage advance to the next.

### SimC Support
SimC has **NO built-in Smart Sim**. SimC provides:
- `target_error` per profileset (each can have its own precision)
- `profileset_work_threads` for parallel execution
- But NO multi-stage elimination logic

Raidbots implements Smart Sim **on top of SimC** via its custom "Flightmaster" service.

### Our Implementation
For Droptimizer specifically (single-swap, ~20-80 items):
- **Droptimizer typically has <100 profilesets** — can just run at `target_error=0.05` directly
- Smart Sim mainly matters for Top Gear with large combination counts (200+)
- If we want to implement it later: run 3 SimC invocations with escalating precision, filtering between each

---

## E. Complete Source Type Summary

| Source | Difficulty Selector | Item Source Label | Group By Options |
|---|---|---|---|
| Season 1 Raids (all) | Raid Finder / Normal / Heroic / Mythic | Boss name | Item Slot / Boss |
| Individual Raid | Same as above | Boss name | Item Slot / Boss |
| World Bosses | None (fixed ilvl) | World boss name | Item Slot only |
| Mythic+ All Dungeons | Keystone level (Heroic → +10 Vault) | Dungeon name | Item Slot / Dungeon |
| Mythic+ Single Dungeon | Keystone level | Dungeon name | Item Slot only |
| Normal Dungeons | None (fixed) | Dungeon name | Item Slot / Dungeon |
| PVP Conquest | None | — | — |
| PVP Bloody Tokens | None | — | — |
| PVP Honor | None | — | — |
| Catalyst | None | — | — |
| Epic Profession Items | None | — | — |
| Rare Profession Items | None | — | — |
| PVP Profession Items | None | — | — |

---

## F. Implementation Priority for Our App

### MVP (Pre-Alpha)
1. **Single raid** droptimizer (one raid, one difficulty)
2. **Single M+ dungeon** (one dungeon, one keystone level)
3. **World bosses** (simplest — fixed ilvl, small pool)

### Later
4. All raids at once
5. All dungeons at once
6. PVP sources
7. Catalyst / Profession items
8. Smart Sim (multi-stage) for Top Gear
9. "Upgrade up to" feature
10. "Add Vault Socket" feature
