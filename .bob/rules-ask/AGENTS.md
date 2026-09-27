# Project Documentation Context (Non-Obvious Only)

- **`Manual.md` links to a dead URL** (`rohan-shridhar.github.io/gridcraft/`) — the live deployment is on Vercel (`gridcraft-by-me.vercel.app`). Treat the manual as correct for features but not for URLs.
- **The README "Technical Implementation" section is partially outdated**: it says "React 18 (CDN)" and "In-Browser JSX Transpilation via Babel Standalone" — the project now uses React 19 with a Vite build step. CDN/Babel no longer apply.
- **`index.html` meta description says "16x16 grid"** — the app supports 16, 32, 64, and 128. The meta content is stale.
- **`CONTRIBUTING.md` setup instructions say `open index.html` in a browser** — this no longer works; the project requires `npm install && npm run dev` because it uses JSX that must be transpiled by Vite.
- **There are no CI workflow files** — `.github/` contains only issue templates. There is no automated build, lint, or test pipeline.
- **`src/images/`** contains manual screenshot assets referenced by `Manual.md`, not app runtime images. Runtime images (`bg.jpg`, `bg2.jpg`) exist but are not imported by any source file — they are unused.
- **`google53f3f4f7aefc7ea4.html`** is a Google Search Console ownership verification file — it is not part of the app and should not be modified.
