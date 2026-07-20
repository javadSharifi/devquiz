/* ============================================================
 * DevQuiz — components/skeleton.ts
 * Shimmer placeholder primitives.
 * ============================================================ */

import { h } from './hyperscript.js';

export function skeleton(className = ''): HTMLElement {
  return h('div', { className: `skeleton ${className}`.trim(), attrs: { 'aria-hidden': 'true' } });
}

export function skeletonList(count: number, className = 'skeleton--row'): HTMLElement {
  const wrap = h('div', { className: 'skeleton-list' });
  for (let i = 0; i < count; i++) wrap.appendChild(skeleton(className));
  return wrap;
}
