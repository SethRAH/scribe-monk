/**
 * Parity with the prototype. tests/fixtures/prototype-golden.json was
 * generated once by scripts/gen-fixtures.mjs from the prototype's own code
 * (prototype/Celtic Plait Grid.html), never from the new code.
 */
import { readFileSync } from 'node:fs';
import { buildGaps, maxCord } from '../src/core/plait.ts';
import { parseSettings, serializeSettings, type Settings } from '../src/core/settings.ts';
import { plaitLayout, plaitPdf, plaitSvg } from '../src/render/plait-output.ts';
import { mismatch, normPdf, normSvg, recorder } from './normalize.ts';

interface Case {
  settings: Settings;
  gaps: [number, number][][];
  layout: Record<string, unknown>;
  svgFile: string;
  svgPreview: string;
  pdfCalls: [string, ...unknown[]][];
}
interface Summary {
  settings: Settings;
  count: number;
  vertices: number;
  sumX: number;
  sumY: number;
  first: [number, number][][];
  last: [number, number][][];
  layout: Record<string, unknown>;
}
const golden = JSON.parse(readFileSync(new URL('./fixtures/prototype-golden.json', import.meta.url), 'utf8')) as {
  cases: Record<string, Case>;
  summaries: Record<string, Summary>;
};

const EPS = 1e-9;
/** The prototype's settings, passed through our storage validation (proves they're all accepted unchanged). */
const settingsOf = (c: { settings: Settings }): Settings => {
  const s = parseSettings(serializeSettings(c.settings));
  expect(s).toEqual(c.settings);
  return s;
};

const cases = Object.entries(golden.cases);

it('fixtures cover the required configs', () => {
  expect(cases.length).toBeGreaterThanOrEqual(10);
  const S = cases.map(([, c]) => c.settings);
  expect(S.some((s) => s.tw !== s.th)).toBe(true);
  expect(S.some((s) => s.cord === 0)).toBe(true);
  expect(S.some((s) => s.cord / maxCord(s.tw, s.th) > 0.999 && s.cord < maxCord(s.tw, s.th))).toBe(true);
  expect(S.some((s) => s.cols === 1 && s.rows === 1)).toBe(true);
  expect(Object.values(golden.summaries).some((s) => s.settings.cols === 200 && s.settings.rows === 200)).toBe(true);
});

describe.each(cases)('%s', (_name, c) => {
  const s = settingsOf(c);

  it('gap vertices match within 1e-9, same order', () => {
    expect(mismatch(buildGaps(s), c.gaps, EPS)).toBeNull();
  });

  it('page layout matches', () => {
    expect(mismatch({ ...plaitLayout(s) }, c.layout, EPS)).toBeNull();
  });

  it.each(['file', 'fluid'] as const)('SVG (%s) draws the same elements in the same order and styles', (sizing) => {
    const ours = normSvg(plaitSvg(s, sizing));
    const proto = normSvg(sizing === 'file' ? c.svgFile : c.svgPreview);
    expect(ours.root).toEqual(proto.root);
    // SVG coordinates are rounded to 3 dp by both; allow that rounding.
    expect(mismatch(ours.drawn, proto.drawn, 1e-3)).toBeNull();
  });

  it('SVG gap path data is byte-identical', () => {
    const gapPath = (svg: string) => /<path d="([^"]*)" fill="[^"]*" stroke="(?:#222|#222222|none)"/.exec(svg)?.[1] ?? '';
    const proto = gapPath(c.svgFile);
    const visible = s.shade !== 'none' || s.outline;
    expect(gapPath(plaitSvg(s, 'file'))).toBe(visible ? proto : '');
  });

  it('PDF draws the same primitives, styles and text', () => {
    const rec = recorder();
    plaitPdf(s, (opts) => (rec.calls.push(['new', opts]), rec as never));
    const ours = normPdf(rec.calls);
    const proto = normPdf(c.pdfCalls);
    expect(ours.opts).toEqual(proto.opts);
    expect(mismatch(ours.drawn, proto.drawn, EPS)).toBeNull();
  });
});

describe.each(Object.entries(golden.summaries))('%s (summary)', (_name, g) => {
  const s = settingsOf(g);
  it('gap count, vertex sums and ends match', () => {
    const gaps = buildGaps(s);
    expect(gaps.length).toBe(g.count);
    let sx = 0,
      sy = 0,
      nv = 0;
    for (const p of gaps) for (const [x, y] of p) (sx += x), (sy += y), nv++;
    expect(nv).toBe(g.vertices);
    expect(sx).toBeCloseTo(g.sumX, 6);
    expect(sy).toBeCloseTo(g.sumY, 6);
    expect(mismatch(gaps.slice(0, 20), g.first, EPS)).toBeNull();
    expect(mismatch(gaps.slice(-20), g.last, EPS)).toBeNull();
    expect(mismatch({ ...plaitLayout(s) }, g.layout, EPS)).toBeNull();
  });
});
