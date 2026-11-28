/** User settings (schema v1), validated field by field. All lengths in mm. */
import { PAPERS, type OrientChoice, type Paper } from './page.ts';
import { maxCord, type PlaitParams, type PlaitStyle } from './plait.ts';
import { fmtU, MM_PER_IN, type Unit } from './units.ts';

export const STORAGE_KEY = 'scribe-monk:plait:v1';
export const SCHEMA_VERSION = 1;

export const SHADES = ['235', '205', '165', 'none'] as const;
export type Shade = (typeof SHADES)[number];
export const ORIENTS = ['auto', 'portrait', 'landscape'] as const satisfies readonly OrientChoice[];

export interface Settings extends PlaitParams {
  unit: Unit;
  shade: Shade;
  outline: boolean;
  tiles: boolean;
  paper: Paper;
  orient: OrientChoice;
  fit: boolean;
}

/** Owner decision: inches + Letter, round inch sizes (stored in mm like everything else). */
export const DEFAULTS: Readonly<Settings> = {
  unit: 'in',
  tw: 0.75 * MM_PER_IN,
  th: 0.75 * MM_PER_IN,
  cols: 8,
  rows: 5,
  cord: 0.25 * MM_PER_IN,
  shade: '205',
  outline: true,
  tiles: true,
  paper: 'letter',
  orient: 'auto',
  fit: false,
};

const isPosNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 200;
const isOneOf =
  <T extends string>(xs: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (xs as readonly string[]).includes(v);

const CHECKS: { [K in keyof Settings]: (v: unknown) => v is Settings[K] } = {
  unit: isOneOf(['mm', 'in'] as const),
  tw: isPosNum,
  th: isPosNum,
  cols: isCount as (v: unknown) => v is number,
  rows: isCount as (v: unknown) => v is number,
  cord: (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0,
  shade: isOneOf(SHADES),
  outline: (v): v is boolean => typeof v === 'boolean',
  tiles: (v): v is boolean => typeof v === 'boolean',
  paper: isOneOf(Object.keys(PAPERS) as Paper[]),
  orient: isOneOf(ORIENTS),
  fit: (v): v is boolean => typeof v === 'boolean',
};

/**
 * Parse saved settings. Anything that is not a v1 object yields the
 * defaults; within a v1 object each invalid or missing field falls back to
 * its default.
 */
export function parseSettings(raw: string | null): Settings {
  const out: Settings = { ...DEFAULTS };
  let data: unknown;
  try {
    data = raw === null ? null : JSON.parse(raw);
  } catch {
    return out;
  }
  if (typeof data !== 'object' || data === null || (data as { v?: unknown }).v !== SCHEMA_VERSION) return out;
  const rec = data as Record<string, unknown>;
  for (const key of Object.keys(CHECKS) as (keyof Settings)[]) {
    const v = rec[key];
    if (CHECKS[key](v)) (out as Record<keyof Settings, unknown>)[key] = v;
  }
  return out;
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify({ v: SCHEMA_VERSION, ...s });
}

export const plaitParams = (s: Settings): PlaitParams => ({ tw: s.tw, th: s.th, cols: s.cols, rows: s.rows, cord: s.cord });

export const plaitStyle = (s: Settings): PlaitStyle => ({
  shade: s.shade === 'none' ? null : +s.shade,
  outline: s.outline,
  tiles: s.tiles,
});

/** Human-readable problems with the current settings (empty when drawable). Same rules and wording as the prototype. */
export function validateSettings(S: Settings): string[] {
  const errs: string[] = [];
  if (!(S.tw > 0 && S.th > 0)) errs.push('Tile width and height must be greater than zero.');
  if (!(Number.isInteger(S.cols) && S.cols >= 1 && S.cols <= 200 && Number.isInteger(S.rows) && S.rows >= 1 && S.rows <= 200))
    errs.push('Tiles across and down must be whole numbers from 1 to 200.');
  if (!(S.cord >= 0)) errs.push('Cord thickness can’t be negative.');
  else if (S.tw > 0 && S.th > 0 && S.cord >= maxCord(S.tw, S.th))
    errs.push(`Cord is too thick for this tile — the gaps vanish at ${fmtU(maxCord(S.tw, S.th), S.unit)}.`);
  return errs;
}
