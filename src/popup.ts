/* ============================================================
 * DevQuiz — popup.ts
 * Application entry point. Mounts the shell DOM and hands control
 * to app/bootstrap.ts. All wiring lives under src/app/*.
 * ============================================================ */

import { h, skeleton, skeletonList } from './ui.js';
import { bootstrap } from './app/bootstrap.js';
import type { AppShell } from './app/router.js';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app root');

if (new URLSearchParams(location.search).get('fs') === '1') {
  document.body.classList.add('fullscreen');
}

const shell: AppShell = {
  headerEl: h('header', { className: 'app-header' }),
  mainEl: h('main', { className: 'app-main', id: 'app-main' }),
  navEl: h('nav', { className: 'bottom-nav', attrs: { 'aria-label': 'ناوبری اصلی' } }),
  liveRegion: h('div', {
    className: 'sr-only',
    attrs: { 'aria-live': 'polite', role: 'status' },
  }),
};
root.append(shell.headerEl, shell.mainEl, shell.navEl, shell.liveRegion);

shell.mainEl.append(
  skeleton('skeleton--header'),
  skeletonList(3, 'skeleton--card'),
);

void bootstrap(shell);
