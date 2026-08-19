# Madiun Memory — Vite + React + TypeScript + Phaser Prototype

This project replaces the stock Vite React screen with a web-game shell for your Madiun history concept.

## Stack
- Vite
- React
- TypeScript
- Phaser
- CSS

Vite 8 documentation currently states Node.js 20.19+ or 22.12+ is required; Node 22.16 satisfies that requirement.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Current flow
1. Top bar with fullscreen + Options.
2. Options → Play Game.
3. Options → History / Material.
4. Play screen with the large PLAY button.
5. PLAY creates Phaser and shows a credits overlay with an image placeholder.
6. Credits fade into an opening cutscene overlay.
7. Continue enters the Phaser top-down map placeholder.

## Where to continue
- `src/components/` = website shell / UI.
- `src/game/` = Phaser game.
- `src/data/history.ts` = historical content data.
- `public/assets/` = future sprites, UI, audio, cards, and backgrounds.
- `docs/ASSET_CHECKLIST.md` = visual/audio asset checklist.
- `docs/CODE_CHECKLIST.md` = systems checklist.
- `docs/GAME_DESIGN_NOTES.md` = gameplay direction.

This is intentionally not the full game. It proves the website shell, view switching, fullscreen behavior, React/Phaser mounting, credit transition, opening scene placeholder, and material mode.
