/* ============================================================
 * DevQuiz — components/modal.ts
 * Confirmation modal with glassmorphism overlay. Resolves to
 * true on confirm, false on cancel / backdrop click.
 * ============================================================ */

import { h } from './hyperscript.js';
import { button } from './button.js';

export function confirmDialog(title: string, message: string, confirmLabel = 'تأیید'): Promise<boolean> {
  return new Promise((resolve) => {
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
    const close = (result: boolean): void => {
      overlay.classList.remove('overlay--in');
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    };
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('overlay--in'));
  });
}
