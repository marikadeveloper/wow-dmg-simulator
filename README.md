# WoW Gear Sim

A desktop app for World of Warcraft players to find their best gear, gems, and enchants — powered by [SimulationCraft](https://www.simulationcraft.org/), running 100% locally.

Inspired by [Raidbots](https://www.raidbots.com/) Top Gear, but with no uploads, no queue, and no subscription. Just paste your SimC export string, pick the items you want to compare, and hit Run.

## Features

- **Gear comparison** — Select items across all slots and rank them by DPS
- **Gem optimization** — Try different gem combinations across all socketed items
- **Enchant optimization** — Compare enchants across all enchantable slots
- **Combined runs** — Optimize gear, gems, and enchants together in a single simulation
- **Smart defaults** — Works out of the box with sensible settings, no configuration required
- **Fully offline** — All simulations run on your machine using the bundled SimC binary

## How It Works

1. Install the [SimulationCraft addon](https://www.curseforge.com/wow/addons/simulationcraft) in WoW
2. Type `/simc` in-game to generate your export string
3. Paste it into WoW Gear Sim
4. Select which items, gems, and enchants to compare
5. Click **Run** — results are ranked by DPS with deltas shown

Under the hood, the app generates a single SimC [ProfileSet](https://github.com/simulationcraft/simc/wiki/ProfileSets) file containing all combinations and runs one SimC process for statistically consistent results.

## Installation

Download the latest release for your platform from the [Releases](https://github.com/marikamella/wow-gear-sim/releases) page:

| Platform | Architecture |
|---|---|
| macOS | Apple Silicon (arm64) / Intel (x86_64) |
| Windows | x86_64 |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)

### Setup

```bash
pnpm install
pnpm tauri dev     # full app with Tauri shell (hot reload)
pnpm dev           # frontend only (no desktop shell)
```

### Commands

```bash
pnpm test              # run tests
pnpm tauri build       # production build for current platform
pnpm season:validate   # validate seasonal data before release
pnpm build:item-db     # regenerate item database from SimC source
```

### Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Desktop shell:** [Tauri 2](https://v2.tauri.app/)
- **Simulation engine:** [SimulationCraft](https://www.simulationcraft.org/) (bundled as a sidecar binary)

## License

This project is not affiliated with Blizzard Entertainment or SimulationCraft.
