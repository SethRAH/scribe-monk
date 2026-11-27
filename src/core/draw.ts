/**
 * A tiny display list shared by every renderer (SVG, PDF).
 *
 * Generators return shapes in their own local mm space. Renderers apply a
 * {@link Transform} to the *points* in JS, so stroke widths, dash lengths
 * and font sizes stay in page units whatever the scale.
 */
import type { Pt } from './geom.ts';

export type RGB = readonly [number, number, number];

export type Seg =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

export interface PathStyle {
  /** Fill colour, or null for no fill. */
  fill: RGB | null;
  /** Stroke colour, or null for no stroke. */
  stroke: RGB | null;
  /** Stroke width in page mm (not transformed). */
  width: number;
  /** Dash pattern in page mm (not transformed); omit for solid. */
  dash?: readonly number[];
  join?: 'miter' | 'round' | 'bevel';
}

export interface PathShape {
  kind: 'path';
  segs: Seg[];
  style: PathStyle;
}

export interface TextShape {
  kind: 'text';
  /** Baseline start point. */
  x: number;
  y: number;
  text: string;
  /** Font size in points (not transformed). */
  size: number;
  color: RGB;
}

export type Shape = PathShape | TextShape;

/** Affine transform: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Uniform scale by k, then translate by (ox, oy). */
export const scaleTranslate = (k: number, ox: number, oy: number): Transform => ({ a: k, b: 0, c: 0, d: k, e: ox, f: oy });

export const gray = (g: number): RGB => [g, g, g];

export function applyPt(t: Transform, x: number, y: number): Pt {
  return [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f];
}

export function transformShape(s: Shape, t: Transform): Shape {
  if (s.kind === 'text') {
    const [x, y] = applyPt(t, s.x, s.y);
    return { ...s, x, y };
  }
  const segs = s.segs.map((g): Seg => {
    switch (g.op) {
      case 'Z':
        return g;
      case 'C': {
        const [x1, y1] = applyPt(t, g.x1, g.y1);
        const [x2, y2] = applyPt(t, g.x2, g.y2);
        const [x, y] = applyPt(t, g.x, g.y);
        return { op: 'C', x1, y1, x2, y2, x, y };
      }
      default: {
        const [x, y] = applyPt(t, g.x, g.y);
        return { op: g.op, x, y };
      }
    }
  });
  return { ...s, segs };
}

// ---------- path builders ----------

/** Closed polygon subpaths: M p0 L p1 … Z for each polygon. */
export function polygonSegs(polys: readonly (readonly Pt[])[]): Seg[] {
  const segs: Seg[] = [];
  for (const p of polys) {
    p.forEach(([x, y], i) => segs.push({ op: i ? 'L' : 'M', x, y }));
    if (p.length) segs.push({ op: 'Z' });
  }
  return segs;
}

/** Open two-point subpaths, one per line. */
export function lineSegs(lines: readonly [number, number, number, number][]): Seg[] {
  return lines.flatMap(([x0, y0, x1, y1]): Seg[] => [
    { op: 'M', x: x0, y: y0 },
    { op: 'L', x: x1, y: y1 },
  ]);
}

export function rectSegs(x: number, y: number, w: number, h: number): Seg[] {
  return polygonSegs([
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
  ]);
}
