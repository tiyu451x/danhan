# Chase system customization guide

The chase AI is now split into individual files under `src/game/chasers/`.

- `CrimsonChaser.ts` — **Dread**: when Crimson has exact visual detection, it applies a dark border vignette effect.
- `AmberChaser.ts` — **Dash**: when Amber has exact visual detection and a clear line of sight, it telegraphs a straight dash for 160px (5× the 32px sprite height), then dashes. The wall collider can stop the dash.
- `VioletChaser.ts` — **Seeker**: searches the player's broad-memory area with a pulse instead of learning the exact position.
- `TealChaser.ts` — **Snare**: places a temporary slow field around the broad-memory area.
- `GoldChaser.ts` — **Interceptor**: predicts the player's current movement and searches the projected road position.
- `CyanChaser.ts` — **Siren**: periodically reinforces the alert state and calls the other chasers to the known position.
- `MagentaChaser.ts` — **Blocker**: creates a larger, temporary slow zone on a likely route through the search area.

Each file has a `ChaserDefinition` near the top of its constructor. That is the easiest place to tune:

- `scale` — enemy size.
- `roamSpeed` — wandering speed.
- `chaseSpeed` — speed when the enemy knows the exact position.
- `detectionRadius` — direct visual detection range.
- `broadRadius` — size of the approximate search area.
- `abilityCooldown` — ability frequency.

## Player hiding / memory model

The player can press **E** at the labelled wall recesses to hide.

While hidden:

- the player's sprite disappears;
- every chaser loses the player's exact position;
- chasers fall back to roaming/searching the last broad area;
- chasers do not receive a precise hidden coordinate.

When the player exits the hiding spot:

- the player's exact position is restored to the shared alert memory;
- every chaser is alerted immediately;
- the player can break line-of-sight again to make that exact knowledge expire back to a broad search area.

## Movement / map rules

The previous grass blocks are no longer walkable. Blocks are solid walls and only the road grid is traversable.

Touching a wall while moving applies a strong slowdown, and player movement now uses acceleration/deceleration instead of instant velocity snaps. This makes wall-hugging and 90-degree corner abuse less effective.
