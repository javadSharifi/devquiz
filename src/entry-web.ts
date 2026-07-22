/* ============================================================
 * DevQuiz — entry-web.ts
 * Web (GitHub Pages) entry. Boots the same app shell the
 * extension popup uses, in fullscreen layout. No service
 * worker, no badge, no tab.create — the platform adapter
 * short-circuits those for the web target.
 * ============================================================ */

import { h } from './components/hyperscript.js';
import { bootstrap } from './app/bootstrap.js';
import type { AppShell } from './app/router.js';

function mountShell(): AppShell | null {
  const root = document.getElementById('app');
  if (!root) return null;

  const headerEl = h('header', { className: 'app-header' });
  const navEl = h('nav', { className: 'app-nav' });
  const mainEl = h('main', { className: 'app-main' });
  const liveRegion = h('div', {
    className: 'sr-only',
    attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  });

  root.replaceChildren(headerEl, navEl, mainEl, liveRegion);
  return { headerEl, navEl, mainEl, liveRegion };
}

async function main(): Promise<void> {
  const shell = mountShell();
  if (!shell) return;
  await bootstrap(shell);
}

void main();
