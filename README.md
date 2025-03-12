# Retro Game Boy Pokémon Red

A browser recreation focused on the **Pokémon Red** side of the original Generation I Game Boy experience using React and TypeScript, with a dedicated Generation I rules domain rather than modern battle rules.

## Implemented

- Game Boy-style overworld and menus
- Wild and trainer battles
- Classic Pokédex seen/owned tracking
- Generation I 151-species base-stat catalog
- Generation I 165-move catalog
- Generation I physical/special type split
- Speed-based critical hits
- Poison, Toxic, burn, freeze, paralysis, sleep, confusion, Disable
- Multi-hit and two-turn charging moves
- PP, Struggle, stat stages, residual effects and classic item cures
- Save/load, party/PC, Poké Mart and Pokémon Center flows

## Architecture

The Red/Blue rules implementation lives under `src/domain/red-blue/`:

- `catalog.ts` — Generation I species and move data
- `battle-rules.ts` — battle-state and rule calculations
- `resolve-turn.ts` — deterministic turn-resolution boundary used by the UI

See `LOCAL_ARCHITECTURE.md` for more detail.

## Local development

```bash
npm install
npm start
```

Production build:

```bash
npm run build
```

## Deployment

Production is served from `https://retro.oosu.dev/pokemon/`. The canonical repository is `oosuhada/retro-gameboy-pokemon`. GitHub `main` is the canonical release branch. A MacBook Air launchd mirror fetches the private GitHub repository with the authenticated local `git` client and forwards new `main` commits to the Mac mini through the `mac-mini` Tailscale SSH alias.
