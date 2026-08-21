# Chase system review

## What was broken

1. **The chaser classes were effectively empty.** Every `update()` only
   counted down `abilityTimer`; the real ability lived in the scene. That made
   the class-level ability design misleading and made it very easy for the
   ability to silently stop working.
2. **Pathfinding found a route between intersections, but movement did not
   respect the current road segment.** A chaser halfway down a road was
   re-planned from its nearest intersection and then steered diagonally toward
   that node. The solid block collider stopped it, so it looked like bad or
   frozen pathfinding.
3. **Dash validation used an intercept point instead of the player.** The
   intercept point can be around a corner even while the player is visible.
   Rejecting that point made otherwise valid dashes fail.
4. **The dash had no route safety margin.** A full segment-length dash could
   overshoot a junction and end inside the next wall, where Arcade collision
   made the dash appear not to happen.

## What changed

- Chasers now finish their current horizontal/vertical road segment before
  following the A* route.
- Segment-end selection weighs both route length and the distance needed to
  reach the junction, preventing pointless reversals.
- Dash attacks validate visibility against the actual player, remain
  axis-aligned, stop short of junction/wall boundaries, and preserve the
  telegraph.
- The existing deterministic grid remains the source of truth, so all seven
  chasers use the same reliable movement rules rather than seven subtly
  different navigation implementations.

## Critique

The strongest idea in the original code is the separation between memory,
navigation, and scene presentation. The weak point is that the separation was
only structural: the chaser modules claimed ownership of abilities but did
not implement them, while the scene owned nearly all behavior. That mismatch
is the main reason this was difficult to debug.

The code also optimized for comments and tuning constants before establishing
one invariant: **a chaser must never request diagonal movement on a road-only
map**. Establishing that invariant first would have exposed the bug quickly.
Next time, add a tiny movement test for “mid-segment to opposite corner” and a
dash test for “visible player with a corner intercept” before polishing effects.