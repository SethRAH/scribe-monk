# Scribe Monk

A static site of printable guides for scribes (calligraphy / illumination).
The first and only tool so far is the **Celtic plait grid**, ported from a
single-file Claude-artifact prototype (`prototype/Celtic Plait Grid.html`).
Live at https://sethrah.github.io/scribe-monk/. Next goal: a "folio page"
that places several blocks (plaits, then ruling lines for lettering) on one
page — see `dev-log/`.

## Stack

- **Vite + TypeScript**, vanilla DOM, no framework.
- **Vitest** for tests (Node environment).
- **jsPDF** from npm, **lazily imported** (`await import('jspdf')` in
  `src/ui/plait-app.ts`) only when the user clicks Download PDF. Keep it out
  of the initial bundle.
- Node 24 (`.nvmrc`, which CI reads; `engines` allows `^22.12 || ^24 || >=26`,
  Vitest's range). Package manager: npm.
- Strict TypeScript, including `noUncheckedIndexedAccess`.

## Commands

- `npm run dev` — dev server. `npm run dev:host` — expose on the LAN.
- `npm test` / `npm run test:watch` — tests.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — typecheck + production build to `dist/`.
- `npm run preview` — serve `dist/`.
- `npm run fixtures` — regenerate parity fixtures from the prototype (rarely; see Tests).

## Architecture

All geometry is in **millimetres**; inches are a display unit only (`src/core/units.ts`).

- **`src/core/`** — pure logic. **No DOM, no storage, no jsPDF.** Runs in plain Node.
  - `plait.ts` — `PlaitParams` → `maxCord`, `gridSize`, `buildGaps`, `plaitShapes`.
  - `geom.ts` — points/polygons, `clipRect` (Sutherland–Hodgman), area.
  - `page.ts` — paper presets, margins, `layout()` (orientation, too-big, scale-to-fit).
  - `decorations.ts` — caption + true-size check bar, drawn in page mm, never scaled.
  - `settings.ts` — `Settings`, `DEFAULTS` (inches + Letter), validation.
  - `draw.ts` — the drawing IR (below) and transforms.
- **`src/render/`** — backends that consume the IR: `svg.ts`, `pdf.ts` (written
  against a `PdfSink` subset of jsPDF, so tests can pass a recorder), and
  `plait-output.ts`, which composes plait + decorations into SVG / PDF output.
- **`src/ui/`** — the only layer that touches the DOM: `plait-app.ts` (form wiring),
  `storage.ts` (localStorage), `download.ts` (Blob + `<a download>`). Entry: `src/main.ts`.

### Drawing IR (`src/core/draw.ts`)

Generators return `Shape[]` in their own local mm space:

- `PathShape` — segments `M` / `L` / `C` / `Z` plus a style (fill, stroke, width, dash, join).
- `TextShape` — baseline point, text, size in pt, colour.

Renderers take `Shape[]` plus an affine `Transform` and apply it to the **points**
in JS, so stroke widths, dashes and font sizes stay in page mm at any scale (and
under rotation, with no jsPDF matrix). This is the seam for the folio: a page is
"for each block: generator → transform → backend". Add new block types as new
generators; don't add shape kinds without a reason.

## Tests

- `tests/parity.test.ts` — compares our output with
  `tests/fixtures/prototype-golden.json`: gap vertices within 1e-9 in the same
  order, page layout, byte-identical SVG gap paths, and the same PDF primitives,
  styles and text (`tests/normalize.ts` puts both into a neutral form).
- `tests/properties.test.ts` — seeded property tests (gaps inside the grid, clear
  of cords, none when cord ≥ max, mm↔in round trip).
- `tests/layout.test.ts`, `tests/settings.test.ts`, `tests/draw.test.ts` — layout
  math, settings validation, the IR/transform seam.

**Golden fixtures** were generated once by `scripts/gen-fixtures.mjs`, which lifts
the prototype's own script out of the HTML and runs it. The prototype is the
reference: **never regenerate fixtures from the new code, and never regenerate them
to make a failing parity test pass.** Rerun `npm run fixtures` only when the list
of configs in that script changes; existing cases should come out identical, so
check the diff. An intended behaviour change is a deliberate, reviewed change to
the test, not a fixture refresh.

## Saved settings

localStorage key **`scribe-monk:plait:v1`** (schema v1). Namespaced because the
`sethrah.github.io` origin is shared with other projects. `parseSettings` validates
field by field and falls back to defaults for anything invalid. A breaking schema
change needs a new key/version, not a silent reinterpretation of v1.

## CI and deploy

- `.github/workflows/ci.yml` — every pull request and push to `main`: `npm ci`,
  `npm audit --audit-level=high`, `npm test`, `npm run build`.
- `.github/workflows/deploy.yml` — push to `main` (or a manual run): test, build,
  publish `dist/` to GitHub Pages via `actions/deploy-pages`. Least-privilege
  permissions; only the deploy job can write to Pages.
- `.github/dependabot.yml` — weekly npm and GitHub Actions updates; minor +
  patch grouped into one PR per ecosystem, majors as separate PRs.
- Vite `base` is `/scribe-monk/` (override with `BASE_PATH`).

## Docs

- `README.md` — what it is, how to print (100% / Actual size), dev commands.
- `dev-log/` — dated decision log, one file per entry (see `dev-log/README.md`).
- `prototype/` — kept as the parity reference for now; to be removed in a
  follow-up once parity is signed off. Don't edit it.
