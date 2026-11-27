/**
 * Page decorations: the caption and the true-size check bar. These are drawn
 * in page mm and are never scaled, so a scaled-to-fit print can be detected.
 */
import { gray, lineSegs, type Shape } from './draw.ts';
import type { Layout } from './page.ts';
import { MARGIN } from './page.ts';
import type { PlaitParams } from './plait.ts';
import { fmt, fmtU, MM_PER_IN, type Unit } from './units.ts';

export const CAPTION_SIZE = 8; // pt
export const CAPTION_COLOR = gray(90);
export const CHECK_BAR_COLOR = gray(40);

/** Check bar length in mm: 2 in or 50 mm. */
export const checkBarLength = (unit: Unit): number => (unit === 'in' ? 2 * MM_PER_IN : 50);

export function plaitCaption(p: PlaitParams, unit: Unit, scale: number): string {
  return (
    `Plait grid  ·  tiles ${fmtU(p.tw, unit)} × ${fmtU(p.th, unit)}  ·  ${p.cols} × ${p.rows} tiles  ·  cord ${fmtU(p.cord, unit)}` +
    (scale < 1 ? `  ·  SCALED TO ${(scale * 100).toFixed(1)}%` : '')
  );
}

export function plaitFilename(p: PlaitParams, unit: Unit, ext: string): string {
  return `plait-grid-${p.cols}x${p.rows}-${fmt(p.tw, unit)}x${fmt(p.th, unit)}${unit}-cord${fmt(p.cord, unit)}.${ext}`;
}

/** Caption + check bar along the bottom margin, in page mm. */
export function pageDecorations(L: Layout, unit: Unit, caption: string): Shape[] {
  const by = L.ph - MARGIN - 3;
  const bar = checkBarLength(unit);
  return [
    { kind: 'text', x: MARGIN, y: by - 5, text: caption, size: CAPTION_SIZE, color: CAPTION_COLOR },
    {
      kind: 'path',
      segs: lineSegs([
        [MARGIN, by, MARGIN + bar, by],
        [MARGIN, by - 1.5, MARGIN, by + 1.5],
        [MARGIN + bar, by - 1.5, MARGIN + bar, by + 1.5],
      ]),
      style: { fill: null, stroke: CHECK_BAR_COLOR, width: 0.3 },
    },
    {
      kind: 'text',
      x: MARGIN + bar + 3,
      y: by + 1,
      text: unit === 'in' ? '2 in check bar (print at 100%)' : '50 mm check bar (print at 100%)',
      size: CAPTION_SIZE,
      color: CAPTION_COLOR,
    },
  ];
}
