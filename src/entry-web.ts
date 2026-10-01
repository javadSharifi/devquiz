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
  const navEl = h('nav', { className: 'bottom-nav', attrs: { 'aria-label': 'ناوبری اصلی' } });
  const mainEl = h('main', { className: 'app-main' });
  const liveRegion = h('div', {
    className: 'sr-only',
    attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  });

  root.replaceChildren(headerEl, navEl, mainEl, liveRegion);
  return { headerEl, navEl, mainEl, liveRegion };
}

async function preseedLocalTopics(): Promise<void> {
  try {
    const raw = window.localStorage.getItem('devquiz.web.local.topics');
    if (!raw || raw === '{}') {
      const [gitRes, catalogRes] = await Promise.all([
        fetch('./data/git.json').catch(() => null),
        fetch('./data/catalog.json').catch(() => null),
      ]);
      if (gitRes && gitRes.ok) {
        const git = await gitRes.json();
        window.localStorage.setItem('devquiz.web.local.topics', JSON.stringify({ git }));
        window.localStorage.setItem('devquiz.web.local.downloaded_versions', JSON.stringify({ git: '1.2.0' }));
        window.localStorage.setItem('devquiz.web.local.active_topic_id', JSON.stringify('git'));
      }
      if (catalogRes && catalogRes.ok) {
        const cat = await catalogRes.json();
        if (cat?.topics) {
          window.localStorage.setItem('devquiz.web.local.catalog', JSON.stringify(cat.topics));
        }
      }
    }
  } catch {
    // Non-fatal
  }
}

async function main(): Promise<void> {
  await preseedLocalTopics();
  const shell = mountShell();
  if (!shell) return;
  await bootstrap(shell);
}

void main();
