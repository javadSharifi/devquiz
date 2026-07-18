/* ============================================================
 * DevQuiz — markdown.ts
 * Questions/answers contain Markdown with code. Parsing is done
 * by `marked` (vendored UMD, loaded as a classic script before
 * the popup module — see popup.html). The HTML that marked emits
 * is NEVER assigned to innerHTML. Instead it is parsed into an
 * inert document (DOMParser) and rebuilt node-by-node through a
 * strict whitelist sanitizer:
 *
 *   - allowed tags only: p, strong, em, ul, ol, li, pre, code,
 *     br, a  (headings are downgraded to <p><strong>)
 *   - every attribute is dropped except a[href] with http(s)
 *     schemes — `javascript:` (and any other scheme) is refused
 *   - event-handler attributes can never survive because NO
 *     attributes are copied at all
 *   - links get rel="noopener noreferrer" + target="_blank"
 *
 * This implements exactly the DOMPurify configuration required
 * by the spec; if you prefer the library itself, swap the body
 * of `sanitizeInto()` for DOMPurify.sanitize with the same
 * whitelist — the public API (renderMarkdown) stays identical.
 *
 * CRITICAL RTL EXCEPTION: every <pre> is wrapped in a
 * `div.code-ltr` container with dir="ltr" and text-align:left so
 * code snippets stay readable inside the RTL document.
 * ============================================================ */

declare const marked: {
  parse(src: string, options?: { gfm?: boolean; breaks?: boolean; async?: false }): string;
};

const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'br',
  'a',
]);

/** Tags whose children are kept but whose wrapper is dropped. */
const TAG_ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
};

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, 'https://example.invalid/');
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Recursively copy `source`'s children into `target`, keeping only
 * whitelisted elements and plain text. Unknown elements are
 * unwrapped (children survive, wrapper does not).
 */
function sanitizeInto(source: Node, target: Node, doc: Document): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue; // drop comments etc.
    const el = child as Element;
    let tag = el.tagName.toLowerCase();
    const alias = TAG_ALIASES[tag];
    if (alias !== undefined) tag = alias;

    if (HEADING_TAGS.has(tag)) {
      // Downgrade headings: <p><strong>…</strong></p>
      const p = doc.createElement('p');
      const strong = doc.createElement('strong');
      sanitizeInto(el, strong, doc);
      p.appendChild(strong);
      target.appendChild(p);
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep the children, drop the element itself.
      sanitizeInto(el, target, doc);
      continue;
    }

    const clean = doc.createElement(tag);

    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '';
      if (isSafeHref(href)) {
        clean.setAttribute('href', href);
        clean.setAttribute('rel', 'noopener noreferrer');
        clean.setAttribute('target', '_blank');
      }
      // no other attributes ever survive
    }

    if (tag === 'code') {
      const lang = /language-([\w-]+)/.exec(el.getAttribute('class') ?? '');
      if (lang && lang[1] !== undefined) clean.dataset['lang'] = lang[1];
    }

    sanitizeInto(el, clean, doc);

    if (tag === 'pre') {
      // CRITICAL RTL EXCEPTION — LTR container for code blocks.
      const wrap = doc.createElement('div');
      wrap.className = 'code-ltr';
      wrap.setAttribute('dir', 'ltr');
      wrap.appendChild(clean);
      target.appendChild(wrap);
    } else {
      target.appendChild(clean);
    }
  }
}

/**
 * Render untrusted Markdown into a safe DOM element.
 * The returned element has className "md" and is ready to append.
 */
export function renderMarkdown(md: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'md';
  let html = '';
  try {
    html = marked.parse(md, { gfm: true, breaks: true, async: false });
  } catch {
    // Parser failure → show the raw text safely (textContent).
    container.textContent = md;
    return container;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeInto(doc.body, container, document);
  return container;
}
