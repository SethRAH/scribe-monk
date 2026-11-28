import { parseSettings, serializeSettings, STORAGE_KEY, type Settings } from '../core/settings.ts';

export function loadSettings(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage blocked: use defaults */
  }
  return parseSettings(raw);
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSettings(s));
  } catch {
    /* storage blocked or full: settings just won't persist */
  }
}
