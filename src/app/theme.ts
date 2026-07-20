/* ============================================================
 * DevQuiz — app/theme.ts
 * Theme + font-size DOM application. Pure helpers; no state.
 * ============================================================ */

import type { FontSize, Theme } from '../types.js';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '12px',
  medium: '14px',
  large: '16px',
  extra: '18px',
};

export function applyFontSize(size: FontSize): void {
  document.documentElement.style.setProperty('--font-size', FONT_SIZE_MAP[size]);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
