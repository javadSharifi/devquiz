/* ============================================================
 * DevQuiz — ui.ts
 * Typed hyperscript helper h() + shared presentational
 * components. No component here ever assigns untrusted strings
 * to innerHTML — all content flows through createTextNode or the
 * sanitizing markdown renderer.
 * ============================================================ */

import { faNum } from './types.js';

/* ------------------------------------------------------------
 * h() — typed hyperscript
 * ------------------------------------------------------------ */

export type Child = Node | string | number | null | undefined | false | Child[];

type EventHandlers = {
  [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: (
    ev: HTMLElementEventMap[K],
  ) => void;
};

export interface HProps extends EventHandlers {
  className?: string;
  id?: string;
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  disabled?: boolean;
  value?: string;
  type?: string;
  placeholder?: string;
  title?: string;
  tabIndex?: number;
  href?: string;
}

function appendChildren(el: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) {
      appendChildren(el, c);
    } else if (c instanceof Node) {
      el.appendChild(c);
    } else {
      el.appendChild(document.createTextNode(String(c)));
    }
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: HProps | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val === undefined || val === null) continue;
      if (key === 'className') {
        el.className = val as string;
      } else if (key === 'dataset') {
        for (const [dk, dv] of Object.entries(val as Record<string, string>)) {
          el.dataset[dk] = dv;
        }
      } else if (key === 'attrs') {
        for (const [ak, av] of Object.entries(val as Record<string, string>)) {
          el.setAttribute(ak, av);
        }
      } else if (key === 'style') {
        Object.assign(el.style, val);
      } else if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(
          key.slice(2).toLowerCase(),
          val as EventListener,
        );
      } else {
        // Direct property assignment (value, disabled, id, type, …)
        (el as unknown as Record<string, unknown>)[key] = val;
      }
    }
  }
  appendChildren(el, children);
  return el;
}

/** Inline SVG helper (trusted, static markup authored in this file only). */
export function svgIcon(pathD: string, size = 22): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  return svg;
}

/* ------------------------------------------------------------
 * Buttons
 * ------------------------------------------------------------ */

export function button(
  label: Child,
  onClick: (ev: MouseEvent) => void,
  opts: { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; ariaLabel?: string; disabled?: boolean; className?: string; title?: string } = {},
): HTMLButtonElement {
  const btn = h(
    'button',
    {
      className: `btn btn--${opts.variant ?? 'primary'}${opts.className ? ' ' + opts.className : ''}`,
      type: 'button',
      onClick,
      disabled: opts.disabled ?? false,
      attrs: {
        ...(opts.ariaLabel ? { 'aria-label': opts.ariaLabel } : {}),
        ...(opts.title ? { title: opts.title } : {}),
      },
    },
    label,
  );
  return btn;
}

/* ------------------------------------------------------------
 * Toast / snackbar (supports an action, e.g. Undo «برگردون»)
 * ------------------------------------------------------------ */

let activeToast: { el: HTMLElement; timer: number } | null = null;

export function toast(
  message: string,
  opts: { actionLabel?: string; onAction?: () => void; duration?: number; kind?: 'info' | 'success' | 'error' } = {},
): void {
  if (activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.el.remove();
    activeToast = null;
  }
  const el = h(
    'div',
    { className: `toast toast--${opts.kind ?? 'info'}`, attrs: { role: 'status', 'aria-live': 'polite' } },
    h('span', { className: 'toast__msg' }, message),
    opts.actionLabel && opts.onAction
      ? h(
          'button',
          {
            className: 'toast__action',
            type: 'button',
            onClick: () => {
              dismiss();
              opts.onAction?.();
            },
          },
          opts.actionLabel,
        )
      : null,
  );
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--in'));
  const dismiss = (): void => {
    el.classList.remove('toast--in');
    setTimeout(() => el.remove(), 250);
    if (activeToast?.el === el) activeToast = null;
  };
  const timer = setTimeout(dismiss, opts.duration ?? 4000) as unknown as number;
  activeToast = { el, timer };
}

/* ------------------------------------------------------------
 * Skeleton shimmer placeholders
 * ------------------------------------------------------------ */

export function skeleton(className = ''): HTMLElement {
  return h('div', { className: `skeleton ${className}`.trim(), attrs: { 'aria-hidden': 'true' } });
}

export function skeletonList(count: number, className = 'skeleton--row'): HTMLElement {
  const wrap = h('div', { className: 'skeleton-list' });
  for (let i = 0; i < count; i++) wrap.appendChild(skeleton(className));
  return wrap;
}

/* ------------------------------------------------------------
 * Progress bar & ring
 * ------------------------------------------------------------ */

export function progressBar(done: number, total: number): HTMLElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = h(
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
  return bar;
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

/* ------------------------------------------------------------
 * Empty / error states
 * ------------------------------------------------------------ */

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

/* ------------------------------------------------------------
 * Confirmation modal (glassmorphism overlay)
 * ------------------------------------------------------------ */

export function confirmDialog(title: string, message: string, confirmLabel = 'تأیید'): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (result: boolean): void => {
      overlay.classList.remove('overlay--in');
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    };
    const overlay = h(
      'div',
      {
        className: 'overlay',
        onClick: (ev) => {
          if (ev.target === overlay) close(false);
        },
        attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      },
      h(
        'div',
        { className: 'modal glass' },
        h('h3', { className: 'modal__title' }, title),
        h('p', { className: 'modal__msg' }, message),
        h(
          'div',
          { className: 'modal__actions' },
          button('انصراف', () => close(false), { variant: 'ghost', ariaLabel: 'انصراف' }),
          button(confirmLabel, () => close(true), { variant: 'danger', ariaLabel: confirmLabel }),
        ),
      ),
    );
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('overlay--in'));
  });
}

/* ------------------------------------------------------------
 * Gamification effects
 * ------------------------------------------------------------ */

/** Floating "+XP" indicator near an anchor element. */
export function xpFloat(anchor: HTMLElement, amount: number): void {
  if (amount <= 0) return;
  const rect = anchor.getBoundingClientRect();
  const el = h('div', { className: 'xp-float', attrs: { 'aria-hidden': 'true' } }, `+${faNum(amount)}`);
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/** Pure-CSS confetti burst for the celebration screen. */
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
