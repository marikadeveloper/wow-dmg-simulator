# SimulationCraft Wiki Reference

The SimC wiki lives at: https://github.com/simulationcraft/simc/wiki

When Claude Code needs details not covered in these docs, it should fetch the
relevant wiki page directly. Key pages are listed below with their URLs.

---

## Most Relevant Wiki Pages for This Project

| Topic                                                       | URL                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| General options (iterations, threads, fight length)         | https://github.com/simulationcraft/simc/wiki/Options              |
| Statistical behaviour (target_error, iterations)            | https://github.com/simulationcraft/simc/wiki/StatisticalBehaviour |
| Raid events & fight styles                                  | https://github.com/simulationcraft/simc/wiki/RaidEvents           |
| Target / enemy options (num enemies, target_race)           | https://github.com/simulationcraft/simc/wiki/TargetOptions        |
| Equipment syntax (gear lines, gem_id, enchant_id)           | https://github.com/simulationcraft/simc/wiki/Equipment            |
| Output formats (json2, html, text)                          | https://github.com/simulationcraft/simc/wiki/Output               |
| Profile Sets (running multiple profiles in one binary call) | https://github.com/simulationcraft/simc/wiki/ProfileSet           |
| Characters (general profile syntax)                         | https://github.com/simulationcraft/simc/wiki/Characters           |
| Buffs and debuffs (override.bloodlust etc.)                 | https://github.com/simulationcraft/simc/wiki/BuffsAndDebuffs      |
| Expansion-specific options (Midnight/TWW/Dragonflight)      | https://github.com/simulationcraft/simc/wiki/ExpansionOptions     |
| FAQ                                                         | https://github.com/simulationcraft/simc/wiki/FAQ                  |
| Common Issues                                               | https://github.com/simulationcraft/simc/wiki/CommonIssues         |

---

## Key SimC Options Used by This App

### Combat Length

```
max_time=300              # fight duration in seconds (default 300)
vary_combat_length=0.2    # ±20% variance (default 0.2)
fixed_time=1              # disable health-based ending (use time only)
```

### Fight Style

```
fight_style=Patchwerk          # single target, no movement (default)
fight_style=CastingPatchwerk   # Patchwerk but boss casts
fight_style=LightMovement      # movement every ~85s
fight_style=HeavyMovement      # movement every ~20s
fight_style=HecticAddCleave    # boss + add waves + movement
fight_style=DungeonSlice       # mixed ST/AoE dungeon emulation
fight_style=HelterSkelter      # movement + stuns + interrupts
```

### Enemies (number of targets)

```
# Add extra enemies for multi-target sims
enemy=add1
enemy=add2
# Or use target_race for specific race effects
target_race=humanoid
```

### Statistical Accuracy

```
iterations=10000          # fixed iterations
# OR (not both):
target_error=0.1          # stop when DPS error < 0.1%
```

### Output

```
output=nul                # suppress text report (Windows)
output=/dev/null          # suppress text report (macOS/Linux)
json2=/path/to/out.json   # machine-readable output (always use this)
```

### Threading

```
threads=7                 # use 7 CPU threads
process_priority=below_normal  # don't starve other apps
```

---

## ProfileSet — Important Optimization Opportunity

The SimC wiki page on ProfileSet describes a feature where you can run **multiple
character profiles in a single SimC invocation** using `profileset.name=`:

```
# Base profile
shaman="Thrall"
...base gear...

# Profilesets — SimC runs all of them and outputs results for each
profileset.trinket_combo_1+=trinket1=,id=235616,...
profileset.trinket_combo_1+=trinket2=,id=235617,...
profileset.trinket_combo_2+=trinket1=,id=229379,...
profileset.trinket_combo_2+=trinket2=,id=219314,...
```

**This is a major optimization**: instead of spawning N separate SimC processes
(one per combination), you can put all combinations into a SINGLE profileset file
and run one SimC process. SimC handles the iteration sharing internally, which
is much faster than N sequential processes.

### ProfileSet output in json2:

```json
{
  "profilesets": {
    "results": [
      { "name": "trinket_combo_1", "mean": 854321.45, ... },
      { "name": "trinket_combo_2", "mean": 849123.12, ... }
    ]
  }
}
```

**DPS field for profilesets:** `profilesets.results[i].mean`

### Decision on ProfileSet:

This app SHOULD use ProfileSet instead of N sequential processes. It is faster,
uses less memory, and produces statistically comparable results (same iteration seed).
See decisions.md for the rationale entry.

---

## Exit Codes (from wiki/Output)

| Code | Meaning                          | How to handle                                      |
| ---- | -------------------------------- | -------------------------------------------------- |
| 0    | Clean success                    | Parse json2 output normally                        |
| 1    | Warnings present (non-fatal)     | Check if json2 exists; if yes, treat as success    |
| 50   | Iteration error                  | Mark sim as failed                                 |
| 51   | Simulation stuck (infinite loop) | Mark sim as failed, log stderr                     |
| 60   | Network/file error               | Mark sim as failed                                 |
| 70   | Invalid global argument          | Show error to user, likely a bug                   |
| 71   | Invalid fight style              | Show error to user                                 |
| 72   | Unsupported spec                 | Show error to user                                 |
| 80   | Invalid player argument          | Show error to user                                 |
| 81   | Invalid talent string            | Show error to user — talent string likely outdated |
