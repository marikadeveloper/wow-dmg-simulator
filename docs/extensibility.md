# Extensibility Architecture

This document defines HOW to add new features to the app without breaking existing
ones, and what patterns Claude Code must follow when implementing new functionality.

---

## Core Principle: Optimization Axes

Every optimization this app does can be modelled as adding a new **axis** to the
combination space. An axis is: "for this slot/item/scope, here are N options to try."

```typescript
// The universal unit of optimization
interface OptimizationAxis {
  id: string; // unique key, e.g. "slot:trinket1", "enchant:finger1"
  label: string; // human-readable: "Trinket 1", "Ring 1 Enchant"
  options: OptimizationOption[]; // the choices to try
}

interface OptimizationOption {
  id: string; // unique within the axis
  label: string; // human-readable
  simcLines: string[]; // the SimC profile line(s) this option produces
  // e.g. ["trinket1=,id=235616,bonus_id=..."]
  // or   ["finger1=,id=235614,...,enchant_id=7340"]
}
```

The combination generator takes `OptimizationAxis[]` and returns the cartesian
product. It does not know or care whether an axis is a gear slot, a gem, an enchant,
or a future feature like an embellishment.

**Adding a new optimization type = defining new OptimizationAxis instances.**
Nothing else in the system needs to change.

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│  LAYER 4: UI Components                             │
│  GearSlotCard, GemSelector, EnchantSelector, ...   │
│  Each produces OptimizationAxis[] for its domain   │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Optimization Assembler                    │
│  Collects all axes from all UI sections             │
│  Computes total combination count                   │
│  Passes axes to the Combination Generator           │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Combination Generator (combinator.ts)     │
│  Pure function: OptimizationAxis[] → combinations[] │
│  Each combination = { axes contribution + simcLines }│
├─────────────────────────────────────────────────────┤
│  LAYER 1: ProfileSet Builder                        │
│  Takes combinations[], base profile rawLines        │
│  Produces a single .simc file with all profilesets  │
├─────────────────────────────────────────────────────┤
│  LAYER 0: SimC Runner (Rust / Tauri command)        │
│  Runs one SimC process, returns ranked SimResult[]  │
└─────────────────────────────────────────────────────┘
```

Each layer has a single responsibility and a clean interface. Adding a new
optimization type only touches Layer 4 (new UI component) and possibly Layer 3
(registering the new axis type in the assembler).

---

## How to Add a New Optimization Type

Example: adding **embellishment comparison** (future feature).

### Step 1 — Create the UI component

```
src/components/optimizations/EmbellishmentSelector.tsx
```

This component lets the user select which embellishments to compare.
It exports:

```typescript
function EmbellishmentSelector({ profile }: Props): {
  axes: OptimizationAxis[];
  ui: JSX.Element;
};
```

### Step 2 — Register in the Optimization Assembler

In `src/lib/optimization-assembler.ts`, add the new component's axes to the
list that gets passed to the combination generator. That's it.

### Step 3 — Add presets (optional)

If the feature has a known set of options (like gem IDs), add a preset file:

```
src/lib/presets/embellishment-presets.ts
```

### Step 4 — Update features.md

Mark the story as implemented and add any follow-up stories.

---

## Preset Files Pattern

Preset files export typed arrays of options for the UI dropdowns.
They must be updated each patch.

```
src/lib/presets/
├── gem-presets.ts         ← current-patch gems by socket color
├── enchant-presets.ts     ← current-patch enchants by slot
└── (future)
    ├── embellishment-presets.ts
    └── consumable-presets.ts
```

Structure of a preset file:

```typescript
// src/lib/presets/gem-presets.ts
export interface GemPreset {
  id: number; // SimC gem_id
  name: string; // "Masterful Ysemerald"
  stat: string; // "Mastery" — for display grouping
  color: 'prismatic'; // Midnight only has prismatic sockets currently
}

export const GEM_PRESETS: GemPreset[] = [
  {
    id: 213743,
    name: 'Masterful Ysemerald',
    stat: 'Mastery',
    color: 'prismatic',
  },
  { id: 213744, name: 'Quick Ysemerald', stat: 'Haste', color: 'prismatic' },
  {
    id: 213746,
    name: 'Energized Ysemerald',
    stat: 'Versatility',
    color: 'prismatic',
  },
  { id: 213747, name: 'Crafty Ysemerald', stat: 'Crit', color: 'prismatic' },
  // ... etc
];

export interface EnchantPreset {
  id: number; // SimC enchant_id
  name: string; // "Enchant Ring – Cursed Devotion"
  slot: string; // "finger1" | "finger2" | "neck" | etc.
  stat: string; // primary stat it gives, for display
}

export const ENCHANT_PRESETS: EnchantPreset[] = [
  {
    id: 7340,
    name: 'Enchant Ring – Cursed Devotion',
    slot: 'finger',
    stat: 'Crit',
  },
  {
    id: 7341,
    name: 'Enchant Ring – Devotion of Mastery',
    slot: 'finger',
    stat: 'Mastery',
  },
  // ... etc
];
```

---

## Tauri Commands — How to Add New Backend Features

New Tauri commands go in `src-tauri/src/commands/`.

Pattern:

1. Create `src-tauri/src/commands/my_feature.rs`
2. Define the command as `#[tauri::command] pub async fn my_feature(...) -> Result<MyOutput, String>`
3. Register in `main.rs` under `tauri::generate_handler![..., my_feature]`
4. Call from TypeScript: `invoke<MyOutput>('my_feature', { args })`

**Never put business logic in `main.rs`.** It is only a wiring file.

---

## File Naming & Module Conventions

```
src/
├── components/
│   ├── gear/                  ← gear-related components
│   ├── optimizations/         ← one file per optimization type
│   ├── results/               ← results table and related
│   └── settings/              ← simulation settings panel
├── lib/
│   ├── types.ts               ← ALL shared types (single source of truth)
│   ├── parser.ts              ← SimC string parser
│   ├── combinator.ts          ← combination generator (pure, no side effects)
│   ├── profileset-builder.ts  ← builds the .simc profileset file content
│   ├── optimization-assembler.ts ← collects axes from all UI sections
│   └── presets/               ← gem/enchant/etc preset data
└── hooks/
    ├── useSimulation.ts       ← manages the simulation run state
    └── useProfile.ts          ← manages the parsed SimC profile state
```

---

## Testing Requirements

Every new module in `src/lib/` must have a corresponding `.test.ts` file.
UI components must have at minimum a smoke test.

The combination generator (`combinator.ts`) must have tests covering:

- Single axis (no multiplication)
- Multiple axes (cartesian product)
- Cap enforcement (1000 max)
- Empty axis (no options selected) → treated as locked/pinned

---

## What "Easily Extensible" Means in Practice

A feature is "easy to add" if:

- It requires changes to AT MOST 3 files
- It does not require modifying the combination generator or ProfileSet builder
- It does not require modifying any existing component (only adding new ones)
- It can be feature-flagged with a single boolean in `features.ts`

```typescript
// src/lib/features.ts — simple feature flags
export const FEATURES = {
  GEM_OPTIMIZATION: true,
  ENCHANT_OPTIMIZATION: true,
  EMBELLISHMENT_COMPARISON: false, // set to true when ready
  TALENT_COMPARISON: false,
} as const;
```

Feature flags allow partially-built features to exist in the codebase without
being shown to users. Claude Code should check this file before implementing
a feature that is marked `false`.
