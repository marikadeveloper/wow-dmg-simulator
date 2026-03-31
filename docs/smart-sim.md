# Smart Sim — Multi-Stage Simulation

Research notes on Raidbots' "Smart Sim" feature, which uses a multi-stage
approach to run Top Gear simulations much faster than brute-force.

---

## Overview

Smart Sim is Raidbots' default simulation mode for Top Gear. Instead of
running every combination at full precision, it runs 3 stages of increasing
accuracy, culling bad combinations early so CPU time is only spent on
competitive gear sets.

The approach was inspired by [AutoSimC](https://github.com/SimCMinMax/AutoSimC),
an open-source tool that pioneered the multi-stage idea.

---

## The 3 Stages

Each stage uses SimulationCraft's `target_error` parameter, which stops
iterating once the statistical error drops below a threshold (rather than
running a fixed iteration count).

| Stage | Label            | target_error | ~Iterations | Purpose                            |
|-------|------------------|-------------|-------------|------------------------------------|
| 1     | Low Precision    | 1.0%        | ~100-200    | Fast triage — eliminate obvious losers |
| 2     | Medium Precision | 0.2%        | ~1,000      | Narrow the field to top contenders |
| 3     | High Precision   | 0.05%       | ~10,000+    | Final ranking with tight error bars |

The iteration counts are approximate — `target_error` is adaptive, so the
actual count depends on the variance of each profile's DPS distribution.

### How target_error works (SimC internals)

SimC tracks the DPS distribution across iterations. As iterations increase,
the standard error of the mean decreases. Once the error (as a percentage of
the mean) drops below `target_error`, SimC stops early. The max iteration cap
is 1,000,000 by default.

The confidence interval uses a 1.96x multiplier (95% CI) by default.

---

## Culling Between Stages

After each stage, combinations are sorted by mean DPS. The bottom performers
are eliminated before the next stage runs.

- **Stage 1 typically eliminates ~95% of combinations** — most gear sets are
  obviously worse and don't need further analysis.
- The survivors advance to Stage 2 for medium-precision confirmation.
- Stage 2 narrows further to the final contenders for Stage 3.

The filtering method uses `target_error`-based statistical comparison rather
than a simple "top N" cutoff — this avoids discarding combinations that are
statistically tied.

AutoSimC's original defaults for a "top N" approach were:
```
Stage 1 → keep top 1,000
Stage 2 → keep top 100
Stage 3 → keep top 1 (the winner)
```

Raidbots likely uses a more sophisticated statistical filter, but the general
shape is the same: aggressive early culling, conservative final ranking.

---

## Precision Options (User-Facing)

Raidbots exposes a **"High Precision"** checkbox on the Top Gear form:

| Setting          | Final target_error | What it means                        |
|------------------|--------------------|--------------------------------------|
| High Precision   | 0.05%              | ±5 DPS per 10,000 DPS — very tight   |
| Standard         | 0.1%               | ±10 DPS per 10,000 DPS — 2x faster   |

High Precision is recommended for gem/enchant sims where DPS differences are
tiny. Standard is fine for gear/talent comparisons with larger DPS gaps.

---

## Why It Matters for This Project

We could implement the same approach:

1. **Generate all combinations** as we do now (gear x gems x enchants).
2. **Stage 1:** Write a ProfileSet file with `target_error=1.0` and run all
   combos. Parse results, sort by DPS, keep the top ~5-10%.
3. **Stage 2:** Write a new ProfileSet with `target_error=0.2` for survivors
   only. Parse, sort, keep top ~10-20% of remaining.
4. **Stage 3:** Write a final ProfileSet with `target_error=0.05` for the
   last handful. This gives the final ranking.

### Implementation notes

- SimC's `target_error` option works at the profileset level — each profileset
  can have its own `target_error` without it leaking to other profilesets.
  Syntax: `profileset.combo_0001+=target_error=1.0`
- Alternatively, set a global `target_error` for the whole file and just
  change which profilesets are included in each stage.
- The combination naming scheme (`combo_0000`, `combo_0001`, ...) makes it
  easy to match results back to axis selections between stages.
- Progress reporting: emit stage transitions and per-stage completion
  percentages via Tauri events so the UI can show "Stage 1: Low Precision"
  etc., just like Raidbots does.

### When to use Smart Sim vs. brute-force

- **< 50 combinations:** Just run them all at `target_error=0.05`. The
  overhead of multiple SimC invocations isn't worth it.
- **50-200 combinations:** 2 stages (skip low precision, go straight to
  medium then high).
- **200+ combinations:** Full 3-stage pipeline.

### Potential DPS savings example

For a 1,000-combination Top Gear sim:
- **Brute-force:** 1,000 × ~10,000 iterations = ~10M iterations
- **Smart Sim:**
  - Stage 1: 1,000 × ~150 iterations = ~150K iterations → keep ~50
  - Stage 2: 50 × ~1,000 iterations = ~50K iterations → keep ~10
  - Stage 3: 10 × ~10,000 iterations = ~100K iterations
  - **Total: ~300K iterations** (30x faster)

---

## What We Observed on Raidbots (2026-03-31)

Running a Top Gear sim for a Frost Mage (Smarika) with 12 combinations:

- Queue wait: ~1.5 minutes (public, position 262/326)
- Stage 1 (Low Precision) + Stage 2 (Medium Precision): completed in seconds
- Stage 3 (High Precision): 4 combinations survived, ran at 10,250 iterations
- Total processing time: 10 seconds on 32 CPU cores
- Final margin of error: ~40 DPS (0.05%)
- Title showed: "10,250 (Smart Sim)" for iteration count

The 3-stage progress UI showed each stage as a labeled section in a progress
bar (Stage 1 / Stage 2 / Stage 3) with the current stage highlighted.

---

## Sources

- [Smart Sim — Raidbots Support](https://support.raidbots.com/article/55-smart-sim)
- [Smart Sim announcement — Seriallos (Raidbots blog)](https://medium.com/raidbots/smart-sim-2b54952aba44)
- [Smart Sim Is Ready! — Seriallos](https://medium.com/raidbots/smart-sim-is-ready-ecb12c07bcf0)
- [Smart Sim Precision — Seriallos](https://medium.com/raidbots/smart-sim-precision-7ee6b756bd7)
- [AutoSimC — GitHub (original multi-stage tool)](https://github.com/SimCMinMax/AutoSimC)
- [AutoSimC settings.py — default stage values](https://github.com/SimCMinMax/AutoSimC/blob/master/settings.py)
- [SimC Wiki — ProfileSet](https://github.com/simulationcraft/simc/wiki/ProfileSet)
- [SimC Wiki — Statistical Behaviour / target_error](https://github.com/simulationcraft/simc/wiki/StatisticalBehaviour)
