/* ============================================================
 * DevQuiz — components/progress.ts
 * Progress bar (HTML div + fill) and progress ring (SVG circle).
 * ============================================================ */

import { h } from './hyperscript.js';
import { faNum } from '../types.js';

export function progressBar(done: number, total: number): HTMLElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return h(
    'div',
    {
      className: 'progress',
      attrs: {
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': String(total),
        'aria-valuenow': String(done),
        'aria-label': `${faNum(done)} از ${faNum(total)} پاسخ داده شده`,
      },
    },
    h('div', { className: 'progress__fill', style: { width: `${pct}%` } }),
  );
}

export function progressRing(done: number, total: number, color: string, size = 44): HTMLElement {
  const pct = total > 0 ? done / total : 0;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('ring');
  const mk = (cls: string): SVGCircleElement => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(size / 2));
    circle.setAttribute('cy', String(size / 2));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke-width', String(stroke));
    circle.classList.add(cls);
    return circle;
  };
  const track = mk('ring__track');
  const fill = mk('ring__fill');
  fill.style.stroke = color;
  fill.setAttribute('stroke-dasharray', String(c));
  fill.setAttribute('stroke-dashoffset', String(c * (1 - pct)));
  fill.setAttribute('stroke-linecap', 'round');
  svg.appendChild(track);
  svg.appendChild(fill);
  const label = h('span', { className: 'ring__label' }, `${faNum(Math.round(pct * 100))}٪`);
  return h(
    'div',
    { className: 'ring-wrap', attrs: { 'aria-label': `پیشرفت: ${faNum(Math.round(pct * 100))} درصد` } },
    svg,
    label,
  );
}
