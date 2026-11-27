import { DEFAULTS, parseSettings, serializeSettings, STORAGE_KEY, validateSettings, type Settings } from '../src/core/settings.ts';

describe('settings (schema v1)', () => {
  it('uses the namespaced key', () => {
    expect(STORAGE_KEY).toBe('scribe-monk:plait:v1');
  });

  it('defaults are inches + Letter', () => {
    expect(DEFAULTS.unit).toBe('in');
    expect(DEFAULTS.paper).toBe('letter');
    expect(validateSettings({ ...DEFAULTS })).toEqual([]);
  });

  it.each([null, '', 'not json', '42', '"str"', '[]', 'null', '{}', '{"v":2,"tw":5}', '{"tw":5}'])(
    'falls back to defaults for %j',
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULTS);
    },
  );

  it('round-trips valid settings', () => {
    const s: Settings = {
      unit: 'mm',
      tw: 12.5,
      th: 30,
      cols: 200,
      rows: 1,
      cord: 0,
      shade: 'none',
      outline: false,
      tiles: false,
      paper: 'tabloid',
      orient: 'landscape',
      fit: true,
    };
    expect(parseSettings(serializeSettings(s))).toEqual(s);
  });

  it.each<[keyof Settings, unknown]>([
    ['unit', 'cm'],
    ['tw', 0],
    ['tw', -3],
    ['tw', '20'],
    ['th', null],
    ['cols', 0],
    ['cols', 201],
    ['cols', 2.5],
    ['rows', '5'],
    ['cord', -1],
    ['cord', null],
    ['shade', 205],
    ['shade', 'pink'],
    ['outline', 'true'],
    ['tiles', 1],
    ['paper', 'b5'],
    ['paper', 'toString'],
    ['orient', 'sideways'],
    ['fit', null],
  ])('invalid %s=%j falls back to its default, keeps the rest', (key, bad) => {
    const good = { ...DEFAULTS, unit: 'mm' as const, tw: 15, cols: 3, fit: true };
    const raw = JSON.stringify({ v: 1, ...good, [key]: bad });
    expect(parseSettings(raw)).toEqual({ ...good, [key]: DEFAULTS[key] });
  });

  it('ignores unknown fields', () => {
    expect(parseSettings(JSON.stringify({ v: 1, evil: '<script>' }))).toEqual(DEFAULTS);
  });

  it('validation messages match the prototype', () => {
    expect(validateSettings({ ...DEFAULTS, tw: 0 })).toEqual(['Tile width and height must be greater than zero.']);
    expect(validateSettings({ ...DEFAULTS, cols: 0 })).toEqual(['Tiles across and down must be whole numbers from 1 to 200.']);
    expect(validateSettings({ ...DEFAULTS, cord: -1 })).toEqual(['Cord thickness can’t be negative.']);
    expect(validateSettings({ ...DEFAULTS, unit: 'mm', cord: 100 })).toEqual([
      'Cord is too thick for this tile — the gaps vanish at 14.14 mm.',
    ]);
  });
});
