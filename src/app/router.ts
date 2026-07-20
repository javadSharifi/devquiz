/* ============================================================
 * DevQuiz — app/router.ts
 * Tab dispatch → view rendering. Bottom nav + main content.
 * ============================================================ */

import { store } from '../state.js';
import type { AppState } from '../state.js';
import { emptyState, errorCard, h, svgIcon } from '../ui.js';
import { setLastFlashcard } from '../lib/undo.js';
import { renderGame, patchGameCard } from '../features/game.js';
import { renderAllGames } from '../features/all-games.js';
import { renderReview } from '../features/review.js';
import { renderAdd } from '../features/add.js';
import { renderSettings } from '../features/settings.js';
import { renderNoTopics } from './picker/first-run-picker.js';

export interface AppShell {
  headerEl: HTMLElement;
  mainEl: HTMLElement;
  navEl: HTMLElement;
  liveRegion: HTMLElement;
}

export type Tab = 'game' | 'all-games' | 'review' | 'add' | 'settings';

export const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'game', label: 'بازی', icon: 'M6 12h4m-2-2v4m8-3h.01M18 13h.01M7 5h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z' },
  { tab: 'all-games', label: 'همه بازی‌ها', icon: 'M4 5h16M4 12h16M4 19h16' },
  { tab: 'review', label: 'مرور', icon: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16l-8-4-8 4V5z' },
  { tab: 'add', label: 'اضافه', icon: 'M12 5v14M5 12h14' },
  { tab: 'settings', label: 'تنظیمات', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z' },
];

export function renderNav(shell: AppShell): void {
  const state = store.getState();
  shell.navEl.replaceChildren(
    ...NAV_ITEMS.map(({ tab, label, icon }) => {
      const active = state.activeTab === tab;
      return h(
        'button',
        {
          className: `nav-item${active ? ' nav-item--active' : ''}`,
          type: 'button',
          attrs: { 'aria-label': label, 'aria-current': active ? 'page' : 'false' },
          onClick: () => store.dispatch({ type: 'SET_TAB', tab }),
        },
        svgIcon(icon, 22),
        h('span', { className: 'nav-item__label' }, label),
      );
    }),
  );
}

export function renderMain(state: AppState, shell: AppShell): void {
  try {
    setLastFlashcard(null);
    let view: HTMLElement;
    if (Object.keys(state.topics).length === 0) {
      view = renderNoTopics();
    } else {
      switch (state.activeTab) {
        case 'game':
          view = renderGame(state);
          break;
        case 'all-games':
          view = renderAllGames(state);
          break;
        case 'review':
          view = renderReview(state);
          break;
        case 'add':
          view = renderAdd(state);
          break;
        case 'settings':
          view = renderSettings(state);
          break;
        default:
          view = emptyState('', '', '');
      }
    }
    shell.mainEl.replaceChildren(view);
  } catch {
    shell.mainEl.replaceChildren(
      errorCard('خطایی در نمایش رخ داد.', () => window.location.reload()),
    );
  }
}

export { patchGameCard };
