// Generates tests/fixtures/prototype-golden.json from the prototype itself.
//
// The prototype keeps its state in a closure variable `S`, so it can't be
// imported. This script lifts the prototype's script text (constants,
// formatting, geometry, layout, SVG and PDF code) out of the HTML verbatim,
// swaps the localStorage-backed `S` for one built from each config below, and
// runs it with a recording stand-in for jsPDF. The output is committed; rerun
// with `npm run fixtures` only if the configs change. The prototype is the
// reference: never regenerate these from the new code.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(root + 'prototype/Celtic Plait Grid.html', 'utf8').replace(/\r\n/g, '\n');

const start = html.indexOf('  const MM_PER_IN');
const end = html.indexOf('  // ---------- UI ----------');
if (start < 0 || end < 0) throw new Error('prototype markers not found');
let body = html.slice(start, end);
const stateLine = /let S = Object\.assign\(\{\}, defaults\);\n\s*try \{ const saved[^\n]*\n/;
if (!stateLine.test(body)) throw new Error('prototype state line not found');
body = body.replace(stateLine, 'let S = Object.assign({}, defaults, S_in);\n');

// eslint-disable-next-line no-new-func
const makePrototype = new Function(
  'S_in',
  'window',
  body + '\nreturn { S, buildGaps, layout, svgMarkup, buildPdf, maxCord };',
);

/** Records every jsPDF call the prototype makes. */
class RecordingPdf {
  constructor(opts) {
    this.calls = [['new', opts]];
    return new Proxy(this, {
      get: (t, k) => (k === 'calls' ? t.calls : (...args) => (t.calls.push([k, ...args]), undefined)),
    });
  }
}

const maxCord = (W, H) => 1 / Math.sqrt(1 / (W * W) + 1 / (H * H));

/** name → overrides of the prototype defaults (all lengths in mm). */
const configs = {
  'default-mm': {},
  'default-in': { unit: 'in' },
  'non-square': { tw: 30, th: 15, cols: 6, rows: 4, cord: 4 },
  'tall-tiles-legal': { tw: 12, th: 25, cols: 9, rows: 7, cord: 3.3, paper: 'legal' },
  'cord-zero': { cord: 0 },
  'cord-near-max': { tw: 20, th: 20, cols: 4, rows: 3, cord: maxCord(20, 20) * 0.999 },
  'cord-near-max-nonsquare': { tw: 31.7, th: 13.1, cols: 5, rows: 5, cord: maxCord(31.7, 13.1) * 0.9999 },
  'cord-over-max': { cord: maxCord(20, 20) * 1.01 },
  'one-by-one': { tw: 40, th: 25, cols: 1, rows: 1, cord: 7 },
  'strip-200x1': { tw: 1, th: 1, cols: 200, rows: 1, cord: 0.3 },
  'strip-1x200': { tw: 1, th: 1, cols: 1, rows: 200, cord: 0.3, orient: 'landscape' },
  'too-big-fit-in': { unit: 'in', tw: 25.4, th: 25.4, cols: 12, rows: 9, cord: 6.35, fit: true, paper: 'a4' },
  'too-big-no-fit': { tw: 20, th: 20, cols: 20, rows: 20, cord: 5 },
  'no-fill-outline': { shade: 'none', tiles: false, orient: 'portrait', paper: 'a3' },
  'fill-no-outline-dark': { shade: '165', outline: false, paper: 'tabloid', orient: 'landscape' },
  'invisible-gaps': { shade: 'none', outline: false },
  'light-odd-sizes': { shade: '235', tw: 17.3, th: 9.85, cols: 13, rows: 11, cord: 2.2, fit: true },
};

// 200×200 is too big to store in full (≈80k polygons); keep a summary.
const summaryConfigs = {
  'grid-200x200': { tw: 1, th: 1, cols: 200, rows: 200, cord: 0.25, fit: true },
};

const run = (overrides) => {
  const P = makePrototype(overrides, { jspdf: { jsPDF: RecordingPdf } });
  return P;
};

const out = { generatedFrom: 'prototype/Celtic Plait Grid.html', cases: {}, summaries: {} };
for (const [name, o] of Object.entries(configs)) {
  const P = run(o);
  out.cases[name] = {
    settings: { ...P.S },
    gaps: P.buildGaps(),
    layout: P.layout(),
    svgFile: P.svgMarkup(true),
    svgPreview: P.svgMarkup(false),
    pdfCalls: P.buildPdf().calls,
  };
}
for (const [name, o] of Object.entries(summaryConfigs)) {
  const P = run(o);
  const gaps = P.buildGaps();
  let sx = 0,
    sy = 0,
    nv = 0;
  for (const g of gaps) for (const [x, y] of g) (sx += x), (sy += y), nv++;
  out.summaries[name] = {
    settings: { ...P.S },
    count: gaps.length,
    vertices: nv,
    sumX: sx,
    sumY: sy,
    first: gaps.slice(0, 20),
    last: gaps.slice(-20),
    layout: P.layout(),
  };
}

writeFileSync(root + 'tests/fixtures/prototype-golden.json', JSON.stringify(out) + '\n');
console.log(`wrote ${Object.keys(out.cases).length} cases + ${Object.keys(out.summaries).length} summaries`);
