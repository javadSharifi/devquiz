/* ============================================================
 * DevQuiz — components/toast.ts
 * Single-instance toast with optional action. Replaces any
 * currently-visible toast on a new call.
 * ============================================================ */

import { h } from './hyperscript.js';

let activeToast: { el: HTMLElement; timer: ReturnType<typeof setTimeout> } | null = null;

export interface ToastOpts {
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  kind?: 'info' | 'success' | 'error';
}

export function toast(message: string, opts: ToastOpts = {}): void {
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
  const timer = setTimeout(dismiss, opts.duration ?? 4000);
  activeToast = { el, timer };
}
