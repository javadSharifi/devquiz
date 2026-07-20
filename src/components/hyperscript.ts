/* ============================================================
 * DevQuiz — components/hyperscript.ts
 * Typed hyperscript helper h() + svgIcon(). Pure DOM utility.
 * No business logic. No chrome.* or fetch.
 * ============================================================ */

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
        (el as any)[key] = val;
      }
    }
  }
  appendChildren(el, children);
  return el;
}

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
