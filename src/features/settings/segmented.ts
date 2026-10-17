import { h } from '../../components/hyperscript.js';

export function segmentedGroup<T extends string>(
  options: readonly T[],
  labels: Record<T, string>,
  active: T,
  onPick: (v: T) => void,
  groupLabel: string,
): HTMLElement {
  const group = h('div', {
    className: 'seg-group',
    attrs: { role: 'radiogroup', 'aria-label': groupLabel },
  });
  for (const opt of options) {
    const isActive = opt === active;
    group.appendChild(
      h(
        'button',
        {
          className: `seg${isActive ? ' seg--active' : ''}`,
          type: 'button',
          attrs: {
            role: 'radio',
            'aria-checked': String(isActive),
            'aria-label': `${groupLabel}: ${opt}`,
            tabindex: isActive ? '0' : '-1',
          },
          dataset: { value: opt },
          onClick: () => onPick(opt),
        },
        labels[opt],
      ),
    );
  }
  return group;
}
