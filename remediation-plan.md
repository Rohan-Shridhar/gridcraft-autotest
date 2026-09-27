# GridCraft Remediation Plan
## IBM Bob 2.0 Hackathon — Phase 4: Prioritized Implementation Plan

> **Goal**: Demonstrate an IBM Bob 2.0 agentic workflow that improves developer workflow for debugging, code review, and testing.
> **Constraint**: Do NOT over-engineer. Only fix what produces a clear before/after story and passes the hackathon evaluation criteria.

### Approved Decisions (recorded before implementation)

| Decision | Choice | Rationale |
|---|---|---|
| Fix scope | Exactly FIX-01 through FIX-10 | Approved by user — no additions, no removals |
| `floodFill` extraction | Extract into `src/utils/floodFill.js` as a pure exported function taking `(cells, index, targetColor, fillColor, gridSize)` | Enables direct unit testing without rendering App; minimal refactor |
| `npm test` script | `vitest run` (one-shot CI mode) | Deterministic, suitable for automated verification; watch mode available manually via `npx vitest` |

---

## A. Critical / High-Priority Fixes

### FIX-01 — `exportWithFilename` is dead code (never called)

| Field | Value |
|---|---|
| **Issue ID** | FIX-01 |
| **Category** | Correctness / Feature regression |
| **Severity** | Critical |
| **File** | `src/Menu.jsx` lines 7–30, 37 |
| **Root cause** | `exportWithFilename()` is defined and fully implemented but the Export button calls `downloadImage` directly (the prop passed in). The custom filename feature silently does not work. |
| **User impact** | Every user who clicks Export gets a hard-coded `gridcraft.png` filename with no opportunity to rename it. The prompt dialog never appears. |
| **Proposed change** | Change `Menu.jsx` to call `exportWithFilename()` instead of `downloadImage()` on the Export button click. `exportWithFilename` already has the prompt, sanitisation, and prototype-patch logic. No new code is needed — just wire the existing function. |
| **Regression test** | Yes — `exportWithFilename: should prompt user for filename and call downloadImage` |
| **Verification** | Click Export → prompt dialog appears → typed filename becomes the `.download` attribute on the anchor element |
| **Expected improvement** | Custom export filenames work end-to-end |

---

### FIX-02 — `toggleTheme` has inverted boolean logic

| Field | Value |
|---|---|
| **Issue ID** | FIX-02 |
| **Category** | Correctness / UI bug |
| **Severity** | High |
| **File** | `src/App.jsx` lines 46–51 |
| **Root cause** | `document.body.classList.toggle('light-theme', prev)` passes the *old* value `prev` as the force argument. When `prev = true` (dark theme active, `isDarkTheme = true`) it **adds** `light-theme` — correct. But when `prev = false` (already in light mode) it **removes** `light-theme` — inverted. The class toggles one step behind the React state. The correct force argument is `!prev`. |
| **User impact** | Theme toggle is one click behind: first click appears to do nothing; subsequent clicks produce the wrong theme. The application ships with a documented known bug. |
| **Proposed change** | Change `document.body.classList.toggle('light-theme', prev)` → `document.body.classList.toggle('light-theme', !prev)` |
| **Regression test** | Yes — `toggleTheme: body should have light-theme class when isDarkTheme becomes false` |
| **Verification** | Before: two clicks required to see any visual change. After: first click immediately applies correct theme class. |
| **Expected improvement** | Theme toggle works correctly on first click |

---

### FIX-03 — `handleKeyPress` stale closure on `undo`/`redo`

| Field | Value |
|---|---|
| **Issue ID** | FIX-03 |
| **Category** | Correctness / State bug |
| **Severity** | High |
| **File** | `src/App.jsx` lines 55–122 |
| **Root cause** | `handleKeyPress` is a `useCallback` that calls `undo()` and `redo()` but neither is listed in its dependency array (only `history`, `future`, `showGrid` are). `undo` and `redo` close over `cells`, `history`, and `future` via their own hook closures. If React batches state updates or the callback identity of `undo`/`redo` changes between renders, `handleKeyPress` may call a stale version of either function. |
| **User impact** | Keyboard undo/redo (Ctrl+Z / Ctrl+Y) may silently operate on an outdated copy of the history stack, resulting in incorrect canvas state after rapid key presses. |
| **Proposed change** | Add `undo` and `redo` to the `useCallback` dependency array for `handleKeyPress`. Since `undo` and `redo` are plain functions (not `useCallback`-wrapped), this means they will be recreated each render, which is correct and safe — `handleKeyPress` must hold a fresh reference. |
| **Regression test** | Yes — `handleKeyPress: Ctrl+Z should undo the most recent paint operation` |
| **Verification** | Rapid Ctrl+Z presses after multiple paint strokes produce the correct sequential undo order |
| **Expected improvement** | Keyboard undo/redo is reliably correct under rapid input |

---

### FIX-04 — `changeGridSize` silently forces `showGrid` off without user consent

| Field | Value |
|---|---|
| **Issue ID** | FIX-04 |
| **Category** | UX / Unexpected side effect |
| **Severity** | High |
| **File** | `src/App.jsx` lines 179–195 |
| **Root cause** | `setShowGrid(newSize < 32)` hardcodes preview mode state based on grid size. Switching to 32×32 or larger forces the grid into preview mode silently. The user already confirmed clearing the canvas, but was never told their view mode would also change. |
| **User impact** | After resizing to 32×32+, the user's grid lines disappear and they are placed in preview mode with all tools disabled — a confusing, unexpected state. |
| **Proposed change** | Remove `setShowGrid(newSize < 32)` from `changeGridSize`. Grid line visibility should remain under user control and not be coupled to grid size. The `getGridGap` utility already returns `0` for sizes ≥ 32, so grid lines won't be rendered even if `showGrid` is `true` at large sizes — no visual regression. |
| **Regression test** | Yes — `changeGridSize: should not change showGrid state when resizing` |
| **Verification** | Switch from 16 to 32 while `showGrid = true` → `showGrid` remains `true` after resize |
| **Expected improvement** | Switching grid size no longer disables the user's tools unexpectedly |

---

### FIX-05 — Favicon path is broken

| Field | Value |
|---|---|
| **Issue ID** | FIX-05 |
| **Category** | Correctness / Broken asset |
| **Severity** | Medium-High |
| **File** | `index.html` line 4 |
| **Root cause** | `<link rel="icon" href="./public/logo.png" />`. Vite serves `public/` at the root (`/`). The correct href is `/logo.png`, not `./public/logo.png`. |
| **User impact** | Browser tab shows default blank/browser favicon in production build (Vite dev server may work around it but the production build will not). |
| **Proposed change** | Change `href="./public/logo.png"` → `href="/logo.png"` |
| **Regression test** | Low value — visual/manual check is sufficient |
| **Verification** | Browser tab shows the GridCraft logo after build |
| **Expected improvement** | Correct favicon in production |

---

### FIX-06 — `isSmallScreen` reads `window` at module evaluation time (SSR / test hazard)

| Field | Value |
|---|---|
| **Issue ID** | FIX-06 |
| **Category** | Defensive / Test compatibility |
| **Severity** | Medium |
| **File** | `src/App.jsx` line 42 |
| **Root cause** | `useState(window.innerWidth < 768 || window.innerHeight < 768)` reads `window` synchronously during module evaluation. In jsdom-based test environments this will either throw or silently return 0×0 dimensions, producing misleading `isSmallScreen = true` state in all tests. |
| **User impact** | No runtime user impact in the browser. All unit tests that render `App` will get incorrect `isSmallScreen` state, causing layout-sensitive tests to be unreliable. |
| **Proposed change** | Wrap the `useState` initializer in a function: `useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 || window.innerHeight < 768 : false)`. This makes the initializer lazy and safe in non-browser environments. |
| **Regression test** | Yes — guarded by the test suite setup itself (tests should render without throwing) |
| **Verification** | `App` renders in jsdom without throwing a `window is not defined` error |
| **Expected improvement** | Test suite stability; safe future SSR usage |

---

## B. Medium-Priority Fixes

### FIX-07 — `exportWithFilename` prototype patch leaks on async race

| Field | Value |
|---|---|
| **Issue ID** | FIX-07 |
| **Category** | Code quality / Robustness |
| **Severity** | Medium |
| **File** | `src/Menu.jsx` lines 19–27 |
| **Root cause** | `HTMLAnchorElement.prototype.click` is monkey-patched before calling `downloadImage()` and restored in `finally`. If a concurrent export is triggered (e.g., two rapid button clicks), both coroutines compete to restore the prototype. The second restore may re-install the patched version instead of the native one. The `isExporting` guard in `downloadImage` prevents a second export from starting, but the patch is installed before `isExporting` is checked, so the second call still patches the prototype even though `downloadImage` returns early. |
| **User impact** | Low probability in practice. Rapid double-click on Export would leave a patched `prototype.click` that renames all anchor clicks to the first-entered filename until the page is refreshed. |
| **Proposed change** | Move the prototype patch inside the `try` block, immediately before `await downloadImage()`. Add a `if (isExporting) return` guard at the top of `exportWithFilename` before the `prompt` call, consistent with `downloadImage`'s own guard. |
| **Regression test** | Yes — `exportWithFilename: should not patch prototype if already exporting` |
| **Verification** | Call `exportWithFilename` while `isExporting = true` → prototype is never patched |
| **Expected improvement** | No prototype leak under rapid double-click |

---

### FIX-08 — `toastMessages.js` MutationObserver never disconnected

| Field | Value |
|---|---|
| **Issue ID** | FIX-08 |
| **Category** | Code quality / Memory |
| **Severity** | Low-Medium |
| **File** | `src/toastMessages.js` lines 11–18 |
| **Root cause** | The `MutationObserver` is connected at module load time and never disconnected. For a single-page app that never unloads this is harmless. However it makes the module non-idempotent: if imported twice (e.g., hot-module reload or test isolation), multiple observers stack up. |
| **User impact** | Negligible in production. In test environments with fast HMR cycles, duplicate observers can fire `normalizeToastMessages` multiple times per DOM mutation. |
| **Proposed change** | Export a `disconnect()` function for tests. In tests, call it in `afterEach`. No change needed in production code. |
| **Regression test** | Covered by toast message tests |
| **Verification** | Test suite does not emit warnings about multiple toast normalizations |
| **Expected improvement** | Cleaner test isolation |

---

### FIX-09 — `importImage` ignores canvas `getContext` failure

| Field | Value |
|---|---|
| **Issue ID** | FIX-09 |
| **Category** | Defensive / Error handling |
| **Severity** | Medium |
| **File** | `src/App.jsx` lines 320–374 |
| **Root cause** | `canvas.getContext("2d")` returns `null` if the browser runs out of canvas contexts (per-tab limit: ~300 in Chrome). There is no null-check before calling `ctx.drawImage(...)`. |
| **User impact** | On low-resource devices or after many import cycles, the app throws an uncaught `TypeError: Cannot read properties of null` which crashes the React tree. |
| **Proposed change** | Add `if (!ctx) { showToast("Import failed: canvas unavailable"); return; }` after `getContext("2d")`. |
| **Regression test** | Yes — `importImage: should show error toast when canvas context is null` |
| **Verification** | Mock `getContext` to return null → toast appears, no crash |
| **Expected improvement** | No uncaught crashes during import on resource-constrained clients |

---

### FIX-10 — `package.json` declares `"type": "commonjs"` but project is ESM

| Field | Value |
|---|---|
| **Issue ID** | FIX-10 |
| **Category** | Code quality / Configuration correctness |
| **Severity** | Medium (latent) |
| **File** | `package.json` line 7 |
| **Root cause** | `"type": "commonjs"` is set while all source files use ES module `import`/`export` syntax. Vite handles this transparently today, but the mismatched declaration will confuse any tool that reads `package.json` to determine module format (e.g., Jest, ts-node, Node.js `require` fallback). The test framework we introduce (Vitest) will read this field. |
| **User impact** | No runtime impact currently. Will break Vitest configuration if not corrected before adding tests. |
| **Proposed change** | Change `"type": "commonjs"` → `"type": "module"` in `package.json`. |
| **Regression test** | Implicit — test suite runs successfully after this change |
| **Verification** | `npm run dev` and `npm run build` continue to pass; `npm test` runs Vitest without module errors |
| **Expected improvement** | Correct module declaration; prerequisite for adding Vitest |

---

## C. Issues Intentionally Deferred

| ID | Issue | Reason for Deferral |
|---|---|---|
| DEFER-01 | `ErrorPage` is architecturally unreachable (vercel.json rewrites all to `/`) | Fixing this requires introducing a router library (React Router). Out of scope for this hackathon demo. Document as known constraint. |
| DEFER-02 | `MAX_HISTORY = 15` — every drag stroke creates a separate undo entry | Stroke-batching requires significant state machine refactor. UX improvement but not a correctness bug. |
| DEFER-03 | GitHub API in `Contributors.jsx` has 60 req/hr rate limit | Adding a token requires secrets management setup. Not a correctness or demo-blocking issue. |
| DEFER-04 | Hard-coded `black`/`white` in `tool-btn--active` CSS | Visual-only; does not affect demo correctness. |
| DEFER-05 | Multiple Google Fonts imports in `index.html` (8 fonts, most unused) | Performance improvement, not correctness. |
| DEFER-06 | No Content Security Policy headers | Production hardening concern, not relevant to hackathon demo. |
| DEFER-07 | `floodFill` relies on `gridSize` from closure rather than argument | Current design is safe (called synchronously inside `paintCell`). Refactoring to take `gridSize` as argument is a clean-up, not a bug fix for this context. |
| DEFER-08 | `png` export uses DOM mutation + html2canvas (fragile rendering approach) | Replacing with OffscreenCanvas would be an architectural change. |

---

## D. Testing Strategy

### Framework Selection

**Chosen stack: Vitest + React Testing Library + jsdom**

| Criterion | Decision |
|---|---|
| Module format | Vitest is Vite-native — shares the same config, supports ESM natively, and requires zero transpilation setup |
| React component testing | `@testing-library/react` provides user-centric rendering/interaction testing |
| DOM environment | `jsdom` simulates browser APIs (localStorage, window, document) |
| Mocking | Vitest's built-in `vi.fn()` / `vi.spyOn()` / `vi.mock()` — no separate mock library needed |
| CI integration | Vitest outputs standard TAP/JUnit compatible output |

### New dependencies to add to `package.json` devDependencies

```
vitest
@vitest/coverage-v8
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
jsdom
```

### Test Files to Create

| Test File | Covers |
|---|---|
| `src/utils/floodFill.js` | New file | `floodFill` extracted as pure named export (prerequisite for direct unit testing) |
| `src/__tests__/floodFill.test.js` | Pure function — isolated correctness tests (imports directly from `src/utils/floodFill.js`) |
| `src/__tests__/toggleTheme.test.jsx` | FIX-02 regression + forward correctness |
| `src/__tests__/undoRedo.test.jsx` | FIX-03 regression; undo/redo state transitions |
| `src/__tests__/exportWithFilename.test.jsx` | FIX-01 regression; prototype patch; isExporting guard |
| `src/__tests__/keyboardShortcuts.test.jsx` | All keyboard shortcuts (A/B/C/D/E + Ctrl+Z/Y) |
| `src/__tests__/gridSize.test.jsx` | FIX-04 regression; changeGridSize side effects |
| `src/__tests__/importExport.test.jsx` | importImage, FIX-09 null ctx guard |
| `src/__tests__/browserDefensiveGuards.test.jsx` | FIX-06 window guard; null DOM guards |

### Test Patterns

- **Pure functions** (`floodFill`): Import and test directly without React rendering
- **React state transitions**: Render `App` in isolation, trigger interactions via `userEvent`, assert on rendered output or exposed state
- **Browser API mocking**: Use `vi.spyOn(window, 'confirm')` / `vi.spyOn(window, 'prompt')` to avoid blocking test execution on native dialogs
- **DOM mutation (`toastMessages.js`)**: Call `disconnect()` in `afterEach` for test isolation

### `vitest.config.js` to Create

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
    },
  },
});
```

### Test Coverage Target

Focus on the eight behavioral areas listed. Aim for:
- All 8 fix regressions covered by at least one test each
- `floodFill` covered at boundary conditions (edges, corners, same-color no-op, full-grid fill)
- `undo`/`redo` stack integrity tested through at minimum 3 sequential operations

---

## E. Files Expected to Change

| File | Change Type | Reason |
|---|---|---|
| `src/utils/floodFill.js` | New file | `floodFill` extracted as pure named export — `gridSize` is now an explicit 5th parameter |
| `src/App.jsx` | Refactor + bug fix | `floodFill` import added, inline definition removed; FIX-02, FIX-03, FIX-04, FIX-06, FIX-09 |
| `src/Menu.jsx` | Bug fix | FIX-01 (wire exportWithFilename), FIX-07 (prototype patch guard) |
| `index.html` | Bug fix | FIX-05 (favicon path) |
| `package.json` | Config fix | FIX-10 (type: module), add test dependencies and `"test": "vitest run"` script |
| `vitest.config.js` | New file | Test framework configuration |
| `src/__tests__/setup.js` | New file | Testing Library matchers setup |
| `src/__tests__/floodFill.test.js` | New file | Pure function tests — imports directly from `src/utils/floodFill.js` |
| `src/__tests__/toggleTheme.test.jsx` | New file | FIX-02 regression |
| `src/__tests__/undoRedo.test.jsx` | New file | FIX-03 regression + state transitions |
| `src/__tests__/exportWithFilename.test.jsx` | New file | FIX-01 + FIX-07 regression |
| `src/__tests__/keyboardShortcuts.test.jsx` | New file | Keyboard shortcut behavior |
| `src/__tests__/gridSize.test.jsx` | New file | FIX-04 regression |
| `src/__tests__/importExport.test.jsx` | New file | FIX-09 regression + import behavior |
| `src/__tests__/browserDefensiveGuards.test.jsx` | New file | FIX-06 regression |
| `src/toastMessages.js` | Minor | Export `disconnect()` for test cleanup (FIX-08) |

**Files NOT changed**: `Grid.jsx`, `Tools.jsx`, `Header.jsx`, `Footer.jsx`, `ErrorPage.jsx`, `Contributors.jsx`, `index.css`, `vite.config.js`, `vercel.json`

---

## F. Verification Strategy

### Per-fix verification

Each fix is verified by:
1. The corresponding automated regression test passes (green)
2. Manual smoke test in browser confirms user-visible behavior

### End-to-end smoke test checklist (manual, post-implementation)

| Test | Expected Result |
|---|---|
| Click Export → filename prompt appears → type "myart" → file downloads as `myart.png` | ✅ FIX-01 |
| Click theme toggle once → theme changes immediately | ✅ FIX-02 |
| Paint 3 cells → press Ctrl+Z three times → all three cells clear | ✅ FIX-03 |
| Set showGrid=true, switch from 16 to 32 → showGrid remains true, tools remain active | ✅ FIX-04 |
| Check browser tab → GridCraft logo favicon visible | ✅ FIX-05 |
| `npm test` runs all tests without `window is not defined` error | ✅ FIX-06 |

### CI validation

```
npm test         # Vitest runs all tests
npm run build    # Vite build still succeeds
```

---

## G. BEFORE Metrics (Baseline — Do Not Modify)

These are the measurable baseline values observed before any fixes are applied.

| Metric | Before Value |
|---|---|
| Automated test count | 0 |
| Test pass rate | N/A (no tests) |
| Code coverage | 0% |
| Known correctness bugs | 4 (FIX-01, FIX-02, FIX-03, FIX-04) |
| Known defensive/safety issues | 3 (FIX-05, FIX-06, FIX-09) |
| Configuration errors | 1 (FIX-10: `"type": "commonjs"`) |
| `npm test` exit code | 1 (intentional stub) |
| `toggleTheme` works on first click | ❌ No |
| Export filename prompt appears | ❌ No |
| `changeGridSize` preserves `showGrid` | ❌ No |
| Favicon visible in production | ❌ No |
| `handleKeyPress` dep array includes `undo`/`redo` | ❌ No |
| `importImage` null-checks canvas context | ❌ No |
| `isSmallScreen` safe in non-browser environment | ❌ No |

---

## H. Expected AFTER Metrics

| Metric | Expected After Value |
|---|---|
| Automated test count | ≥ 30 (across 8 test files) |
| Test pass rate | 100% |
| Code coverage (targeted files) | ≥ 60% line coverage on App.jsx, Menu.jsx |
| Known correctness bugs remaining | 0 (all 4 fixed) |
| Known defensive/safety issues remaining | 0 (all 3 fixed) |
| Configuration errors remaining | 0 |
| `npm test` exit code | 0 |
| `toggleTheme` works on first click | ✅ Yes |
| Export filename prompt appears | ✅ Yes |
| `changeGridSize` preserves `showGrid` | ✅ Yes |
| Favicon visible in production | ✅ Yes |
| `handleKeyPress` dep array includes `undo`/`redo` | ✅ Yes |
| `importImage` null-checks canvas context | ✅ Yes |
| `isSmallScreen` safe in non-browser environment | ✅ Yes |

---

## Sub-Tasks for Implementation

Each sub-task below is designed to be executed independently by IBM Bob agent mode.

---

### Sub-Task 1 — Install test framework and configure Vitest
**Status**: `[ ] pending`

**Intent**: Establish the test infrastructure so all subsequent sub-tasks can add passing tests.

**Expected Outcomes**:
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` installed
- `vitest.config.js` created
- `src/__tests__/setup.js` created
- `package.json` updated: `"type": "module"`, test script added
- `npm test` runs (even with 0 tests) without errors

**Todo List**:
1. Change `"type": "commonjs"` to `"type": "module"` in `package.json`
2. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8` to devDependencies in `package.json`
3. Add `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` to scripts in `package.json`
4. Create `vitest.config.js` with jsdom environment, globals, and setupFiles
5. Create `src/__tests__/setup.js` importing `@testing-library/jest-dom`
6. Run `npm install` to install new dependencies
7. Run `npm test` to confirm zero-test run exits cleanly

**Relevant Context**: `package.json`, `vite.config.js`. FIX-10 is applied here.

---

### Sub-Task 2 — Apply source code bug fixes (FIX-01 through FIX-09)
**Status**: `[ ] pending`

**Intent**: Apply all high and medium priority bug fixes to source files.

**Expected Outcomes**:
- `toggleTheme` applies correct class on first click (FIX-02)
- `handleKeyPress` dependency array includes `undo` and `redo` (FIX-03)
- `changeGridSize` no longer calls `setShowGrid` (FIX-04)
- Export button in `Menu.jsx` calls `exportWithFilename` (FIX-01)
- `exportWithFilename` has isExporting guard before prompt (FIX-07)
- Favicon path corrected in `index.html` (FIX-05)
- `isSmallScreen` useState initializer is lazy (FIX-06)
- `importImage` null-checks canvas context (FIX-09)
- `toastMessages.js` exports a `disconnect()` function (FIX-08)

**Todo List**:
1. `App.jsx` FIX-02: change `prev` → `!prev` in `classList.toggle`
2. `App.jsx` FIX-03: add `undo, redo` to `useCallback` dependency array for `handleKeyPress`
3. `App.jsx` FIX-04: remove `setShowGrid(newSize < 32)` from `changeGridSize`
4. `App.jsx` FIX-06: wrap `isSmallScreen` useState initializer in a function with `typeof window !== 'undefined'` guard
5. `App.jsx` FIX-09: add `if (!ctx) { showToast("Import failed: canvas unavailable"); return; }` after `getContext("2d")`
6. `Menu.jsx` FIX-01: change Export button onClick to call `exportWithFilename()` instead of `downloadImage()`
7. `Menu.jsx` FIX-07: add `if (isExporting) return` guard at top of `exportWithFilename`, move prototype patch inside try block
8. `index.html` FIX-05: change favicon href from `./public/logo.png` to `/logo.png`
9. `toastMessages.js` FIX-08: export `disconnect()` function that calls `observer.disconnect()`
10. Verify `npm run build` succeeds after all changes

**Relevant Context**: See fix details in Sections A and B above.

---

### Sub-Task 3 — Write regression tests for all applied fixes
**Status**: `[ ] pending`

**Intent**: Create automated tests that prove each fix is correct and will catch future regressions.

**Expected Outcomes**:
- 8 test files created (see Section D)
- All tests pass (`npm test` exits 0)
- `floodFill` has boundary condition tests
- Each bug fix has at least one dedicated regression test

**Todo List**:
1. Create `src/__tests__/floodFill.test.js` — test pure function: basic fill, same-color no-op, edge cells, corner cells, full grid
2. Create `src/__tests__/toggleTheme.test.jsx` — test FIX-02: first click adds `light-theme`, second click removes it
3. Create `src/__tests__/undoRedo.test.jsx` — test FIX-03: keyboard undo/redo after multiple paints; state stack integrity
4. Create `src/__tests__/exportWithFilename.test.jsx` — test FIX-01: prompt called; FIX-07: no patch when isExporting
5. Create `src/__tests__/keyboardShortcuts.test.jsx` — test all shortcuts: A/B/C/D/E in paint mode, blocked in preview
6. Create `src/__tests__/gridSize.test.jsx` — test FIX-04: `showGrid` unchanged after resize
7. Create `src/__tests__/importExport.test.jsx` — test FIX-09: null ctx shows toast, valid import updates cells
8. Create `src/__tests__/browserDefensiveGuards.test.jsx` — test FIX-06: App renders without `window` errors
9. Run `npm test` — confirm all tests pass
10. Run `npm run test:coverage` — confirm ≥ 60% coverage on App.jsx and Menu.jsx

**Relevant Context**: See Testing Strategy in Section D. Mock `window.confirm`, `window.prompt`, `HTMLCanvasElement.prototype.getContext` using `vi.spyOn`.

---

### Sub-Task 4 — Final validation and before/after metrics capture
**Status**: `[ ] pending`

**Intent**: Confirm the full before/after story is measurable and documented for the hackathon demo.

**Expected Outcomes**:
- `npm test` passes with 0 failures
- `npm run build` succeeds
- Before/after metric table updated in this plan with actual measured values
- Manual smoke test checklist in Section F completed

**Todo List**:
1. Run `npm test` and record actual test count and pass rate
2. Run `npm run test:coverage` and record actual coverage percentages
3. Run `npm run build` and confirm exit 0
4. Manually verify each item in the Section F smoke test checklist in the browser
5. Update the "Expected After" column in Section H with actual measured values
6. Note any deferred issues that were discovered during implementation in Section C

**Relevant Context**: Section F (Verification Strategy), Section G (Before Metrics), Section H (Expected After Metrics).
