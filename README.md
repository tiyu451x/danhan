# Fragmen — Kota Madiun (game shell)

This is just the outer shell you asked for: top bar, main menu → credits →
cutscene flow, and the Archives/lore page. None of the actual RPG mechanics
(cards, watch, chase minigame, battles) are built yet — this is the frame
to build them inside.

## Run it

```bash
npm install
npm run dev
```

If you're dropping this into your existing Vite folder: replace
`package.json`, `index.html`, `tsconfig*.json`, and the whole `src/`
folder with the ones here, then `npm install`.

## What's in here

```
src/
  App.tsx                 top-level view switch: "game" vs "lore"
  components/
    TopBar.tsx / .css     fullscreen toggle + Option dropdown (Play / Archives)
    MainMenu.tsx / .css   hero -> play button -> credits -> cutscene, phase machine
    LorePage.tsx / .css   the static history-only page (Archives)
  game/
    CutsceneGame.tsx      mounts Phaser into a div, cleans up on unmount
    scenes/
      PlaceholderCutsceneScene.ts   stand-in scene — replace with the real opening
  styles/
    global.css             design tokens (colors, fonts) — everything reads from here
```

## The flow that's wired up

1. **Hero** — title + the "Play" button, styled as a card sliding into a
   reader slot (a nod to the watch/card mechanic).
2. Click it → the screen fades to black (`MainMenu.tsx`'s `goTo()`), then
   fades back in on the **credits** screen: lorem ipsum on the left, a
   dashed placeholder box on the right sized for a portrait key-art PNG
   (`credits__art-box` in `MainMenu.css` — drop an `<img>` in there once
   you have art).
3. Credits auto-advance after ~9s (there's a thin progress bar), or the
   person can hit **Continue** / **Skip** immediately.
4. Fades again into the **cutscene** phase, which mounts a real (tiny)
   Phaser scene — `PlaceholderCutsceneScene.ts` — so the canvas, resize
   handling, and teardown are all functional. Swap its contents for the
   actual street-view → chase → pull-into-Madiun opening.

## Design tokens

Everything pulls from `src/styles/global.css`:

- **Ink / parchment / brass** — the "memory" half: near-black background,
  aged-paper text, brass accents (gamelan bronze).
- **Corruption (magenta) / signal (cyan)** — the "glitch" half, used
  sparingly (the hero rule, cutscene glitch bars) so it reads as an
  intrusion rather than a color scheme.
- Type: **Rajdhani** for UI chrome, **Spectral** for anything narrative
  (credits, lore body text), **JetBrains Mono** for small labels.

Change the five color variables and both fonts in one place to retheme
the whole shell.

## Known gaps (on purpose — you said to exclude mechanics)

- No login system.
- No actual card/watch inventory, chase minigame, or 2D top-down map —
  `CutsceneGame.tsx` is the seam where the real Phaser game will live.
- Archives page has three real section headers (1568 / 1918 / 1948) as a
  starting structure — bodies are still lorem ipsum, waiting on real copy.
