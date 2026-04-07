# UI/UX Principles & Interface Design

## Core Philosophy

The target user is a **WoW player who is not a programmer**.
They know their class, they know their gear, but they have never touched a terminal.
Every design decision should reduce friction, not add it.

> "If the user has to read a tooltip to understand a control, the control is wrong."

---

## The Three UX Laws for This App

1. **One screen does everything.** The user should never navigate away from the main
   screen to configure gems or enchants. Everything is inline, contextual, and visible.

2. **Smart defaults mean zero configuration.** The app works correctly out of the box
   with no settings touched. Advanced options exist but are hidden until needed.

3. **The user always knows what will happen before they click Run.**
   The combination count, estimated time, and what is being optimized must all be
   visible before the simulation starts.

---

## Main Screen Layout

The main screen is a single scrollable page divided into three vertical zones:

```
┌─────────────────────────────────────────────────────────┐
│  ZONE 1 — CHARACTER HEADER                              │
│  [Character name] [Realm] [Spec] [iLvl] [SimC version] │
│  [ Paste SimC string or drag file ]                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ZONE 2 — GEAR & OPTIMIZATION PANEL                     │
│  (the main interactive area, see below)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ZONE 3 — RUN CONTROLS + RESULTS                        │
│  [ Fight Style ▼ ] [ 300s ] [ ±20% ] [ 1 enemy ]       │
│  [ Iterations: 10000 ]                                  │
│  ─────────────────────────────────────────────────────  │
│  Combinations: 48  ⚠ This will take ~4 minutes         │
│  [ ▶ Run Sim Gear ]  [ ✕ Cancel ]                       │
│  ─────────────────────────────────────────────────────  │
│  RESULTS TABLE (appears here after run)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Zone 2 — Gear & Optimization Panel (Detail)

This is the heart of the app. It is a grid of **gear slot cards**, one per slot.
Each card expands inline to show gems and enchants for that slot.

### Gear Slot Card (collapsed)

```
┌──────────────────────────────────────────────────────┐
│ 🪖 HEAD                                    [2 items] │
│ ──────────────────────────────────────────────────── │
│ ✅ Voidcaller's Visage         ilvl 639  [equipped]  │
│ ☐  Helm of the Sunken City     ilvl 636              │
│ ──────────────────────────────────────────────────── │
│ 💎 Gem: [Masterful Ysemerald ▼]  [+ Add gem option] │
│ ✨ Enchant: none available for this slot              │
└──────────────────────────────────────────────────────┘
```

### Gear Slot Card — with unowned item search open

```
┌──────────────────────────────────────────────────────┐
│ 🗡 MAIN HAND                               [2 items] │
│ ──────────────────────────────────────────────────── │
│ ✅ Void-Touched Longstaff   ilvl 639    [equipped]   │
│     💎 Socket 1: [Masterful Ysemerald ▼]             │
│ ☐  Staff of the Deep Vaults ilvl 636   [bag]        │
│ ──────────────────────────────────────────────────── │
│ ☐  Frozen Heartstaff        ilvl 649   [🔍 unowned] │
│     Track: [Hero ▼]  649–665 ilvl   ☑ Add socket   │
│ ──────────────────────────────────────────────────── │
│ 🔍 [Search for item to compare...          ] [×]     │
│    Staff of the S...                                 │
│    ├ Staff of the Sunken Depths   Two-Hand  (epic)   │
│    ├ Staff of the Blazing Path    Two-Hand  (epic)   │
│    └ Staff of Sunken Sorrows      Two-Hand  (rare)   │
└──────────────────────────────────────────────────────┘
```

Unowned items are displayed between bag items and the search bar.
They show a yellow `[🔍 unowned]` badge and a track/ilvl selector row below them.
Clicking `[×]` on the search bar collapses it without losing the unowned item.

```
┌──────────────────────────────────────────────────────┐
│ 💍 RING 1                                  [3 items] │
│ ──────────────────────────────────────────────────── │
│ ✅ Seal of the Drowning Depths  ilvl 639  [equipped] │
│ ☐  Overlord's Seal              ilvl 636             │
│ ☐  Tainted Delicium Band        ilvl 626             │
│ ──────────────────────────────────────────────────── │
│ ✨ Enchant options to compare:                        │
│   ✅ Enchant Ring – Cursed Devotion  [current]       │
│   ☐  Enchant Ring – Devotion of Mastery              │
│   ☐  Enchant Ring – Devotion of Haste               │
│   [+ Add custom enchant ID]                          │
└──────────────────────────────────────────────────────┘
```

### Gem Slot Sub-Component

When an item has sockets, a gem row appears under that item's checkbox, not under
the whole slot. This is important: different items in the same slot may have
different numbers of sockets.

```
│ ✅ Voidcaller's Visage  ilvl 639  [equipped]         │
│     💎 Socket 1: [Masterful Ysemerald ▼]             │
│                  [Quick Ysemerald       ]             │
│                  [Energized Ysemerald   ]             │
│                  [+ Enter custom gem ID ]             │
│     💎 Socket 2: (same options)                      │
```

The gem dropdown shows a curated list of current-patch gems (from a preset in
the codebase). The user can always add a custom gem ID for gems not in the list.

---

## Interaction Patterns

### Selecting items

- Clicking a slot's item row toggles it selected/deselected
- Equipped item starts selected by default
- If zero items are selected in a slot, the slot is "locked" to the equipped item

### Combination counter (always visible)

- Updates in real time as the user selects/deselects items, gems, enchants
- Shows: total combinations, rough time estimate ("~3 min"), and a colored badge:
  - Green: < 50 combinations
  - Yellow: 50–200 combinations (warn: "will take a while")
  - Orange: 200–500 combinations (warn: "may take 10+ minutes")
  - Red: 500–1000 combinations (warn: "long run, consider narrowing selection")
  - Blocked: > 1000 combinations (error: "too many combinations, deselect items")

### "Select all bag items" shortcut

A small "select all" link appears per slot if there are 2+ bag items. Useful for
quick trinket/ring sweeps.

### Enchant presets (per slot)

The enchant section for each slot shows only the enchants relevant to that slot,
pulled from a preset list in `src/lib/enchant-presets.ts`. The user never has to
know enchant IDs unless they want to add a custom one.

### Gem presets (per socket)

Same pattern: `src/lib/gem-presets.ts` contains current-patch gems. Shown as
names, not IDs. Custom ID input always available as escape hatch.

---

## Simulation Settings Panel

The settings panel lives in Zone 3, above the Run button.
It is **collapsed by default** — most users never need to touch it.

When expanded, it shows:

```
Fight Style      [Patchwerk ▼]              ← dropdown with all 7 styles
Fight Length     [300] seconds  ±[20]%      ← two linked inputs
Enemies          [1]                        ← integer spinner, min 1
Iterations       [10000]                    ← slider or input, 1k–100k
Threads          [7] (auto-detected)        ← shows cpu_count - 1 as default
```

Each control has a one-line tooltip explaining what it does in plain English.
Example: "Fight Length — how long the simulated boss fight lasts. 300s = 5 minutes."

---

## Results Table

```
┌────┬────────┬───────────────────────────────────────┬──────────┬─────────┐
│ #  │  DPS   │ Gear Combination                      │  Δ DPS   │  Δ %    │
├────┼────────┼───────────────────────────────────────┼──────────┼─────────┤
│ 🥇 │ 854,321│ Head A · Ring: Haste · Gem: Mastery   │ +12,450  │ +1.48%  │
│  2 │849,201 │ Head A · Ring: Haste · Gem: Crit      │  +7,330  │ +0.87%  │
│  3 │847,892 │ Head B · Ring: Mastery · Gem: Mastery │  +6,021  │ +0.71%  │
│ 📌 │ 841,871│ [Currently equipped]                  │    —     │   —     │
│  5 │ 838,201│ Head B · Ring: Crit · Gem: Haste      │  -3,670  │ -0.44%  │
└────┴────────┴───────────────────────────────────────┴──────────┴─────────┘
```

- The currently-equipped combination is always pinned (📌) for reference
- Combinations within statistical noise of each other show a `≈` badge
- Clicking a row expands it to show the full item/gem/enchant breakdown

---

## Extensibility in the UI

New optimization types (future: talents, embellishments, tier set bonuses) should
be addable without redesigning the main screen. The pattern is:

1. New optimization type = new collapsible section inside the relevant slot card
   OR a new top-level panel in Zone 2 (for global options like tier sets)
2. It contributes new axes to the combination generator
3. The combination counter already accounts for it automatically

New simulation output columns (HPS, tank metrics) should be addable to the results
table without restructuring it — they are just additional columns.
