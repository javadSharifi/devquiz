import { h, svgIcon } from '../ui.js';
import type { QuestionLevel } from '../types.js';

export const LEVEL_LABEL: Record<QuestionLevel, string> = {
  junior: 'جونیور',
  mid: 'میدلول',
  senior: 'سنیور',
};

export const ICON_FALLBACK: Record<string, string> = {
  javascript: '🟨',
  typescript: '🟦',
  react: '⚛️',
  vue: '🟢',
  node: '🟩',
  python: '🐍',
  go: '🔵',
  rust: '🦀',
  java: '☕',
  css: '🎨',
  html: '🌐',
  sql: '🗄️',
  docker: '🐳',
  git: '🔧',
};

const ICON_URL_RE = /^(https?:|data:|\/\/)/i;

export function pickIcon(item: { id: string; icon?: string }): string {
  if (item.icon && item.icon.length > 0) return item.icon;
  return ICON_FALLBACK[item.id] ?? '📘';
}

export function topicIconEl(item: { id: string; icon?: string }): HTMLElement {
  const value = pickIcon(item);
  if (ICON_URL_RE.test(value)) {
    return h('img', {
      className: 'topic-tile__icon topic-tile__icon--img',
      attrs: { src: value, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' },
    });
  }
  return h('span', { className: 'topic-tile__icon', attrs: { 'aria-hidden': 'true' } }, value);
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

export function statChip(icon: string, label: string, value: string): HTMLElement {
  return h(
    'div',
    { className: 'stat-chip' },
    h('span', { className: 'stat-chip__icon', attrs: { 'aria-hidden': 'true' } }, icon),
    h('span', { className: 'stat-chip__value' }, value),
    h('span', { className: 'stat-chip__label' }, label),
  );
}
