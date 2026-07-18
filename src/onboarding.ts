/* ============================================================
 * DevQuiz — onboarding.ts
 * First-run page: fetch the master catalog, let the user
 * download ≥1 topic, then unlock «شروع».
 * ============================================================ */

import {
  downloadTopic,
  fetchCatalog,
  getActiveTopicId,
  getDownloadedVersions,
  getTheme,
  runMigrations,
  setActiveTopicId,
  setOnboardingDone,
} from './storage.js';
import { type Theme, type TopicCatalogItem, faDigits } from './types.js';
import { button, errorCard, h, skeletonList, toast } from './ui.js';

const ICON_FALLBACK: Record<string, string> = {
  javascript: '🟨',
  typescript: '🟦',
  react: '⚛️',
  vue: '🟢',
  node: '🟩',
  python: '🐍',
  go: '🔵',
  rust: '🦀',
  java: '☕',
  css: '🎨',
  html: '🌐',
  sql: '🗄️',
  docker: '🐳',
  git: '🔧',
};

const ICON_URL_RE = /^(https?:|data:|\/\/)/i;

function pickIcon(item: TopicCatalogItem): string {
  if (item.icon && item.icon.length > 0) return item.icon;
  return ICON_FALLBACK[item.id] ?? '📘';
}

function topicIconEl(item: TopicCatalogItem): HTMLElement {
  const value = pickIcon(item);
  if (ICON_URL_RE.test(value)) {
    return h('img', {
      className: 'ob-card__icon ob-card__icon--img',
      attrs: { src: value, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' },
    });
  }
  return h('span', { className: 'ob-card__icon', attrs: { 'aria-hidden': 'true' } }, value);
}

const root = document.getElementById('onboarding');
if (!root) throw new Error('missing #onboarding root');

const grid = h('div', { className: 'ob-grid' });
const startBtn = button('شروع 🚀', () => void finish(), { variant: 'primary', className: 'btn--wide btn--big' });
startBtn.disabled = true;

let downloadedCount = 0;

root.append(
  h(
    'header',
    { className: 'ob-hero' },
    h('div', { className: 'ob-hero__logo', attrs: { 'aria-hidden': 'true' } }, '⚡'),
    h('h1', { className: 'ob-hero__title' }, 'به دِوکوئیز خوش اومدی'),
    h(
      'p',
      { className: 'ob-hero__sub' },
      'سوالات مصاحبه فنی رو مثل یه بازی تمرین کن — فلش‌کارت، استریک روزانه و امتیاز.',
    ),
  ),
  h('h2', { className: 'section-title' }, 'اول یک یا چند موضوع رو دانلود کن'),
  grid,
  h('footer', { className: 'ob-footer' }, startBtn),
);

void boot();

async function boot(): Promise<void> {
  await runMigrations();
  const theme: Theme = await getTheme();
  document.documentElement.setAttribute('data-theme', theme);
  const versions = await getDownloadedVersions();
  downloadedCount = Object.keys(versions).length;
  updateStart();
  await loadCatalog();
}

async function loadCatalog(): Promise<void> {
  grid.replaceChildren(skeletonList(4, 'skeleton--card'));
  try {
    const catalog = await fetchCatalog();
    const versions = await getDownloadedVersions();
    grid.replaceChildren();
    if (catalog.topics.length === 0) {
      grid.appendChild(
        h('p', { className: 'muted-note' }, 'فعلاً موضوعی در فهرست موجود نیست.'),
      );
      return;
    }
    for (const item of catalog.topics) {
      grid.appendChild(topicCard(item, versions[item.id] !== undefined));
    }
  } catch (e) {
    grid.replaceChildren(
      errorCard(
        e instanceof Error ? e.message : 'دریافت فهرست موضوعات ممکن نشد. اتصال اینترنت را بررسی کن.',
        () => void loadCatalog(),
      ),
    );
  }
}

function topicCard(item: TopicCatalogItem, alreadyDownloaded: boolean): HTMLElement {
  const status = h('span', { className: 'ob-card__status' });
  const btn = button(
    alreadyDownloaded ? '✓ دانلود شد' : 'دانلود',
    () => void download(),
    { variant: alreadyDownloaded ? 'ghost' : 'primary', ariaLabel: `دانلود ${item.title}` },
  );
  btn.disabled = alreadyDownloaded;

  async function download(): Promise<void> {
    btn.disabled = true;
    btn.replaceChildren(h('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }), ' در حال دانلود…');
    try {
      await downloadTopic(item);
      btn.replaceChildren('✓ دانلود شد');
      btn.classList.add('btn--done');
      status.textContent = '';
      downloadedCount++;
      const active = await getActiveTopicId();
      if (!active) await setActiveTopicId(item.id);
      updateStart();
      toast(`«${item.title}» آماده‌ست ✅`, { kind: 'success', duration: 2200 });
    } catch (e) {
      btn.disabled = false;
      btn.replaceChildren('تلاش دوباره');
      status.textContent = e instanceof Error ? e.message : 'دانلود ناموفق بود.';
    }
  }

  return h(
    'div',
    { className: 'ob-card glass' },
    h('div', { className: 'ob-card__head' },
      topicIconEl(item),
      h('h3', { className: 'ob-card__title' }, item.title),
    ),
    h('p', { className: 'ob-card__desc' }, item.description),
    h('span', { className: 'ob-card__ver' }, `نسخه ${faDigits(item.version)}`),
    btn,
    status,
  );
}

function updateStart(): void {
  startBtn.disabled = downloadedCount === 0;
  startBtn.title = downloadedCount === 0 ? 'اول حداقل یک موضوع را دانلود کن' : '';
}

async function finish(): Promise<void> {
  await setOnboardingDone(true);
  document.body.classList.add('ob-done');
  root?.replaceChildren(
    h(
      'div',
      { className: 'ob-finish' },
      h('div', { className: 'ob-finish__emoji', attrs: { 'aria-hidden': 'true' } }, '🎉'),
      h('h1', {}, 'همه‌چیز آماده‌ست!'),
      h('p', {}, 'حالا آیکون دِوکوئیز را در نوار ابزار مرورگر بزن و بازی رو شروع کن.'),
      button('بستن این صفحه', () => window.close(), { variant: 'ghost' }),
    ),
  );
}
