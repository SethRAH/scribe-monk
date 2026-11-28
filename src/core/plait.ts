import { gray, lineSegs, polygonSegs, rectSegs, type RGB, type Shape } from './draw.ts';
import { clipRect, type Polygon } from './geom.ts';

/** Plait grid parameters, all lengths in mm. */
export interface PlaitParams {
  /** Tile width. */
  tw: number;
  /** Tile height. */
  th: number;
  /** Tiles across. */
  cols: number;
  /** Tiles down. */
  rows: number;
  /** Cord thickness, measured perpendicular to the cord. */
  cord: number;
}

/**
 * Cords follow the lines joining tile-edge midpoints. The thickest cord a
 * W×H tile can carry before the gaps vanish is the distance from a tile
 * centre to such a line, doubled: 1/√(1/W² + 1/H²).
 */
export function maxCord(W: number, H: number): number {
  return 1 / Math.sqrt(1 / (W * W) + 1 / (H * H));
}

/** Overall grid size in mm. */
export function gridSize(p: PlaitParams): { gw: number; gh: number } {
  return { gw: p.tw * p.cols, gh: p.th * p.rows };
}

/**
 * The shaded gaps between cords. Every gap is a rhombus centred on a tile
 * centre or a tile corner with half-diagonals (0.5−e)·W and (0.5−e)·H,
 * clipped to the grid rectangle. Order: tile centres row by row, then
 * corners row by row (matches the prototype).
 */
export function buildGaps(p: PlaitParams): Polygon[] {
  const W = p.tw;
  const H = p.th;
  const { gw, gh } = gridSize(p);
  const e = (p.cord / 2) * Math.sqrt(1 / (W * W) + 1 / (H * H));
  const a = (0.5 - e) * W;
  const b = (0.5 - e) * H;
  const gaps: Polygon[] = [];
  if (a <= 0 || b <= 0) return gaps;
  const add = (cx: number, cy: number) => {
    const poly = clipRect(
      [
        [cx, cy - b],
        [cx + a, cy],
        [cx, cy + b],
        [cx - a, cy],
      ],
      0,
      0,
      gw,
      gh,
    );
    if (poly.length) gaps.push(poly);
  };
  for (let j = 0; j < p.rows; j++) for (let i = 0; i < p.cols; i++) add((i + 0.5) * W, (j + 0.5) * H);
  for (let j = 0; j <= p.rows; j++) for (let i = 0; i <= p.cols; i++) add(i * W, j * H);
  return gaps;
}

// ---------- display list ----------


export interface PlaitStyle {
  /** Grey level 0–255 for the gaps, or null for no fill. */
  shade: number | null;
  /** Outline the gaps. */
  outline: boolean;
  /** Dashed tile lines + a solid grid border. */
  tiles: boolean;
}

export const GAP_STROKE: RGB = [34, 34, 34];
export const GAP_STROKE_WIDTH = 0.25;
export const TILE_STROKE: RGB = [122, 156, 198];

/** The plait grid as shapes in local mm, origin at the grid's top-left. */
export function plaitShapes(p: PlaitParams, style: PlaitStyle): Shape[] {
  const { gw, gh } = gridSize(p);
  const shapes: Shape[] = [];
  const fill = style.shade === null ? null : gray(style.shade);
  const stroke = style.outline ? GAP_STROKE : null;
  const gaps = buildGaps(p);
  if ((fill || stroke) && gaps.length) {
    shapes.push({
      kind: 'path',
      segs: polygonSegs(gaps),
      style: { fill, stroke, width: GAP_STROKE_WIDTH, join: 'miter' },
    });
  }
  if (style.tiles) {
    const lines: [number, number, number, number][] = [];
    for (let i = 1; i < p.cols; i++) lines.push([i * p.tw, 0, i * p.tw, gh]);
    for (let j = 1; j < p.rows; j++) lines.push([0, j * p.th, gw, j * p.th]);
    if (lines.length) {
      shapes.push({
        kind: 'path',
        segs: lineSegs(lines),
        style: { fill: null, stroke: TILE_STROKE, width: 0.2, dash: [1, 1] },
      });
    }
    shapes.push({ kind: 'path', segs: rectSegs(0, 0, gw, gh), style: { fill: null, stroke: TILE_STROKE, width: 0.25 } });
  }
  return shapes;
}
