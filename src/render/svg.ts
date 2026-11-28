/** SVG backend for the display list. */
import { IDENTITY, transformShape, type RGB, type Seg, type Shape, type Transform } from '../core/draw.ts';

/** Round to 3 dp and drop trailing zeros. */
export const r = (n: number): string => (+n.toFixed(3)).toString();

const hex = (c: RGB): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const colour = (c: RGB | null): string => (c ? hex(c) : 'none');

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function pathData(segs: readonly Seg[]): string {
  return segs
    .map((g) => {
      switch (g.op) {
        case 'Z':
          return 'Z';
        case 'C':
          return `C${r(g.x1)} ${r(g.y1)} ${r(g.x2)} ${r(g.y2)} ${r(g.x)} ${r(g.y)}`;
        default:
          return `${g.op}${r(g.x)} ${r(g.y)}`;
      }
    })
    .join('');
}

const PT_TO_MM = 25.4 / 72;

/** SVG elements for shapes; the transform is applied to points, not to stroke widths. */
export function svgElements(shapes: readonly Shape[], t: Transform = IDENTITY): string {
  return shapes
    .map((s0) => {
      const s = transformShape(s0, t);
      if (s.kind === 'text') {
        return `<text x="${r(s.x)}" y="${r(s.y)}" font-family="Helvetica, Arial, sans-serif" font-size="${r(s.size * PT_TO_MM)}" fill="${colour(s.color)}">${esc(s.text)}</text>`;
      }
      const st = s.style;
      let a = `<path d="${pathData(s.segs)}" fill="${colour(st.fill)}" stroke="${colour(st.stroke)}" stroke-width="${r(st.width)}"`;
      if (st.join) a += ` stroke-linejoin="${st.join}"`;
      if (st.dash && st.dash.length) a += ` stroke-dasharray="${st.dash.map(r).join(' ')}"`;
      return a + '/>';
    })
    .join('');
}

export interface SvgOptions {
  /** View box in user units (mm): [x, y, w, h]. */
  viewBox: readonly [number, number, number, number];
  /** 'file': width/height in mm (true size). 'fluid': fill the container. */
  sizing: 'file' | 'fluid';
  /** Optional white backing rectangle [x, y, w, h]. */
  background?: readonly [number, number, number, number];
}

export function svgDocument(shapes: readonly Shape[], opts: SvgOptions, t: Transform = IDENTITY): string {
  const [vx, vy, vw, vh] = opts.viewBox;
  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(vx)} ${r(vy)} ${r(vw)} ${r(vh)}"` +
    (opts.sizing === 'file'
      ? ` width="${r(vw)}mm" height="${r(vh)}mm"`
      : ` preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"`) +
    '>';
  if (opts.background) {
    const [bx, by, bw, bh] = opts.background;
    s += `<rect x="${r(bx)}" y="${r(by)}" width="${r(bw)}" height="${r(bh)}" fill="#fff"/>`;
  }
  return s + svgElements(shapes, t) + '</svg>';
}
