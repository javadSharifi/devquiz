/* ============================================================
 * DevQuiz — app/header.ts
 * App header: brand + streak/XP stats. Stats pulse on change.
 * ============================================================ */

import { store } from '../state.js';
import { faNum } from '../types.js';
import { h } from '../components/hyperscript.js';

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
    h('div', { className: 'brand' }, h('span', { className: 'brand__logo', attrs: { 'aria-hidden': 'true' } }, '⚡'), 'دِوکوئیز'),
    fullscreenToggle(),
    h(
      'div',
      { className: 'header-stats' },
      h(
        'div',
        { className: 'stat stat--streak', title: 'استریک روزانه', attrs: { 'aria-label': `استریک: ${faNum(gamification.streak)} روز` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, '🔥'),
        streakValueEl,
      ),
      h(
        'div',
        { className: 'stat stat--xp', title: 'امتیاز تجربه', attrs: { 'aria-label': `امتیاز: ${faNum(gamification.xp)}` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, '✦'),
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

function fullscreenToggle(): HTMLElement {
  const isFs = new URLSearchParams(location.search).get('fs') === '1';
  const btn = h('button', {
    className: 'header-fs-btn',
    type: 'button',
    title: isFs ? 'بستن حالت تمام‌صفحه' : 'باز کردن در صفحه بزرگ',
    attrs: { 'aria-label': isFs ? 'بستن حالت تمام‌صفحه' : 'باز کردن در صفحه بزرگ' },
    onClick: () => {
      if (isFs) {
        window.close();
        return;
      }
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?fs=1') });
      window.close();
    },
  }, isFs ? '✕' : '⛶');
  return btn;
}
