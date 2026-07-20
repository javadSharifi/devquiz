/* ============================================================
 * DevQuiz — components/feedback.ts
 * Empty state, error card, XP float, confetti burst. All visual
 * feedback for the user (no business state mutations).
 * ============================================================ */

import { h } from './hyperscript.js';
import { button } from './button.js';
import { faNum } from '../types.js';

export function emptyState(emoji: string, title: string, desc: string, action?: HTMLElement): HTMLElement {
  return h(
    'div',
    { className: 'empty' },
    h('div', { className: 'empty__art', attrs: { 'aria-hidden': 'true' } }, emoji),
    h('h3', { className: 'empty__title' }, title),
    h('p', { className: 'empty__desc' }, desc),
    action ?? null,
  );
}

export function errorCard(message: string, onRetry: () => void): HTMLElement {
  return h(
    'div',
    { className: 'error-card glass', attrs: { role: 'alert' } },
    h('div', { className: 'error-card__icon', attrs: { 'aria-hidden': 'true' } }, '⚠️'),
    h('h3', {}, 'مشکلی پیش آمد'),
    h('p', { className: 'error-card__msg' }, message),
    button('تلاش دوباره', onRetry, { variant: 'primary', ariaLabel: 'تلاش دوباره' }),
  );
}

export function xpFloat(anchor: HTMLElement, amount: number): void {
  if (amount <= 0) return;
  const rect = anchor.getBoundingClientRect();
  const el = h('div', { className: 'xp-float', attrs: { 'aria-hidden': 'true' } }, `+${faNum(amount)}`);
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

export function confetti(host: HTMLElement, count = 36): void {
  const colors = ['var(--accent)', 'var(--accent-2)', 'var(--junior)', 'var(--mid)', 'var(--senior)'];
  for (let i = 0; i < count; i++) {
    const piece = h('span', { className: 'confetti', attrs: { 'aria-hidden': 'true' } });
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length] ?? 'var(--accent)';
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(piece);
  }
}
