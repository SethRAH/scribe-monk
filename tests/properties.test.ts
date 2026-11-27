import { clipRect } from '../src/core/geom.ts';
import { buildGaps, maxCord, type PlaitParams } from '../src/core/plait.ts';
import { fmt, fromUnit, MM_PER_IN, toUnit } from '../src/core/units.ts';

/** Small seeded LCG so the property runs are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function randomParams(rand: () => number): PlaitParams {
  const tw = 2 + rand() * 48;
  const th = 2 + rand() * 48;
  return {
    tw,
    th,
    cols: 1 + Math.floor(rand() * 12),
    rows: 1 + Math.floor(rand() * 12),
    cord: rand() * maxCord(tw, th),
  };
}

const RUNS = 300;
const EPS = 1e-9;

/**
 * Cords run along the lines joining tile-edge midpoints:
 *   x/W + y/H = k + ½  and  x/W − y/H = k + ½  (k integer).
 * Distance from (x, y) to the nearest line of each family.
 */
function cordDistance(x: number, y: number, W: number, H: number): number {
  const norm = Math.sqrt(1 / (W * W) + 1 / (H * H));
  const toHalf = (u: number) => Math.abs(u - 0.5 - Math.round(u - 0.5));
  return Math.min(toHalf(x / W + y / H), toHalf(x / W - y / H)) / norm;
}

describe('plait geometry properties', () => {
  it('every gap vertex is at least cord/2 from every cord centre line', () => {
    const rand = rng(1);
    for (let n = 0; n < RUNS; n++) {
      const p = randomParams(rand);
      for (const g of buildGaps(p))
        for (const [x, y] of g) expect(cordDistance(x, y, p.tw, p.th)).toBeGreaterThanOrEqual(p.cord / 2 - EPS);
    }
  });

  it('every gap vertex lies inside the grid rectangle', () => {
    const rand = rng(2);
    for (let n = 0; n < RUNS; n++) {
      const p = randomParams(rand);
      const gw = p.tw * p.cols,
        gh = p.th * p.rows;
      for (const g of buildGaps(p))
        for (const [x, y] of g) {
          expect(x).toBeGreaterThanOrEqual(-EPS);
          expect(y).toBeGreaterThanOrEqual(-EPS);
          expect(x).toBeLessThanOrEqual(gw + EPS);
          expect(y).toBeLessThanOrEqual(gh + EPS);
        }
    }
  });

  it('cord >= maxCord gives no gaps', () => {
    const rand = rng(3);
    for (let n = 0; n < RUNS; n++) {
      const p = randomParams(rand);
      const mx = maxCord(p.tw, p.th);
      expect(buildGaps({ ...p, cord: mx })).toEqual([]);
      expect(buildGaps({ ...p, cord: mx * (1 + rand()) })).toEqual([]);
    }
  });

  it('cord 0 gives (cols·rows) centre gaps plus (cols+1)(rows+1) clipped corner gaps', () => {
    const rand = rng(4);
    for (let n = 0; n < 50; n++) {
      const p = { ...randomParams(rand), cord: 0 };
      expect(buildGaps(p).length).toBe(p.cols * p.rows + (p.cols + 1) * (p.rows + 1));
    }
  });

  it('clipRect drops polygons outside the rectangle and slivers', () => {
    const sq: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(clipRect(sq, 2, 2, 3, 3)).toEqual([]);
    expect(clipRect(sq, 0, 0, 1, 1)).toEqual(sq);
    expect(clipRect(sq, 0, 0, 1e-7, 1)).toEqual([]);
  });
});

describe('units', () => {
  it('mm ↔ in round-trips', () => {
    const rand = rng(5);
    for (let n = 0; n < RUNS; n++) {
      const mm = rand() * 1000;
      expect(fromUnit(toUnit(mm, 'in'), 'in')).toBeCloseTo(mm, 9);
      expect(fromUnit(toUnit(mm, 'mm'), 'mm')).toBe(mm);
      expect(toUnit(fromUnit(mm, 'in'), 'in')).toBeCloseTo(mm, 9);
    }
    expect(toUnit(MM_PER_IN, 'in')).toBe(1);
  });

  it('formats like the prototype', () => {
    expect(fmt(20, 'mm')).toBe('20');
    expect(fmt(20, 'in')).toBe('0.787');
    expect(fmt(25.4, 'in')).toBe('1');
    expect(fmt(6.355, 'mm')).toBe('6.36');
  });
});
