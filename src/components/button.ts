/* ============================================================
 * DevQuiz — components/button.ts
 * Single-variant button factory. Stateless. Callbacks only.
 * ============================================================ */

import { h, type Child } from './hyperscript.js';

export interface ButtonOpts {
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function button(
  label: Child,
  onClick: (ev: MouseEvent) => void,
  opts: ButtonOpts = {},
): HTMLButtonElement {
  const variant = opts.variant ?? 'primary';
  const className = `btn btn--${variant}${opts.className ? ' ' + opts.className : ''}`;
  const attrs: Record<string, string> = {};
  if (opts.ariaLabel) attrs['aria-label'] = opts.ariaLabel;
  if (opts.title) attrs['title'] = opts.title;
  return h(
    'button',
    {
      className,
      type: 'button',
      onClick,
      disabled: opts.disabled ?? false,
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
    },
    label,
  );
}
