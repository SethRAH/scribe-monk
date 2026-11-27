import { checkBarLength, pageDecorations, plaitCaption } from '../src/core/decorations.ts';
import type { PathShape } from '../src/core/draw.ts';
import { FOOTER, layout, MARGIN, PAPERS } from '../src/core/page.ts';
import { DEFAULTS } from '../src/core/settings.ts';
import { plaitPdf } from '../src/render/plait-output.ts';
import { normPdf, recorder } from './normalize.ts';

const page = { paper: 'letter', orient: 'auto', fit: false } as const;

describe('layout', () => {
  it('auto orientation: wider than tall → landscape, otherwise portrait', () => {
    expect(layout(page, 160, 100).orient).toBe('landscape');
    expect(layout(page, 100, 160).orient).toBe('portrait');
    expect(layout(page, 100, 100).orient).toBe('portrait');
    const L = layout(page, 160, 100);
    expect([L.pw, L.ph]).toEqual([279.4, 215.9]);
  });

  it('explicit orientation wins', () => {
    expect(layout({ ...page, orient: 'portrait' }, 160, 100).orient).toBe('portrait');
    expect(layout({ ...page, orient: 'landscape' }, 10, 100).orient).toBe('landscape');
  });

  it('printable area = page − margins − footer', () => {
    for (const paper of Object.keys(PAPERS) as (keyof typeof PAPERS)[]) {
      const L = layout({ ...page, paper, orient: 'portrait' }, 10, 10);
      const [w, h] = PAPERS[paper];
      expect(L.availW).toBeCloseTo(w - 2 * MARGIN, 12);
      expect(L.availH).toBeCloseTo(h - 2 * MARGIN - FOOTER, 12);
    }
  });

  it('tooBig only when the grid exceeds the printable area', () => {
    const L = layout({ ...page, orient: 'portrait' }, 10, 10);
    expect(layout({ ...page, orient: 'portrait' }, L.availW, L.availH).tooBig).toBe(false);
    expect(layout({ ...page, orient: 'portrait' }, L.availW + 0.01, 10).tooBig).toBe(true);
    expect(layout({ ...page, orient: 'portrait' }, 10, L.availH + 0.01).tooBig).toBe(true);
  });

  it('no scaling unless fit is on; fit scales to the tighter dimension and centres', () => {
    expect(layout(page, 400, 300).scale).toBe(1);
    const L = layout({ ...page, fit: true }, 400, 300);
    expect(L.scale).toBeCloseTo(Math.min(L.availW / 400, L.availH / 300), 12);
    expect(L.dw).toBeLessThanOrEqual(L.availW + 1e-9);
    expect(L.dh).toBeLessThanOrEqual(L.availH + 1e-9);
    expect(Math.max(L.dw / L.availW, L.dh / L.availH)).toBeCloseTo(1, 12);
    expect(L.ox).toBeCloseTo((L.pw - L.dw) / 2, 12);
    expect(L.oy).toBeGreaterThanOrEqual(MARGIN);
  });

  it('fit never scales up a grid that already fits', () => {
    expect(layout({ ...page, fit: true }, 50, 50).scale).toBe(1);
  });
});

describe('page decorations', () => {
  it('check bar is 50 mm or 2 in, never scaled', () => {
    expect(checkBarLength('mm')).toBe(50);
    expect(checkBarLength('in')).toBeCloseTo(50.8, 12);
    for (const fit of [false, true]) {
      const L = layout({ ...page, fit }, 1000, 1000);
      const bar = pageDecorations(L, 'in', 'x').find((s): s is PathShape => s.kind === 'path')!;
      const [m, l] = bar.segs;
      expect(m!.op === 'M' && l!.op === 'L' && l!.x - m!.x).toBeCloseTo(50.8, 12);
      expect(bar.style.width).toBe(0.3);
    }
  });

  it('check bar in the PDF stays true size when the grid is scaled to fit', () => {
    const s = { ...DEFAULTS, unit: 'mm' as const, cols: 40, rows: 40, fit: true };
    const rec = recorder();
    plaitPdf(s, (opts) => (rec.calls.push(['new', opts]), rec as never));
    const subs = normPdf(rec.calls).drawn.filter((d) => d.kind === 'sub');
    const bar = subs.filter((d) => d.stroke?.[0] === 40)[0]!;
    expect(bar.pts[1]![0] - bar.pts[0]![0]).toBe(50);
  });

  it('caption notes scaling', () => {
    const p = { tw: 20, th: 20, cols: 8, rows: 5, cord: 6 };
    expect(plaitCaption(p, 'mm', 1)).not.toMatch(/SCALED/);
    expect(plaitCaption(p, 'mm', 0.5)).toMatch(/SCALED TO 50\.0%/);
  });
});
