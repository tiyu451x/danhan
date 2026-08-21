# Madiun Memory — updated road-only chase

This version adds the requested road-only movement, wall-grazing slowdown, smarter approximate roaming, 7 customizable chasers, alert sharing, hiding spots, and unique chaser abilities.

## Run

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The uploaded project originally included a platform-specific `node_modules` folder, so the distributable ZIP intentionally leaves `node_modules` out. `package.json` pins the main runtime/build dependencies so a fresh install can recreate them.

## Main files

`src/game/scenes/ChaseIntroScene.ts` contains the map, movement, hiding, shared-memory, collision, and AI orchestration.

`src/game/chasers/` contains one file per chaser plus shared types/base behavior. See `docs/CHASE_SYSTEM.md` for customization notes.
