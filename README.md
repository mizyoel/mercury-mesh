# Pixel Panic

A minimal 8-bit arcade game built with vanilla HTML, CSS, and JavaScript.

## Game Overview

- **Genre:** Real-time survival arcade
- **Platform:** Browser-only, single page, no backend
- **Session length:** 1-5 minutes per run
- **How to play:** [Open `index.html` in a web browser](#how-to-run)

## How to Run

1. Open `index.html` in any modern web browser.
2. No build step, no dependencies, no install required—it just runs.

## Controls

- **Move:** Arrow keys or WASD
- **Start / Restart:** Enter or Space

## Core Loop

```text
Boot
  -> Start Screen ("PIXEL PANIC")
  -> Playing
      -> move player left/right
      -> enemies spawn from screen edges and chase
      -> enemies accelerate over time (score-based)
      -> avoid touching enemies (3 lives)
      -> score increases passively while playing
  -> Game Over
  -> Restart (press Enter/Space)
```

**How you win:** There's no win condition. Survive as long as possible to rack up the highest score.

**How you lose:** Three enemy collisions and it's game over.

## Architecture

Pixel Panic uses a simple, single-file architecture optimized for quick iteration and clarity:

### File Structure

```
.
|-- index.html        # Canvas element, page structure, script entry
|-- styles.css        # 8-bit cabinet styling, pixel-perfect rendering
|-- game.js           # Core game logic: state, input, update, render
```

### Core Principles

- **Canvas 2D only:** All rendering to a `320x240` canvas with pixel-perfect scaling
- **No frameworks:** Plain HTML, CSS, JavaScript—zero dependencies
- **Single state object:** All gameplay state lives in one immutable-ish object; rendering reads it, never mutates it
- **Time-delta update loop:** Variable-timestep updates clamped to 33ms; `requestAnimationFrame` for rendering
- **Fixed entities:** Player, enemies, particles; all stored as plain data objects (no classes)

### State Model

```js
{
  scene: "start" | "playing" | "gameover",
  score: number,              // points earned this run
  best: number,               // high score
  lives: number,              // 0-3
  time: number,               // elapsed seconds (playing)
  spawnTimer: number,         // countdown to next enemy spawn
  flashTimer: number,         // screen flash effect duration
  shake: number,              // camera shake intensity
  player: {
    x, y,                      // center position
    size: 6,
    speed: 105,               // pixels/sec
    hitCooldown: number       // iframe after collision
  },
  enemies: [                  // array of chasing objects
    { x, y, size, speed, wobble, hue }
  ],
  particles: [                // burst effects on hit
    { x, y, vx, vy, life, age, color }
  ]
}
```

### Gameplay Mechanics

- **Player:** 6px sprite, starts center, constrained to playfield
- **Enemies:** Spawn from random edges, chase toward player, wobble side-to-side
- **Difficulty curve:** Spawn rate accelerates over time (less delay between spawns); enemy speed scales with score
- **Collision:** Simple bounding-box overlap; hit grants iframe (1.25s) to avoid rapid deaths
- **Effects:** Enemy collision triggers screen flash and camera shake; particles burst at impact point
- **Score:** Passively accumulates at 10 points per second; resets on death

### Input Handling

- Keyboard: Arrow keys or WASD for movement
- Keyboard: Space or Enter to start/restart
- Movement is normalized (diagonal doesn't give speed boost)
- All key states stored in a `Set` so concurrent presses work correctly

## Design Decisions

### Why single file for game logic?

**Trade-off:** Monolithic `game.js` (379 lines) vs. modular split (update/render/input in separate files).

- **Pros:** No module coordination overhead, trivial dependency graph, quick iteration, easy to understand the whole game at a glance
- **Cons:** Harder to scale beyond ~500 lines, less reusable components
- **Right for v1:** The game is small and intentionally simple; splitting too early introduces ceremony overhead that outweighs benefit

### Why no procedural generation?

**Trade-off:** Authored difficulty curve vs. procedurally spawned enemies.

- **Pros:** Predictable, tunable, easier to feel "fair" to the player
- **Cons:** Less replayability, must be carefully balanced
- **Right for v1:** Makes the first implementation finishable and playable in one sitting

### Why time-delta updates?

**Trade-off:** Variable timestep (simpler, frame-rate agnostic) vs. fixed timestep (deterministic, complex).

- **Pros:** No accumulator, works on any framerate, simple to reason about
- **Cons:** Slight unpredictability if framerate is erratic (but negligible at 60 Hz)
- **Right for v1:** Arcade games don't need replay determinism; simpler code wins
