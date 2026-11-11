# AGENTS.md

Single-file HTML5 Canvas game. No dependencies, no bundler, no build step.

## Run

- Open `index.html` directly in a browser, or run `npx serve .` (then visit the URL it prints, typically `http://localhost:3000`).
- There is no test, lint, typecheck, or codegen tooling. Verify changes manually in the browser (check the DevTools console for errors).

## Structure

- `index.html` loads `game.js` as a classic script (not a module) and defines the canvas at 800x600.
- `game.js` holds everything: `Bullet`, `Asteroid`, `Ship`, `Particle`, global game state, `update(dt)`, `draw()`, and the `requestAnimationFrame` loop.
- `W = 800` / `H = 600` in `game.js` must stay in sync with the canvas `width`/`height` in `index.html`.

## Conventions and gotchas

- The game loop caps `dt` at 0.05s; all movement is per-second and must be multiplied by `dt`.
- Entities use a `.dead` flag and are filtered out each frame; follow this pattern for new entities.
- Input: `keys[code]` is held state; `pressed(code)` is one-shot and clears the flag. Use `pressed()` for actions that must fire once per key press (e.g. shooting, restart).
- Game state is the string `state`: `'playing' | 'dead' | 'gameover'`. `dead` is a 2s respawn timer; `gameover` restarts on Space via `initGame()`.
- Asteroid `size` is 1-3 and indexes `RADII`, `SPEEDS`, and `POINTS`. Size 1 does not split.
- World is toroidal (`wrap()`), but collision distances use plain Euclidean `dist()`; objects on opposite edges do not collide. This is existing behavior, not a bug to silently "fix" unless asked.
- User-facing text and the README are in Spanish; keep new UI strings in Spanish.
- `README.md` advertises power-ups and a "estrella fugaz" that do not exist in `game.js`. Trust the code over the README.
- Do not introduce frameworks, dependencies, or ES modules without updating `index.html` accordingly.
