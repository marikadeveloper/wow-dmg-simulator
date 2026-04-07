# ProfileSet Builder — Complete Reference

This document defines exactly how the app generates the `.simc` input file
that gets passed to the SimC binary. This is the most critical transformation
in the entire app.

---

## Structure of the Generated File

```
[1] Global sim options      ← fight_style, max_time, iterations, threads, etc.
[2] Base character profile  ← the user's currently equipped gear, talents, etc.
[3] Enemy definitions       ← enemy=add1, enemy=add2, etc. (if >1 target)
[4] ProfileSet entries      ← one per combination (except the currently-equipped one)
```

The base character profile is always the currently-equipped state.
Its DPS result comes from `sim.players[0].collected_data.dps.mean`.
ProfileSet results come from `profilesets.results[i].mean`.

---

## Complete Annotated Example

Scenario: user has 2 trinket options, 2 ring options with 2 enchants each.
Total combinations: 2 trinkets × 2 rings × 2 enchants = 8 combos.
The base (currently equipped) is trinket A + ring A + enchant X — NOT a profileset.
The remaining 7 are profilesets.

```simc
# ── SECTION 1: Global options ────────────────────────────────────────────────
fight_style=Patchwerk
max_time=300
vary_combat_length=0.2
iterations=10000
threads=7
process_priority=below_normal
output=nul                          # Windows: use "nul"; macOS/Linux: use "/dev/null"
json2=C:\Users\...\simc_out_abc.json

# ProfileSet parallel execution: 4 workers × 2 threads each (if threads=8)
profileset_work_threads=2

# ── SECTION 2: Base character (currently equipped) ───────────────────────────
shaman="Thrall"
level=80
race=orc
region=eu
server=draenor
role=attack
spec=enhancement
talents=BYQAAAAAAAAAAAAAAAAAAAAAgUSShQSQJRSSJkQSJAAAAAAAAgUSShQSSRSSJkQAJAAAAA

head=,id=235602,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
neck=,id=235610,bonus_id=10355/10257/1498/8767/10271,enchant_id=7361
shoulder=,id=235604,bonus_id=10355/10257/1498/8767/10271
back=,id=235613,bonus_id=10355/10257/1498/8767/10271,enchant_id=7364
chest=,id=235600,bonus_id=10355/10257/1498/8767/10271,enchant_id=7392
wrist=,id=235609,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7356
hands=,id=235603,bonus_id=10355/10257/1498/8767/10271
waist=,id=235607,bonus_id=10355/10257/1498/8767/10271,gem_id=213743
legs=,id=235605,bonus_id=10355/10257/1498/8767/10271,enchant_id=7390
feet=,id=235608,bonus_id=10355/10257/1498/8767/10271,enchant_id=7424
finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340  # ← ring A + enchant X (base)
finger2=,id=235615,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340
trinket1=,id=235616,bonus_id=10355/10257/1498/8767/10271                  # ← trinket A (base)
trinket2=,id=235617,bonus_id=10355/10257/1498/8767/10271
main_hand=,id=235620,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444
off_hand=,id=235621,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444

# ── SECTION 3: Enemies (only if num_enemies > 1) ────────────────────────────
# (omitted in this example — single target)

# ── SECTION 4: ProfileSets ───────────────────────────────────────────────────
# Format: profileset."combo_NNNN"=<first override line>
#         profileset."combo_NNNN"+=<additional override lines>
#
# RULES:
# - First line uses = (not +=)
# - Subsequent lines use +=
# - Name must be unique, no dots, enclosed in double quotes
# - Only include lines that DIFFER from the base profile
# - Do NOT repeat lines that are identical to the base

# combo_0001: trinket A + ring A + enchant Y (only enchant changes)
profileset."combo_0001"=finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271,enchant_id=7341

# combo_0002: trinket A + ring B + enchant X
profileset."combo_0002"=finger1=,id=229379,bonus_id=10390/10257/1498/8767/10271,enchant_id=7340

# combo_0003: trinket A + ring B + enchant Y
profileset."combo_0003"=finger1=,id=229379,bonus_id=10390/10257/1498/8767/10271,enchant_id=7341

# combo_0004: trinket B + ring A + enchant X
profileset."combo_0004"=trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271

# combo_0005: trinket B + ring A + enchant Y
profileset."combo_0005"=trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271
profileset."combo_0005"+=finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271,enchant_id=7341

# combo_0006: trinket B + ring B + enchant X
profileset."combo_0006"=trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271
profileset."combo_0006"+=finger1=,id=229379,bonus_id=10390/10257/1498/8767/10271,enchant_id=7340

# combo_0007: trinket B + ring B + enchant Y
profileset."combo_0007"=trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271
profileset."combo_0007"+=finger1=,id=229379,bonus_id=10390/10257/1498/8767/10271,enchant_id=7341
```

---

## Combination Naming Scheme

Names follow the format `combo_NNNN` where NNNN is a zero-padded 4-digit index.

- `combo_0001` through `combo_9999` (up to 9999 combinations, hard cap is 1000)
- The currently-equipped combination is always the **base profile** (no profileset entry)
- In TypeScript, maintain a `Map<string, CombinationSpec>` as a manifest:

```typescript
interface CombinationSpec {
  name: string; // "combo_0001"
  axes: Record<string, string>; // axisId → optionId
  overrideLines: string[]; // the SimC lines that differ from base
}

// Built alongside the .simc file content:
const manifest = new Map<string, CombinationSpec>();
```

### Why indexed names (not descriptive names)?

- Descriptive names like `trinket1_225652_ring1_229379_enchant_7341` can exceed
  SimC's internal name buffer and cause silent truncation
- Indexed names are safe, predictable, and easy to parse back from results
- The manifest handles the human-readable mapping

---

## Parsing SimC json2 Output

```typescript
interface SimCJson2Output {
  sim: {
    players: [
      {
        collected_data: {
          dps: { mean: number; std_dev: number; mean_std_dev: number };
        };
      },
    ];
  };
  profilesets: {
    results: Array<{
      name: string; // "combo_0001"
      mean: number;
      stddev: number;
      mean_stddev: number;
      min: number;
      max: number;
      median: number;
    }>;
  };
}
```

### Building SimResult[] from the output:

```typescript
function parseSimResults(
  json: SimCJson2Output,
  manifest: Map<string, CombinationSpec>,
  baseProfile: SimcProfile,
): SimResult[] {
  const results: SimResult[] = [];

  // Add the base (currently equipped) result
  results.push({
    name: 'combo_0000', // reserved for "currently equipped"
    isBaseline: true,
    dps: json.sim.players[0].collected_data.dps.mean,
    stdDev: json.sim.players[0].collected_data.dps.std_dev,
    meanStdDev: json.sim.players[0].collected_data.dps.mean_std_dev,
    axes: {}, // all defaults
  });

  // Add profileset results
  for (const r of json.profilesets.results) {
    const spec = manifest.get(r.name);
    if (!spec) continue; // shouldn't happen
    results.push({
      name: r.name,
      isBaseline: false,
      dps: r.mean,
      stdDev: r.stddev,
      meanStdDev: r.mean_stddev,
      axes: spec.axes,
    });
  }

  return results.sort((a, b) => b.dps - a.dps);
}
```

---

## Parallel ProfileSet Mode

From the SimC wiki: with `profileset_work_threads=N`, SimC runs multiple profilesets
concurrently. The maximum parallel workers = `floor(threads / profileset_work_threads)`.

Recommended strategy for this app:

```
threads=T (from user config, default cpu_count - 1)
profileset_work_threads=2
# This gives floor(T/2) parallel workers
# e.g. threads=8 → 4 workers × 2 threads each
```

This is much faster than sequential mode for large combination sets.
**Always enable parallel mode** by setting `profileset_work_threads=2`.

---

## Multi-Enemy Configuration

When `numEnemies > 1`, add enemy definitions AFTER the base character profile
and BEFORE profilesets:

```simc
# After base profile, before profilesets:
enemy=add1
enemy=add2
enemy=add3
```

Each `enemy=NAME` line adds one additional target. Do NOT set any enemy options
unless implementing custom boss encounters (out of scope for MVP).

---

## Fixed Time vs Variable Time

For Sim Gear comparisons, all profilesets must run under identical conditions.
The default `vary_combat_length=0.2` introduces ±20% variance, which SimC handles
correctly by distributing evenly across iterations. This is fine to keep.

If the user sets `vary_combat_length=0`, add `fixed_time=1` to ensure a truly
fixed-length fight:

```
max_time=300
vary_combat_length=0.0
fixed_time=1
```

---

## Statistical Noise Detection

Two results are within statistical noise if their confidence intervals overlap.
Use `mean_std_dev` (standard error of the mean) for this:

```typescript
function areWithinNoise(a: SimResult, b: SimResult): boolean {
  // Overlap test: |a.dps - b.dps| < 2 * max(a.meanStdDev, b.meanStdDev)
  return Math.abs(a.dps - b.dps) < 2 * Math.max(a.meanStdDev, b.meanStdDev);
}
```

Show a `≈` badge in the results table for combinations within noise of rank #1.
