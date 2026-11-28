/** The display-list seam: transforms and the SVG backend, for shapes the plait grid doesn't use yet. */
import { scaleTranslate, transformShape, type PathShape, type Shape, type Transform } from '../src/core/draw.ts';
import { pathData, svgElements } from '../src/render/svg.ts';

const style = { fill: null, stroke: [0, 0, 0] as const, width: 0.25 };

describe('transformShape', () => {
  it('maps C control points and end point in order (x1,y1 → x2,y2 → x,y)', () => {
    // Non-uniform, rotating transform so swapped x/y or swapped points can't coincide.
    const t: Transform = { a: 2, b: 1, c: -1, d: 3, e: 10, f: 20 };
    const s: PathShape = {
      kind: 'path',
      segs: [
        { op: 'M', x: 0, y: 0 },
        { op: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
        { op: 'Z' },
      ],
      style,
    };
    const out = transformShape(s, t) as PathShape;
    expect(out.segs).toEqual([
      { op: 'M', x: 10, y: 20 },
      // (x,y) → (2x − y + 10, x + 3y + 20)
      { op: 'C', x1: 10, y1: 27, x2: 12, y2: 35, x: 14, y: 43 },
      { op: 'Z' },
    ]);
    expect(out.style).toBe(s.style); // widths are not transformed
  });

  it('moves text but keeps its size', () => {
    const s: Shape = { kind: 'text', x: 1, y: 2, text: 'a', size: 8, color: [0, 0, 0] };
    expect(transformShape(s, scaleTranslate(0.5, 10, 20))).toEqual({ ...s, x: 10.5, y: 21 });
  });
});

describe('SVG backend', () => {
  it('writes C segments with control points in order', () => {
    expect(
      pathData([
        { op: 'M', x: 0, y: 0 },
        { op: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5.00049, y: 6 },
      ]),
    ).toBe('M0 0C1 2 3 4 5 6');
  });

  it('escapes text content, including &', () => {
    const svg = svgElements([{ kind: 'text', x: 0, y: 0, text: 'A & B <c> "d" &amp;', size: 72, color: [90, 90, 90] }]);
    expect(svg).toContain('>A &amp; B &lt;c&gt; &quot;d&quot; &amp;amp;</text>');
    expect(svg).toContain('font-size="25.4"');
    expect(svg).toContain('fill="#5a5a5a"');
  });
});
