import { h } from '../../components/hyperscript.js';
import type { AppState } from '../../state.js';
import { store } from '../../state.js';
import type { FontSize, Theme } from '../../types.js';
import { segmentedGroup } from './segmented.js';
import { ICON, icon, settingsSection } from './section.js';

export const FONT_LABELS: Record<FontSize, string> = { small: 'آ', medium: 'آ', large: 'آ', extra: 'آ' };
export const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'extra'];
export const THEME_LABELS: Record<Theme, string> = { dark: 'تیره', light: 'روشن' };
export const THEMES: Theme[] = ['dark', 'light'];

const THEME_ICONS: Record<Theme, string> = { dark: ICON.moon, light: ICON.sun };

export function renderDisplaySection(state: AppState): HTMLElement {
  const tiles = h('div', { className: 'theme-tiles', attrs: { role: 'radiogroup', 'aria-label': 'تم' } });
  for (const t of THEMES) {
    const active = t === state.theme;
    tiles.appendChild(
      h(
        'button',
        {
          type: 'button',
          className: `theme-tile theme-tile--${t}${active ? ' theme-tile--active' : ''}`,
          attrs: { role: 'radio', 'aria-checked': String(active) },
          onClick: () => store.dispatch({ type: 'SET_THEME', theme: t }),
        },
        h('span', { className: 'theme-tile__swatch' }, icon(THEME_ICONS[t], 20)),
        h('span', { className: 'theme-tile__label' }, THEME_LABELS[t]),
      ),
    );
  }

  const fontBlock = h(
    'div',
    { className: 'st-field' },
    h('span', { className: 'st-field__label' }, 'اندازه متن'),
    segmentedGroup(FONT_SIZES, FONT_LABELS, state.fontSize, (v) => {
      store.dispatch({ type: 'SET_FONT_SIZE', fontSize: v });
    }, 'اندازه متن'),
  );

  return settingsSection('ظاهر', h('div', { className: 'st-card st-card--pad' }, tiles, fontBlock));
}
