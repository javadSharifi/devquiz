/* ============================================================
 * DevQuiz — platform/_chrome.ts
 * Per-platform re-export. esbuild's `alias` redirects
 * `import { platform } from '../platform/index.js'` to this
 * file in the Chrome build (and to _firefox.ts / _web.ts in
 * the others), so the right adapter ends up in each bundle
 * and the unused ones are dropped via dead-code elimination.
 * ============================================================ */

export { chromeAdapter as platform } from './chrome-adapter.js';
