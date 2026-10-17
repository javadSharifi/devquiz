import { h, svgIcon, type Child } from '../../components/hyperscript.js';

/** Stroke paths (24x24 viewBox) shared by the settings screens. */
export const ICON = {
  sync: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 20h16',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-9',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.5 7.6A17 17 0 0 0 2 12s4 6 10 6c1.5 0 2.8-.4 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
} as const;

export function icon(path: string, size = 18): SVGSVGElement {
  return svgIcon(path, size);
}

/** A labelled settings group: small caption above a content block. */
export function settingsSection(title: string, ...children: Child[]): HTMLElement {
  return h(
    'section',
    { className: 'st-section' },
    h('h3', { className: 'st-section__title' }, title),
    ...children,
  );
}
