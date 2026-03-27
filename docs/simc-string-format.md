# SimC Addon Export String Format

## Overview

The SimulationCraft WoW addon exports a **plain text** profile string (not JSON).
It is copy-pasted by the user into our app. Below is an annotated example.

---

## Full Annotated Example

```
# SimC Addon 11.0.5-01
# Requires SimulationCraft 1210-01 or newer

# Player: Thrall - Draenor - EU
# Spec: Enhancement Shaman
# Build: 11.0.5.57400

shaman="Thrall"          ← class="characterName"
level=80
race=orc
region=eu
server=draenor
role=attack
professions=Blacksmithing=100/Leatherworking=100

# talents are a base64-encoded string (hero talent format, Midnight onwards)
spec=enhancement
talents=BYQAAAAAAAAAAAAAAAAAAAAAAgUSShQSQJRSSJkQSJAAAAAAAAgUSShQSSRSSJkQAJAAAAA

# ---- EQUIPPED GEAR ----
# Each slot line: slotname=,id=ITEMID[,bonus_id=N/N/N][,gem_id=N][,enchant_id=N][,craft_stat=N/N]

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
finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340
finger2=,id=235615,bonus_id=10355/10257/1498/8767/10271,enchant_id=7340
trinket1=,id=235616,bonus_id=10355/10257/1498/8767/10271
trinket2=,id=235617,bonus_id=10355/10257/1498/8767/10271
main_hand=,id=235620,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444
off_hand=,id=235621,bonus_id=10355/10257/1498/8767/10271,enchant_id=7444

# ---- BAG ITEMS ----
# Bag items are in commented-out blocks, grouped by slot.
# The comment format is:  # slot=,id=...

# head=,id=229379,bonus_id=10390/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
# head=,id=219332,bonus_id=10390/10257/1498/8767/10271
# trinket1=,id=225652,bonus_id=10390/10257/1498/8767/10271
# trinket1=,id=219314,bonus_id=10390/10257/1498/8767/10271
# finger1=,id=225639,bonus_id=10390/10257/1498/8767/10271,enchant_id=7340
```

---

## Parsing Rules

### Character metadata lines

Parse these as key=value (unquoted or quoted):

```
shaman="Thrall"     → class=shaman, characterName=Thrall
level=80
race=orc
region=eu
server=draenor      (also accept "realm=")
spec=enhancement
talents=<base64>
```

Supported class keywords (the line starts with the class name):
`warrior`, `paladin`, `hunter`, `rogue`, `priest`, `deathknight`, `shaman`,
`mage`, `warlock`, `monk`, `druid`, `demonhunter`, `evoker`

### Equipped gear lines

Format: `slot=,id=N[,key=value]*`

- The slot name is the part before `=,id=`
- `bonus_id` values are `/`-separated integers
- `gem_id` values are `/`-separated integers (usually 1, sometimes 2 for double-gem slots)
- `enchant_id` is a single integer
- `craft_stat` appears on crafted gear, ignore it for now

Known slot names:
`head`, `neck`, `shoulder`, `back`, `chest`, `wrist`, `hands`, `waist`,
`legs`, `feet`, `finger1`, `finger2`, `trinket1`, `trinket2`,
`main_hand`, `off_hand`

### Bag item lines

Same format as equipped lines but **prefixed with `# `** (hash + space).

```
# head=,id=229379,...
```

Parse these identically to equipped lines. Tag them with `isEquipped: false`.

### Lines to ignore

- `# SimC Addon ...` header comment
- `# Requires SimulationCraft ...`
- `# Player: ...`, `# Spec: ...`, `# Build: ...`
- `professions=...`
- `role=...`
- Empty lines

### Lines to preserve verbatim (in `rawLines`)

Everything — the parser stores ALL original lines in `rawLines` so that profile
reconstruction for SimC input can replace only the gear lines it needs and pass
everything else through unchanged.

---

## Profile Reconstruction for a Combination

To build the SimC input file for one combination:

1. Clone `rawLines`
2. For each slot in the combination, find the **first non-commented line** for that slot
   and replace it with the chosen item's line
3. Join with `\n` and write to a temp file

Example: swapping head from item A to item B:

```
# Before
head=,id=235602,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7359

# After (item B chosen)
head=,id=229379,bonus_id=10390/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
```

Note: **carry over the enchant_id from the equipped item** if the bag item doesn't have one,
since the user presumably wants to re-enchant. This is a UX decision — see decisions.md.
