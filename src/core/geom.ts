/** A 2-D point in mm. */
export type Pt = [number, number];
export type Polygon = Pt[];

/** Twice the signed area of a polygon (shoelace sum). */
export function signedArea2(poly: readonly Pt[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area;
}

type Inside = (p: Pt) => boolean;
type Cut = (a: Pt, b: Pt) => Pt;

/**
 * Clip a polygon to the axis-aligned rectangle [x0,x1]×[y0,y1]
 * (Sutherland–Hodgman). Returns [] for empty results and for slivers
 * whose |2·area| ≤ 1e-6.
 */
export function clipRect(poly: Polygon, x0: number, y0: number, x1: number, y1: number): Polygon {
  const edges: [Inside, Cut][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const inp = out;
    out = [];
    if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i]!;
      const prev = inp[(i + inp.length - 1) % inp.length]!;
      const ci = inside(cur);
      const pi = inside(prev);
      if (ci) {
        if (!pi) out.push(cut(prev, cur));
        out.push(cur);
      } else if (pi) out.push(cut(prev, cur));
    }
  }
  // drop slivers
  return Math.abs(signedArea2(out)) > 1e-6 ? out : [];
}
