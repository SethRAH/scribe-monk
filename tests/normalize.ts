/**
 * Turn the prototype's output and ours into the same neutral form so they
 * can be compared: a list of drawn primitives, each a subpath of absolute
 * points with the paint state it was drawn with, plus text runs.
 */
export type RGB = [number, number, number];

export interface Prim {
  kind: 'sub';
  pts: [number, number][];
  closed: boolean;
  fill: RGB | null;
  stroke: RGB | null;
  /** Only meaningful when stroked. */
  width: number | null;
  dash: number[];
}
export interface TextPrim {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
  color: RGB;
}
export type Drawn = Prim | TextPrim;

export function parseColour(c: string): RGB | null {
  if (c === 'none') return null;
  let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (m) return [m[1]!, m[2]!, m[3]!].map((h) => parseInt(h + h, 16)) as RGB;
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  if (m) return [m[1]!, m[2]!, m[3]!].map((h) => parseInt(h, 16)) as RGB;
  m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(c.replace(/\s/g, ''));
  if (m) return [+m[1]!, +m[2]!, +m[3]!];
  throw new Error('bad colour ' + c);
}

const attrs = (tag: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]!] = m[2]!;
  return out;
};

/** Parse SVG path data with M/L/H/V/Z (absolute) into subpaths. */
function pathSubs(d: string): { pts: [number, number][]; closed: boolean }[] {
  const subs: { pts: [number, number][]; closed: boolean }[] = [];
  let cur: { pts: [number, number][]; closed: boolean } | null = null;
  let x = 0,
    y = 0;
  for (const m of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const op = m[1]!;
    const n = m[2]!.trim() ? m[2]!.trim().split(/[\s,]+/).map(Number) : [];
    if (op === 'M') {
      [x, y] = [n[0]!, n[1]!];
      cur = { pts: [[x, y]], closed: false };
      subs.push(cur);
    } else if (op === 'Z') cur!.closed = true;
    else {
      if (op === 'L') [x, y] = [n[0]!, n[1]!];
      else if (op === 'H') x = n[0]!;
      else y = n[0]!;
      cur!.pts.push([x, y]);
    }
  }
  return subs;
}

export interface SvgNorm {
  root: Record<string, string>;
  drawn: Prim[];
}

/** Normalise an SVG string (rect + path elements). Invisible elements are dropped. */
export function normSvg(svg: string): SvgNorm {
  const rootTag = /<svg[^>]*>/.exec(svg)![0];
  const drawn: Prim[] = [];
  for (const m of svg.matchAll(/<(rect|path)\b[^>]*\/>/g)) {
    const a = attrs(m[0]);
    const fill = parseColour(a.fill ?? '#000');
    const stroke = a.stroke ? parseColour(a.stroke) : null;
    if (!fill && !stroke) continue;
    const subs =
      m[1] === 'rect'
        ? [
            {
              pts: [
                [+a.x!, +a.y!],
                [+a.x! + +a.width!, +a.y!],
                [+a.x! + +a.width!, +a.y! + +a.height!],
                [+a.x!, +a.y! + +a.height!],
              ] as [number, number][],
              closed: true,
            },
          ]
        : pathSubs(a.d!);
    for (const s of subs)
      drawn.push({
        kind: 'sub',
        ...s,
        fill,
        stroke,
        width: stroke ? +(a['stroke-width'] ?? 1) : null,
        dash: a['stroke-dasharray'] ? a['stroke-dasharray'].split(/[\s,]+/).map(Number) : [],
      });
  }
  return { root: attrs(rootTag), drawn };
}

type Call = [string, ...unknown[]];

const colourArgs = (args: unknown[]): RGB => (args.length === 1 ? [args[0], args[0], args[0]] : args.slice(0, 3)) as RGB;

/**
 * Replay recorded jsPDF calls (from either the prototype or our renderer)
 * into primitives. Understands both the prototype's `lines/line/rect` calls
 * and our `moveTo/lineTo/close` + `fill/stroke/fillStroke` path API.
 */
export function normPdf(calls: readonly Call[]): { opts: unknown; drawn: Drawn[] } {
  let fillC: RGB = [0, 0, 0],
    drawC: RGB = [0, 0, 0],
    textC: RGB = [0, 0, 0],
    width = 0.2,
    dash: number[] = [],
    size = 16,
    opts: unknown = null;
  const drawn: Drawn[] = [];
  let path: { pts: [number, number][]; closed: boolean }[] = [];
  const emit = (subs: { pts: [number, number][]; closed: boolean }[], doFill: boolean, doStroke: boolean) => {
    for (const s of subs)
      drawn.push({
        kind: 'sub',
        ...s,
        fill: doFill ? fillC : null,
        stroke: doStroke ? drawC : null,
        width: doStroke ? width : null,
        dash: doStroke ? dash : [],
      });
  };
  for (const [op, ...a] of calls) {
    switch (op) {
      case 'new':
        opts = a[0];
        break;
      case 'setFillColor':
        fillC = colourArgs(a);
        break;
      case 'setDrawColor':
        drawC = colourArgs(a);
        break;
      case 'setTextColor':
        textC = colourArgs(a);
        break;
      case 'setLineWidth':
        width = a[0] as number;
        break;
      case 'setLineDashPattern':
        dash = [...(a[0] as number[])];
        break;
      case 'setFontSize':
        size = a[0] as number;
        break;
      case 'setLineJoin':
        break;
      case 'text':
        drawn.push({ kind: 'text', text: a[0] as string, x: a[1] as number, y: a[2] as number, size, color: textC });
        break;
      case 'lines': {
        const [deltas, x0, y0, , style, closed] = a as [[number, number][], number, number, unknown, string, boolean];
        const pts: [number, number][] = [[x0, y0]];
        let [x, y] = [x0, y0];
        for (const [dx, dy] of deltas) pts.push([(x += dx), (y += dy)]);
        emit([{ pts, closed }], style.includes('F'), style.includes('D') || style === 'S');
        break;
      }
      case 'line': {
        const [x1, y1, x2, y2] = a as number[];
        emit([{ pts: [[x1!, y1!], [x2!, y2!]], closed: false }], false, true);
        break;
      }
      case 'rect': {
        const [x, y, w, h] = a as number[];
        emit(
          [
            {
              pts: [
                [x!, y!],
                [x! + w!, y!],
                [x! + w!, y! + h!],
                [x!, y! + h!],
              ],
              closed: true,
            },
          ],
          false,
          true,
        );
        break;
      }
      case 'moveTo':
        path.push({ pts: [[a[0] as number, a[1] as number]], closed: false });
        break;
      case 'lineTo':
        path[path.length - 1]!.pts.push([a[0] as number, a[1] as number]);
        break;
      case 'close':
        path[path.length - 1]!.closed = true;
        break;
      case 'fill':
      case 'stroke':
      case 'fillStroke':
        emit(path, op !== 'stroke', op !== 'fill');
        path = [];
        break;
      default:
        throw new Error('unexpected pdf call ' + op);
    }
  }
  return { opts, drawn };
}

/** A PdfSink that records calls in the same shape as the fixture generator. */
export function recorder(): { calls: Call[] } & Record<string, (...a: unknown[]) => void> {
  const calls: Call[] = [];
  return new Proxy({ calls } as { calls: Call[] } & Record<string, (...a: unknown[]) => void>, {
    get: (t, k: string) => (k === 'calls' ? t.calls : (...a: unknown[]) => void calls.push([k, ...a])),
  });
}

/** Deep compare with numeric tolerance; returns a path to the first mismatch or null. */
export function mismatch(a: unknown, b: unknown, eps: number, at = '$'): string | null {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= eps ? null : `${at}: ${a} vs ${b}`;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${at}: length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const m = mismatch(a[i], b[i], eps, `${at}[${i}]`);
      if (m) return m;
    }
    return null;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort(),
      kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) return `${at}: keys ${ka} vs ${kb}`;
    for (const k of ka) {
      const m = mismatch((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], eps, `${at}.${k}`);
      if (m) return m;
    }
    return null;
  }
  return a === b ? null : `${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
}
