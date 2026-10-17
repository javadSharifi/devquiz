/* ============================================================
 * DevQuiz — app/header.ts
 * App header: brand + streak/XP stats. Stats pulse on change.
 * ============================================================ */

import { store } from '../state.js';
import { faNum } from '../types.js';
import { h } from '../components/hyperscript.js';
import { ico } from '../components/icons.js';
import { platform } from '../platform/index.js';

let headerEl: HTMLElement | null = null;
let streakValueEl: HTMLElement | null = null;
let xpValueEl: HTMLElement | null = null;

export function initHeader(shell: { headerEl: HTMLElement }): void {
  headerEl = shell.headerEl;
}

export function renderHeader(): void {
  if (!headerEl) return;
  const { gamification } = store.getState();
  streakValueEl = h('span', { className: 'stat__value' }, faNum(gamification.streak));
  xpValueEl = h('span', { className: 'stat__value' }, faNum(gamification.xp));
  headerEl.replaceChildren(
    h('div', { className: 'brand' }, h('span', { className: 'brand__logo', attrs: { 'aria-hidden': 'true' } }, ico('bolt', 18)), 'دِوکوئیز'),
    themeToggle(),
    githubLink(),
    ...(platform.isExtension ? [fullscreenToggle()] : []),
    h(
      'div',
      { className: 'header-stats' },
      h(
        'div',
        { className: 'stat stat--streak', title: 'استریک روزانه', attrs: { 'aria-label': `استریک: ${faNum(gamification.streak)} روز` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, ico('flame', 16)),
        streakValueEl,
      ),
      h(
        'div',
        { className: 'stat stat--xp', title: 'امتیاز تجربه', attrs: { 'aria-label': `امتیاز: ${faNum(gamification.xp)}` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, ico('star', 14)),
        xpValueEl,
        h('span', { className: 'stat__unit' }, 'XP'),
      ),
    ),
  );
}

export function updateHeaderStats(): void {
  const { gamification } = store.getState();
  if (streakValueEl) streakValueEl.textContent = faNum(gamification.streak);
  if (xpValueEl) {
    xpValueEl.textContent = faNum(gamification.xp);
    xpValueEl.parentElement?.classList.remove('stat--pulse');
    void xpValueEl.parentElement?.offsetWidth;
    xpValueEl.parentElement?.classList.add('stat--pulse');
  }
}

const REPO_URL = 'https://github.com/javadSharifi/devquiz';

let themeBtnEl: HTMLButtonElement | null = null;

function themeToggle(): HTMLElement {
  const btn = h('button', {
    className: 'header-icon-btn header-icon-btn--first',
    type: 'button',
    onClick: () => {
      const next = store.getState().theme === 'dark' ? 'light' : 'dark';
      store.dispatch({ type: 'SET_THEME', theme: next });
    },
  });
  themeBtnEl = btn;
  updateHeaderTheme();
  return btn;
}

/** Keep the header toggle's icon and label in sync with the current theme. */
export function updateHeaderTheme(): void {
  if (!themeBtnEl) return;
  const dark = store.getState().theme === 'dark';
  const label = dark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره';
  themeBtnEl.title = label;
  themeBtnEl.setAttribute('aria-label', label);
  themeBtnEl.replaceChildren(ico(dark ? 'sun' : 'moon', 18));
}

function githubLink(): HTMLElement {
  const link = h(
    'a',
    {
      className: 'header-icon-btn',
      href: REPO_URL,
      title: 'مشاهده در گیت‌هاب',
      attrs: { target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'مشاهده پروژه در گیت‌هاب' },
    },
    ico('github', 18),
  );
  return link;
}

function fullscreenToggle(): HTMLElement {
  const isFs = new URLSearchParams(location.search).get('fs') === '1';
  const btn = h('button', {
    className: 'header-icon-btn',
    type: 'button',
    title: isFs ? 'بستن حالت تمام‌صفحه' : 'باز کردن در صفحه بزرگ',
    attrs: { 'aria-label': isFs ? 'بستن حالت تمام‌صفحه' : 'باز کردن در صفحه بزرگ' },
    onClick: () => {
      if (isFs) {
        window.close();
        return;
      }
      void platform.tabs.create({ url: platform.runtime.getURL('popup/popup.html?fs=1') });
      window.close();
    },
  }, isFs ? ico('close', 18) : ico('expand', 18));
  return btn;
}
