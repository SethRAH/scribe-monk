# 2026-11-27 — From prototype to static site

## Where it started

Scribe Monk began as a single self-contained HTML file exported from a Claude
artifact: `prototype/Celtic Plait Grid.html`. It is a vanilla-JS form that
draws a Celtic plait construction grid (cords along lines joining tile-edge
midpoints, gaps as clipped rhombi), shows a live SVG preview, and downloads
SVG or a true-size PDF (jsPDF from a CDN). State lived in a closure and in
localStorage under `plaitGrid`.

It was imported verbatim as the first commit on `main` so the port has a
diffable baseline. PR #1 ports it to Vite + TypeScript with CI and a GitHub
Pages deploy.

## Owner decisions

- **Vite + TypeScript, like block-game**: the same house stack (Vitest,
  Node 22, `ci.yml` + `deploy.yml`), so tooling and habits carry over.
- **Inches + Letter** as defaults, with round inch sizes (0.75 in tiles,
  0.25 in cord).
- **Public repo** `SethRAH/scribe-monk`, so GitHub Pages is free.
- **MIT** licence.
- Site title **"Scribe Monk"**, with the plait grid as its first tool.
- **No custom domain** for now: https://sethrah.github.io/scribe-monk/.
- **Keep `prototype/`** for now as the parity reference; delete it in a
  follow-up once parity is signed off.

## Parity approach

The port aims for identical output, not a redesign. The prototype keeps its
state in a closure, so it can't be imported. Instead `scripts/gen-fixtures.mjs`
lifts its script out of the HTML verbatim and runs it for a fixed set of
configs (non-square tiles, cord = 0, cord ≈ max, cord over max, 1×1, long
strips, too big with and without fit, every shade/outline combination, plus a
summary of a 200×200 grid) against a recording stand-in for jsPDF, and writes
`tests/fixtures/prototype-golden.json`. That file was generated once and is
committed. `tests/parity.test.ts` checks the new code against it: gap
vertices within 1e-9 in the same order, the page layout, byte-identical SVG
gap path data, and the same PDF primitives, styles and text (via the
recorder). Property, layout and settings tests cover the rest. Rendered PDFs
are still checked by eye before parity is signed off.

## The one intended behaviour change

The prototype saved files through the Claude artifact runtime's download API
(`window.claude.use('downloads')`), which doesn't exist on an ordinary
website. The port uses a Blob and a temporary `<a download>`
(`src/ui/download.ts`). Everything else is meant to behave as before.

Related housekeeping, not a drawing change: saved settings move to a
validated, namespaced key (`scribe-monk:plait:v1`, schema v1), because the
github.io origin is shared with other projects. Nobody had settings saved on
that origin, so nothing is lost.

## Folio vision

The port adds a seam rather than new UI: generators are pure
`params → Shape[]` in their own mm space, and renderers take `Shape[]` plus a
transform, so "one plait centred on a page" is just the simplest page. The
next step is a **folio page** with several blocks placed on one page. The
first new block type after plaits will be **ruling lines for lettering**
(x-height, ascender and descender guides).
