/** PDF backend for the display list (jsPDF, or anything with the same subset of its API). */
import { IDENTITY, transformShape, type Shape, type Transform } from '../core/draw.ts';

/** The subset of jsPDF this backend uses (lets tests pass a recorder). */
export interface PdfSink {
  setFillColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setLineWidth(w: number): unknown;
  setLineJoin(join: string): unknown;
  setLineDashPattern(dash: number[], phase: number): unknown;
  setFontSize(size: number): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  curveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): unknown;
  close(): unknown;
  stroke(): unknown;
  fill(): unknown;
  fillStroke(): unknown;
  text(text: string, x: number, y: number): unknown;
}

/** Draw shapes onto the current page. Coordinates are page mm after `t`; widths are page mm. */
export function drawPdf(doc: PdfSink, shapes: readonly Shape[], t: Transform = IDENTITY): void {
  for (const s0 of shapes) {
    const s = transformShape(s0, t);
    if (s.kind === 'text') {
      doc.setTextColor(...s.color);
      doc.setFontSize(s.size);
      doc.text(s.text, s.x, s.y);
      continue;
    }
    const { fill, stroke, width, dash, join } = s.style;
    if (!fill && !stroke) continue;
    if (fill) doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(width);
      doc.setLineJoin(join ?? 'miter');
      doc.setLineDashPattern(dash ? [...dash] : [], 0);
    }
    for (const g of s.segs) {
      if (g.op === 'M') doc.moveTo(g.x, g.y);
      else if (g.op === 'L') doc.lineTo(g.x, g.y);
      else if (g.op === 'C') doc.curveTo(g.x1, g.y1, g.x2, g.y2, g.x, g.y);
      else doc.close();
    }
    if (fill && stroke) doc.fillStroke();
    else if (fill) doc.fill();
    else doc.stroke();
  }
}
