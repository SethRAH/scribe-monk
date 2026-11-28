# Scribe Monk

Printable guides for scribes: tools for calligraphy and illumination that run
in the browser and print at true size.

**Live site: https://sethrah.github.io/scribe-monk/**

## The plait grid

The first tool lays out the construction grid for a Celtic plait (the
interlaced knotwork band you then break and decorate by hand). Pick a tile
size, how many tiles across and down, and the cord thickness; the tool draws
the shaded gaps between the cords, optional dashed tile lines, and a caption
with the settings.

1. Choose **mm** or **inches** (defaults: inches, Letter paper).
2. Set the tile width/height, tiles across/down, and cord thickness.
3. Choose the gap shading, outline and tile-line options.
4. Pick paper size and orientation; optionally scale down to fit if the grid
   is too big for the page.
5. **Download PDF** (to print) or **Download SVG** (to edit in a vector app).

Your settings are remembered in this browser.

### Printing: use 100% / "Actual size"

Print the PDF at **100% / "Actual size"** — turn off "Fit to page", "Shrink
oversized pages" or similar in the print dialog, or every measurement on the
page will be off. Each page has a check bar (2 in, or 50 mm in mm mode) along
the bottom: measure it with a ruler after printing to confirm the scale. If
you ticked "Scale down to fit", the grid is scaled but the check bar is not,
and the caption says so.

## Local development

Needs Node 24 (see `.nvmrc`; `package.json` accepts `^22.12 || ^24 || >=26`).

```sh
npm install        # or `npm ci` for a clean install from the lockfile
npm run dev        # dev server (npm run dev:host to open it from another device)
npm test           # unit + parity tests (npm run test:watch to watch)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build to dist/
npm run preview    # serve the built dist/ locally
```

## Deploys

Every pull request runs `.github/workflows/ci.yml` (test, build). Every push
to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes `dist/` to GitHub Pages via GitHub Actions. The site is served from
`/scribe-monk/` (set in `vite.config.ts`; override with `BASE_PATH` for a host
that serves from the root).

## Roadmap

Next is a **folio page**: place several plaits and other blocks on one page,
starting with ruling lines for lettering. See
[`dev-log/`](dev-log/) for decisions so far.

## Licence

[MIT](LICENSE)
