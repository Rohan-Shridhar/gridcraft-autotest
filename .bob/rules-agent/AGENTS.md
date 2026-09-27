# Project Coding Rules (Non-Obvious Only)

- **No test framework exists.** Do not write test files or add test dependencies — there is nowhere to run them and `npm test` is a no-op stub.
- **`"type": "commonjs"` in `package.json` is wrong** — the entire codebase is ESM. Never use `require()` or `module.exports`.
- **`toggleTheme` (`App.jsx:48`) has inverted logic**: `classList.toggle('light-theme', prev)` must be `!prev` to work correctly. This is a live bug — fix it, don't preserve it.
- **`toastMessages.js` must remain a side-effect import.** It has no exports; if you add `export` keywords or move the observer setup inside a function that isn't called at module load time, the emoji-stripping stops working silently.
- **`HTMLAnchorElement.prototype.click` is monkey-patched during export** (`Menu.jsx:19–29`). Any `<a download="gridcraft.png">` created while `downloadImage()` is awaiting will have its filename redirected. Keep download logic isolated.
- **Every drag-paint cell fires `paintCell` individually**, each pushing a history entry. `MAX_HISTORY = 15` means fast drags exhaust undo quickly. Do not raise this constant without profiling — at 128×128 each snapshot is a 16 384-item array.
- **`floodFill` captures `gridSize` from the outer `App` closure**, not from its arguments. If you extract it to a utility file, `gridSize` must be passed as an explicit parameter.
- **CSS custom properties are the only theming mechanism** — no CSS-in-JS, no Tailwind. Every new colour value must reference a variable from `:root` / `body.light-theme` in `index.css`. Hard-coded colours break light mode.
- **`isSmallScreen` is computed with `window.innerWidth` at render time** (`App.jsx:41`) — this breaks in any non-browser environment (SSR, jsdom). Do not add more bare `window.*` reads outside `useEffect`.
- **Favicon and any new static assets belong in `public/`** and must be referenced with an absolute root path (`/logo.png`), not `./public/logo.png`.
