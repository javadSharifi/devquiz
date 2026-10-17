import { h, svgIcon } from '../ui.js';
import { ico, type IconName } from '../components/icons.js';
import type { QuestionLevel } from '../types.js';
import { faNum, getPriorityLevel, getPriorityPercent } from '../types.js';

export const LEVEL_LABEL: Record<QuestionLevel, string> = {
  junior: 'جونیور',
  mid: 'میدلول',
  senior: 'سنیور',
};

const ICON_URL_RE = /^(https?:|data:|\/\/)/i;

/** Image URL from catalog data, or '' when the topic has no usable image icon. */
export function pickIcon(item: { id: string; icon?: string }): string {
  return item.icon && ICON_URL_RE.test(item.icon) ? item.icon : '';
}

export function topicIconEl(item: { id: string; icon?: string }): HTMLElement {
  const value = pickIcon(item);
  if (value) {
    return h('img', {
      className: 'topic-tile__icon topic-tile__icon--img',
      attrs: { src: value, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' },
    });
  }
  return h('span', { className: 'topic-tile__icon', attrs: { 'aria-hidden': 'true' } }, ico('code', 24));
}

export function backButton(onClick: () => void): HTMLElement {
  return h(
    'button',
    { className: 'back-btn', type: 'button', attrs: { 'aria-label': 'بازگشت' }, onClick },
    svgIcon('M9 6l6 6-6 6', 20),
  );
}

export function fieldRow(label: string, input: HTMLElement, forId: string): HTMLElement {
  return h(
    'div',
    { className: 'field' },
    h('label', { className: 'field__label', attrs: { for: forId } }, label),
    input,
  );
}

export function statChip(icon: IconName, label: string, value: string): HTMLElement {
  return h(
    'div',
    { className: 'stat-chip' },
    h('span', { className: 'stat-chip__icon', attrs: { 'aria-hidden': 'true' } }, ico(icon, 20)),
    h('span', { className: 'stat-chip__value' }, value),
    h('span', { className: 'stat-chip__label' }, label),
  );
}

export function renderPriorityBadge(
  priority?: number | string | null,
  opts?: { compact?: boolean },
): HTMLElement | null {
  const pct = getPriorityPercent(priority);
  if (pct === null) return null;
  const level = getPriorityLevel(pct);
  const text = opts?.compact ? `${faNum(pct)}٪` : `${faNum(pct)}٪ اهمیت`;
  return h(
    'span',
    {
      className: `priority-badge priority-badge--${level}${opts?.compact ? ' priority-badge--compact' : ''}`,
      title: `درصد اهمیت: ${faNum(pct)}٪`,
      attrs: { 'aria-label': `درصد اهمیت: ${faNum(pct)}٪` },
    },
    opts?.compact ? null : ico('target', 12),
    text,
  );
}

