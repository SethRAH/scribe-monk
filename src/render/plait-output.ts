/** Composes the plait grid + page decorations into the two output formats. */
import { pageDecorations, plaitCaption } from '../core/decorations.ts';
import { scaleTranslate } from '../core/draw.ts';
import { layout, type Layout } from '../core/page.ts';
import { gridSize, plaitShapes } from '../core/plait.ts';
import { plaitParams, plaitStyle, type Settings } from '../core/settings.ts';
import { drawPdf, type PdfSink } from './pdf.ts';
import { svgDocument } from './svg.ts';

/** Stroke allowance around the grid in the SVG view box, mm. */
const SVG_PAD = 0.25;

export function plaitLayout(s: Settings): Layout {
  const { gw, gh } = gridSize(plaitParams(s));
  return layout(s, gw, gh);
}

/** The grid alone as SVG: true size for a file, or fluid for the preview. */
export function plaitSvg(s: Settings, sizing: 'file' | 'fluid'): string {
  const { gw, gh } = gridSize(plaitParams(s));
  return svgDocument(plaitShapes(plaitParams(s), plaitStyle(s)), {
    viewBox: [-SVG_PAD, -SVG_PAD, gw + 2 * SVG_PAD, gh + 2 * SVG_PAD],
    sizing,
    background: [0, 0, gw, gh],
  });
}

export interface PdfDocOptions {
  unit: 'mm';
  format: number[];
  orientation: 'portrait' | 'landscape';
}

/** Draw the full page (grid placed per layout + caption + check bar) into a new document from `create`. */
export function plaitPdf<D extends PdfSink>(s: Settings, create: (opts: PdfDocOptions) => D): D {
  const L = plaitLayout(s);
  const doc = create({ unit: 'mm', format: [L.pw, L.ph].sort((x, y) => x - y), orientation: L.orient });
  const p = plaitParams(s);
  drawPdf(doc, plaitShapes(p, plaitStyle(s)), scaleTranslate(L.scale, L.ox, L.oy));
  drawPdf(doc, pageDecorations(L, s.unit, plaitCaption(p, s.unit, L.scale)));
  return doc;
}
