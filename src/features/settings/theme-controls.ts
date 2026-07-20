import { h } from '../../components/hyperscript.js';
import type { AppState } from '../../state.js';
import { store } from '../../state.js';
import type { FontSize, Theme } from '../../types.js';
import { segmentedGroup } from './segmented.js';

export const FONT_LABELS: Record<FontSize, string> = { small: 'sm', medium: 'md', large: 'lg', extra: 'xl' };
export const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'extra'];
export const THEME_LABELS: Record<Theme, string> = { dark: '🌙 تیره', light: '☀️ روشن' };
export const THEMES: Theme[] = ['dark', 'light'];

export function renderDisplaySection(state: AppState): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h3', { className: 'section-title' }, 'نمایش'));
  const themeGroup = h('div', { className: 'settings-group glass' });
  themeGroup.appendChild(
    segmentedGroup(THEMES, THEME_LABELS, state.theme, (v) => {
      store.dispatch({ type: 'SET_THEME', theme: v });
    }, 'تم'),
  );
  const fontRow = h('div', { className: 'settings-row settings-row--static', attrs: { 'aria-label': 'اندازه فونت' } },
    h('span', { className: 'settings-row__label' }, 'اندازه فونت'),
    segmentedGroup(FONT_SIZES, FONT_LABELS, state.fontSize, (v) => {
      store.dispatch({ type: 'SET_FONT_SIZE', fontSize: v });
    }, 'اندازه فونت'),
  );
  themeGroup.appendChild(fontRow);
  frag.appendChild(themeGroup);
  return frag;
}
