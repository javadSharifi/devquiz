/* ============================================================
 * DevQuiz — components/icons.ts
 * Named stroke icons (24x24 viewBox) used in place of emoji.
 * ============================================================ */

import { svgIcon } from './hyperscript.js';

export const ICONS = {
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6L6 18',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  check: 'M5 12l5 5 9-9',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM19 19v2H6',
  skip: 'M5 5l10 7-10 7V5zM19 5v14',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7z',
  sprout: 'M7 20h10M12 20v-9M12 11c0-4-3-6-7-6 0 4 3 6 7 6zM12 13c0-3 2-5 6-5 0 3-2 5-6 5z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8l-1 3 2 1v0l-2 1 1 3 2-.5 1.5 1.5L7 19l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  cards: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17h.01',
  flip: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  play: 'M7 4l13 8-13 8V4z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  hand: 'M12 3v10M8 9l4-6 4 6M5 21h14',
  chevron: 'M15 6l-6 6 6 6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  image: 'M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 17l5-5 4 4 3-3 4 4',
  person: 'M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 8h14M12 8v6M9 21l3-7 3 7',
  flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  landmark: 'M4 21h16M6 21V8l6-4 6 4v13M10 21v-6h4v6',
  cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  bug: 'M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9zM5 9l4 2M19 9l-4 2M5 15l4-1M19 15l-4-1M9 6L7 3M15 6l2-3',
  hourglass: 'M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  plug: 'M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0V8zM12 17v4',
  antenna: 'M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0M12 19h.01',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  scale: 'M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z',
  tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01',
  monitor: 'M4 5h16v11H4zM8 21h8M12 16v5',
  branch: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
  bot: 'M5 8h14v10H5zM12 8V4M9 13h.01M15 13h.01M3 13h2M19 13h2',
  cookie: 'M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5zM8 11h.01M12 16h.01M15 12h.01',
  anchor: 'M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 8v13M5 12H3a9 9 0 0 0 18 0h-2M8 12h8',
  wave: 'M2 8c3-3 5 3 8 0s5 3 8 0M2 14c3-3 5 3 8 0s5 3 8 0',
  video: 'M4 6h16v12H4zM4 10h16M8 6l-2 4M13 6l-2 4M18 6l-2 4',
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9H7z',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M17 14a6 6 0 0 1 4 6',
  phone: 'M8 3h8v18H8zM12 18h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 3 7 3 9H3c0-2 3-3 3-9zM10 21h4',
} as const;

export type IconName = keyof typeof ICONS;

/** An inline SVG icon by name; inherits the surrounding text color. */
export function ico(name: IconName, size = 18): SVGSVGElement {
  const svg = svgIcon(ICONS[name], size);
  svg.classList.add('ico');
  return svg;
}

const EMOJI_ICON: Record<string, IconName> = {
  '⚡': 'bolt', '🚀': 'bolt', '🚄': 'bolt', '🛸': 'sparkles', '✨': 'sparkles',
  '🌐': 'globe', '🗺': 'map', '🧭': 'compass',
  '🧩': 'layers', '🧱': 'layers', '🌀': 'flip', '🔄': 'flip', '🔁': 'flip',
  '⚙': 'gear', '🔧': 'gear', '🛠': 'gear',
  '🎨': 'image', '🖼': 'image', '♿': 'person', '👥': 'users',
  '🧪': 'flask', '🔬': 'flask', '📦': 'box', '🐳': 'box',
  '🔐': 'lock', '🔒': 'lock', '🛡': 'shield', 'shield-alert': 'shield',
  '🗄': 'database', '🗃': 'database',
  '🏗': 'landmark', '🏛': 'landmark', '📐': 'landmark',
  '🧠': 'cpu', '🧬': 'cpu', '🤖': 'bot', '💻': 'monitor', '🖥': 'monitor', '📱': 'phone',
  '📊': 'chart', '🔍': 'search', '🕷': 'search', '🐞': 'bug', '🚨': 'alert',
  '⏳': 'hourglass', '⏪': 'history',
  '📘': 'book', '📝': 'file', '📋': 'clipboard', '🔤': 'type',
  '🎯': 'target', '🏁': 'target', '⚛': 'code', '🔗': 'link', '💼': 'briefcase',
  '🧮': 'hash', '🔌': 'plug', '📡': 'antenna', '⚖': 'scale', '🏷': 'tag',
  '🌿': 'branch', '🍪': 'cookie', '🪝': 'anchor', '⚓': 'anchor', '🌊': 'wave',
  '🎬': 'video', '☁': 'cloud', '🌱': 'sprout', '📂': 'folder', '🗂': 'folder',
  '✅': 'checkCircle', '🐧': 'monitor',
};

/** Category/topic emoji from content data → matching SVG icon (folder when unknown). */
export function catIcon(raw: string | undefined, size = 18): SVGSVGElement {
  const key = (raw ?? '').replace(/\uFE0F/g, '').trim();
  return ico(EMOJI_ICON[key] ?? 'folder', size);
}
