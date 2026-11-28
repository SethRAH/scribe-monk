/** Length units. All state and geometry is stored in millimetres. */
export type Unit = 'mm' | 'in';

export const MM_PER_IN = 25.4;

/** mm → value in `unit`. */
export const toUnit = (mm: number, unit: Unit): number => (unit === 'in' ? mm / MM_PER_IN : mm);

/** Value in `unit` → mm. */
export const fromUnit = (v: number, unit: Unit): number => (unit === 'in' ? v * MM_PER_IN : v);

/** Format a length (given in mm) in `unit`, without a suffix: 3 dp for inches, 2 dp for mm, trailing zeros trimmed. */
export const fmt = (mm: number, unit: Unit): string =>
  unit === 'in' ? (+(mm / MM_PER_IN).toFixed(3)).toString() : (+mm.toFixed(2)).toString();

/** Like {@link fmt} with a ` in` / ` mm` suffix. */
export const fmtU = (mm: number, unit: Unit): string => fmt(mm, unit) + (unit === 'in' ? ' in' : ' mm');
