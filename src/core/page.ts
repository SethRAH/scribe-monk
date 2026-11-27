/** Paper sizes in mm, portrait (width, height). */
export const PAPERS = {
  letter: [215.9, 279.4],
  a4: [210, 297],
  legal: [215.9, 355.6],
  a3: [297, 420],
  tabloid: [279.4, 431.8],
} as const satisfies Record<string, readonly [number, number]>;

export type Paper = keyof typeof PAPERS;
export type Orientation = 'portrait' | 'landscape';
export type OrientChoice = Orientation | 'auto';

/** Page margin, each side, mm. */
export const MARGIN = 10;
/** Space reserved under the content for the caption + check bar, mm. */
export const FOOTER = 14;

export interface PageOptions {
  paper: Paper;
  orient: OrientChoice;
  /** Scale the content down if it doesn't fit. */
  fit: boolean;
}

export interface Layout {
  /** Content (grid) size, mm. */
  gw: number;
  gh: number;
  /** Page size after orientation, mm. */
  pw: number;
  ph: number;
  orient: Orientation;
  /** Printable area for the content, mm. */
  availW: number;
  availH: number;
  tooBig: boolean;
  /** Content scale factor (1 unless `fit` and too big). */
  scale: number;
  /** Drawn content size, mm. */
  dw: number;
  dh: number;
  /** Top-left of the drawn content on the page, mm. */
  ox: number;
  oy: number;
}

/** Place content of size gw×gh (mm) on a page: centred horizontally, centred in the area above the footer. */
export function layout(page: PageOptions, gw: number, gh: number): Layout {
  let [pw, ph]: [number, number] = [...PAPERS[page.paper]];
  const orient: Orientation = page.orient === 'auto' ? (gw > gh ? 'landscape' : 'portrait') : page.orient;
  if (orient === 'landscape') [pw, ph] = [ph, pw];
  const availW = pw - 2 * MARGIN;
  const availH = ph - 2 * MARGIN - FOOTER;
  const tooBig = gw > availW + 1e-6 || gh > availH + 1e-6;
  let scale = 1;
  if (tooBig && page.fit) scale = Math.min(availW / gw, availH / gh);
  const dw = gw * scale;
  const dh = gh * scale;
  const ox = (pw - dw) / 2;
  const oy = MARGIN + Math.max(0, (availH - dh) / 2);
  return { gw, gh, pw, ph, orient, availW, availH, tooBig, scale, dw, dh, ox, oy };
}
