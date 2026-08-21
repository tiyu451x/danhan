# Fragmen — Kota Madiun (game shell)

Top bar, main menu → credits → cutscene → overworld flow, and the
Archives/lore page. The core exploration loop — a top-down map, movement,
collision, a skip-cutscene transition — is wired up. Cards, the watch UI,
the chase minigame, and battles are still not built; those are the next
seam to build inside `MadiunOverworldScene.ts`.

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
  App.tsx                 top-level view switch: "game" vs "lore", tracks gameplay-active
  components/
    TopBar.tsx / .css     fullscreen toggle, Option dropdown, auto-hide + pull tab
    MainMenu.tsx / .css   hero -> play button -> credits -> cutscene, phase machine
    LorePage.tsx / .css   the static history-only page (Archives)
  game/
    GameStage.tsx          mounts one Phaser.Game (cutscene + overworld scenes), skip button
    eventBus.ts             tiny shared emitter so Phaser scenes can talk to the React overlay
    scenes/
      PlaceholderCutsceneScene.ts   stand-in scene + the skip -> zoom-in transition
      MadiunOverworldScene.ts       the top-down Kota Madiun map — the core gameplay loop
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
4. Fades again into the **cutscene** phase, which mounts a real Phaser
   game — `GameStage.tsx` — starting on `PlaceholderCutsceneScene.ts`.
   The overlay shows a **Skip Cutscene →** button the whole time this
   scene is active.
5. Clicking skip (or finishing the real cutscene once it's written) grows
   a placeholder rectangle from the point `(430, 650)` until it fully
   covers the canvas, fades to black, then starts
   `MadiunOverworldScene.ts` — the top-down map. WASD/arrows move the
   player; the HUD in the top-left names whichever landmark you're
   standing in.

## The top bar auto-hide

Once `MainMenu` leaves the hero phase (credits, cutscene, or overworld),
`App.tsx` sets `autoHide` on `TopBar`, which rolls itself up out of view
(`top-bar--hidden`, a `transform: translateY(-100%)` transition) and
leaves a small brass ribbon tail hanging at top-center. Click the tail to
pull the bar back down; click it again to send it back up. Leaving the
hero phase again (going back to the menu, or over to Archives) resets it.

## The overworld map

`MadiunOverworldScene.ts` is a stylized — **not to-scale** — top-down
layout, not a literal city plan. The relative directions are real (the
Alun-Alun really does sit at Kota Madiun's "km 0" road crossing, with
Masjid Agung Baitul Hakim to its east and Balai Kota to its north;
Stasiun Madiun and Pasar Besar really are a short walk west; Pabrik Gula
Rejo Agung really is south), but the exact distances/sizes are invented
for the sake of a playable room. Everything is drawn with
`add.rectangle`/`add.text` primitives — no art assets yet — so swapping
in a real tileset or sprites later means touching `drawLandmarks()` and
`createPlayer()` without needing to change movement, collision, or the
camera.

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

## Known gaps (on purpose)

- No login system.
- No card/watch inventory, chase minigame, RNG, or battle system yet —
  `MadiunOverworldScene.ts` is the seam where those plug in (a single
  overlap check per landmark is already there in `updateLocationLabel()`
  as the pattern to extend for card pickups).
- The cutscene is still the placeholder scene; only the skip → zoom-in →
  overworld transition is real.
- Archives page has three real section headers (1568 / 1918 / 1948) as a
  starting structure — bodies are still lorem ipsum, waiting on real copy.
