/**
 * Lightweight viewport patching for granular DOM updates.
 * Instead of replacing the entire mainEl, features mark dynamic
 * regions with `data-viewport` attributes. When only that region
 * needs to change, `patchViewport` swaps its content in-place.
 */

const VIEWPORT_ATTR = 'data-viewport';

export function viewport(id: string, ...children: (HTMLElement | string | null | undefined)[]): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute(VIEWPORT_ATTR, id);
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
}

export function findViewport(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector(`[${VIEWPORT_ATTR}="${id}"]`);
}

export function patchViewport(container: HTMLElement, viewportId: string, newContent: HTMLElement): void {
  const existing = findViewport(container, viewportId);
  if (existing && existing.parentNode) {
    existing.replaceWith(newContent);
  } else {
    container.appendChild(newContent);
  }
}

export function updateViewportText(container: HTMLElement, viewportId: string, text: string): void {
  const existing = findViewport(container, viewportId);
  if (existing) existing.textContent = text;
}
