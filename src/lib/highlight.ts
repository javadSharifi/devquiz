/* ============================================================
 * src/lib/highlight.ts
 * Syntax highlighting for fenced code blocks via highlight.js
 * (core + only the languages Next.js / Laravel content needs, so
 * the bundle stays small). GitHub-dark colours live in
 * styles/components/markdown.css.
 *
 * hljs returns an HTML string; it is NEVER assigned to innerHTML.
 * It is parsed into an inert document and rebuilt node-by-node:
 * only text nodes and <span class="hljs-…"> survive, so
 * markdown.ts's sanitizer guarantees still hold.
 * ============================================================ */

import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import graphql from 'highlight.js/lib/languages/graphql';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import php from 'highlight.js/lib/languages/php';
import phpTemplate from 'highlight.js/lib/languages/php-template';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const LANGUAGES = {
  bash, css, diff, dockerfile, graphql, ini, javascript, json, php, 'php-template': phpTemplate,
  scss, sql, typescript, xml, yaml,
};
for (const [name, def] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, def);
// hljs ships aliases for most (ts, tsx, js, jsx, html, sh, yml…); these are the extras content tends to use.
hljs.registerAliases(['env', 'dotenv'], { languageName: 'ini' });
hljs.registerAliases(['blade'], { languageName: 'php-template' });
hljs.registerAliases(['mysql', 'pgsql', 'postgres'], { languageName: 'sql' });
hljs.registerAliases(['vue', 'svg'], { languageName: 'xml' });

/** Only blocks tagged with a known language are coloured: hljs auto-detection misfires (JSON → CSS). */
export function highlightHtml(code: string, lang: string): string | null {
  try {
    return hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value : null;
  } catch {
    return null;
  }
}

function copyNodes(source: Node, target: Node): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const span = document.createElement('span');
      const cls = (child as Element).getAttribute('class') ?? '';
      if (/^[\w -]+$/.test(cls)) span.className = cls;
      copyNodes(child, span);
      target.appendChild(span);
    }
  }
}

/** Build DOM nodes (text + spans) for `code`; falls back to plain text. */
export function highlightToNodes(code: string, lang = ''): Node[] {
  const html = highlightHtml(code, lang);
  if (html === null) return [document.createTextNode(code)];
  const holder = document.createElement('div');
  copyNodes(new DOMParser().parseFromString(html, 'text/html').body, holder);
  return Array.from(holder.childNodes);
}
