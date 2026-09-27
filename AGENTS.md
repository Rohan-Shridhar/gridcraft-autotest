# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

**No tests, no lint, no type-check exist.** `npm test` exits with code 1 by design. No test runner is installed — do not try to run one.

## Critical Gotchas

- **`package.json` declares `"type": "commonjs"`** but the project is fully ESM (`.jsx` with `import`/`export` throughout). Do not add `require()` calls — Vite will break.
- **`ErrorPage` is unreachable in production.** `vercel.json` rewrites every path to `index.html`, so `window.location.pathname` is always `"/"`. The path-check in `App.jsx` line 383 never fires on the live deployment.
- **`toggleTheme` in `App.jsx:48` has inverted boolean logic.** `classList.toggle('light-theme', prev)` should be `!prev`. It is a live bug — do not copy the pattern.
- **`toastMessages.js` has no exports.** It is imported in `main.jsx` purely for its side effect (installs a `MutationObserver` that strips leading emoji from `.toast` elements). Do not refactor it to a named export or it will be tree-shaken away.
- **Custom export filename patches `HTMLAnchorElement.prototype.click`** in `Menu.jsx:19–29`. Do not create any `<a download="gridcraft.png">` element during a download — it will get its `download` attribute silently hijacked.
- **Favicon path `./public/logo.png` in `index.html` is wrong.** Vite serves `public/` at `/`; the correct path is `/logo.png`.

## Architecture

All state lives in `App.jsx` — no Context, no external store. The grid is a flat 1-D `cells` array of length `gridSize * gridSize`; index math is `row = Math.floor(idx / gridSize)`, `col = idx % gridSize`. Every `paintCell` call during a mouse-drag pushes a separate undo entry (cap: `MAX_HISTORY = 15`).

## Code Style

- No TypeScript, no linter, no formatter. Match the indentation of the file being edited (JSX files use 4-space inside functions; CSS uses 2-space).
- Components: named function declarations (`function Foo() {}`), `export default` at bottom.
- All theme-sensitive CSS values must use CSS custom properties (`var(--menu-bg-color)`, etc.). Hard-coded `black`/`white` in `tool-btn--active` and `tool-btn--fill-bg` in `index.css` is a known bug — do not replicate it.
- Toast API: `showToast(msg, type)` where `type` is `"success"` | `"error"` | `"info"` (default `"error"`). Leading emoji in messages are stripped automatically by the observer in `toastMessages.js`.
