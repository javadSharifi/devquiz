import { store } from '../state.js';
import {
  downloadTopic,
  getDownloadedVersions,
  getTopics,
  getUserStates,
} from '../storage.js';
import { getMergedTopic } from '../lib/topic-utils.js';
import { topicIconEl } from '../lib/helpers.js';
import { compareVersions, faDigits, faNum } from '../types.js';
import type { TopicCatalogItem } from '../types.js';
import type { AppState } from '../state.js';
import { button, emptyState, h, toast } from '../ui.js';
import { ico } from '../components/icons.js';

const inflight = new Set<string>();

export function renderAllGames(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--all-games' });
  wrap.appendChild(
    h(
      'header',
      { className: 'ag-head' },
      h('h2', { className: 'ag-head__title' }, 'همه بازی‌ها'),
      h('p', { className: 'ag-head__sub' }, 'موضوع فعال را عوض کن یا بازی تازه اضافه کن'),
    ),
  );

  wrap.appendChild(
    h(
      'button',
      {
        className: 'all-games__search-bar glass',
        type: 'button',
        attrs: { 'aria-label': 'جستجو در تمام سؤال‌ها' },
        onClick: () => store.dispatch({ type: 'SET_TAB', tab: 'search' }),
      },
      h('span', { className: 'all-games__search-icon', attrs: { 'aria-hidden': 'true' } }, ico('search', 18)),
      h('span', { className: 'all-games__search-text' }, 'جستجو در بین تمام سؤالات و پاسخ‌ها…'),
      h('span', { className: 'all-games__search-badge' }, 'همه JSONها'),
    ),
  );

  if (state.catalog.length === 0) {
    wrap.appendChild(emptyState(ico('inbox', 42), 'در حال دریافت فهرست…', ''));
    return wrap;
  }

  const downloaded = state.catalog.filter((item) => state.topics[item.id] !== undefined);
  const notDownloaded = state.catalog.filter((item) => state.topics[item.id] === undefined);

  if (downloaded.length > 0) {
    wrap.appendChild(sectionHead('بازی‌های من', downloaded.length));
    wrap.appendChild(renderGrid(downloaded, state));
  }

  if (notDownloaded.length > 0) {
    wrap.appendChild(sectionHead('بازی‌های جدید', notDownloaded.length));
    wrap.appendChild(renderGrid(notDownloaded, state));
  }

  wrap.appendChild(renderUpdateStatus(state));
  return wrap;
}

function sectionHead(title: string, count: number): HTMLElement {
  return h(
    'div',
    { className: 'ag-section' },
    h('h3', { className: 'ag-section__title' }, title),
    h('span', { className: 'ag-section__count' }, faNum(count)),
  );
}

function renderGrid(items: TopicCatalogItem[], state: AppState): HTMLElement {
  const grid = h('div', { className: 'all-games__grid', attrs: { role: 'list' } });
  for (const item of items) {
    grid.appendChild(gameCard(state, item));
  }
  return grid;
}

function gameCard(state: AppState, item: TopicCatalogItem): HTMLElement {
  const topic = state.topics[item.id];
  const isDownloaded = topic !== undefined;
  const version = state.downloadedVersions[item.id] ?? '';
  const hasUpdate = isDownloaded && compareVersions(item.version, version) > 0;
  const active = item.id === state.activeTopicId;
  const merged = getMergedTopic(item.id);
  const totalQuestions = merged ? merged.categories.reduce((acc, c) => acc + c.questions.length, 0) : 0;
  const answered = countAnswered(state, item.id);
  const downloading = inflight.has(item.id);
  const percent = pct(answered, totalQuestions);

  const cls = ['game-card'];
  if (active) cls.push('game-card--active');
  if (hasUpdate) cls.push('game-card--update');
  if (downloading) cls.push('game-card--loading');
  if (!isDownloaded) cls.push('game-card--new');

  let sub: HTMLElement;
  if (downloading) {
    sub = h('span', { className: 'game-card__sub game-card__sub--busy' }, h('span', { className: 'spinner' }), ' در حال دانلود…');
  } else if (isDownloaded) {
    sub = h('span', { className: 'game-card__sub' }, `${faNum(totalQuestions)} سؤال · ${faNum(answered)} پاسخ · نسخه ${faDigits(item.version)}`);
  } else {
    sub = h('span', { className: 'game-card__sub game-card__sub--desc' }, item.description || 'سؤال‌های مصاحبه و مرور');
  }

  let trailing: HTMLElement;
  if (downloading) {
    trailing = h('span', { className: 'game-card__trail' });
  } else if (!isDownloaded) {
    trailing = h('span', { className: 'game-card__trail game-card__trail--add', attrs: { 'aria-hidden': 'true' } }, ico('plus', 18));
  } else if (active) {
    trailing = h('span', { className: 'game-card__badge game-card__badge--active' }, ico('check', 12), 'فعال');
  } else {
    trailing = h('span', { className: 'game-card__pct' }, `${faNum(percent)}٪`);
  }

  const onActivate = (): void => {
    if (downloading) return;
    if (isDownloaded) selectTopic(item.id);
    else void downloadOne(item);
  };

  const main = h(
    'button',
    {
      className: 'game-card__main',
      type: 'button',
      disabled: downloading,
      attrs: {
        'aria-label': isDownloaded ? `فعال‌سازی ${item.title}` : `دانلود ${item.title}`,
        ...(isDownloaded ? { 'aria-pressed': String(active) } : {}),
      },
      onClick: onActivate,
    },
    h('span', { className: 'game-card__icon' }, topicIconEl(item)),
    h('span', { className: 'game-card__text' }, h('span', { className: 'game-card__title' }, item.title), sub),
    trailing,
  );

  return h(
    'div',
    { className: cls.join(' '), attrs: { role: 'listitem' } },
    main,
    isDownloaded && !downloading
      ? h('div', { className: 'game-card__bar', attrs: { 'aria-hidden': 'true' } },
          h('div', { className: 'game-card__bar-fill', style: { width: `${percent}%` } }),
        )
      : null,
    hasUpdate && !downloading
      ? button([ico('flip', 14), 'بروزرسانی به نسخه ' + faDigits(item.version)], () => void downloadOne(item), {
          variant: 'soft',
          className: 'game-card__update-btn',
        })
      : null,
  );
}

function renderUpdateStatus(state: AppState): HTMLElement {
  const versions = state.downloadedVersions;
  const downloadedCount = state.catalog.filter((c) => versions[c.id] !== undefined).length;
  const total = state.catalog.length;
  const allDone = downloadedCount === total;
  const note = allDone
    ? 'همه بازی‌ها دانلود شده‌اند'
    : `${faNum(downloadedCount)} از ${faNum(total)} بازی دانلود شده`;
  return h('div', { className: 'all-games__update-host', id: 'all-games-update-host' },
    h('div', { className: 'all-games__update-note' }, note),
  );
}

function countAnswered(state: AppState, topicId: string): number {
  let n = 0;
  const prefix = `${topicId}:`;
  for (const key of Object.keys(state.userStates)) {
    if (!key.startsWith(prefix)) continue;
    const s = state.userStates[key];
    if (s && (s.state === 'know' || s.state === 'want_to_learn')) n++;
  }
  return n;
}

function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function selectTopic(id: string): void {
  store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: id });
  store.dispatch({ type: 'SET_TAB', tab: 'game' });
  toast('موضوع فعال شد', { kind: 'success', duration: 1600 });
}

function state0IsUpdate(item: TopicCatalogItem): boolean {
  return store.getState().topics[item.id] !== undefined;
}

async function downloadOne(item: TopicCatalogItem): Promise<void> {
  if (inflight.has(item.id)) return;
  inflight.add(item.id);
  const isUpdate = state0IsUpdate(item);
  toast(`${isUpdate ? 'در حال بروزرسانی' : 'در حال دانلود'} «${item.title}»…`, { kind: 'info', duration: 2000 });
  // re-render now so the card shows its loading state while the request runs
  store.dispatch({ type: 'DATA_CHANGED' });
  try {
    await downloadTopic(item);
    const [topics, versions, us] = await Promise.all([getTopics(), getDownloadedVersions(), getUserStates()]);
    inflight.delete(item.id);
    store.dispatch({ type: 'REPLACE_TOPICS', topics });
    store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
    store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
    store.dispatch({ type: 'DATA_CHANGED' });
    toast(`«${item.title}» ${isUpdate ? 'بروزرسانی شد' : 'دانلود شد'}`, { kind: 'success', duration: 2500 });
  } catch (e) {
    inflight.delete(item.id);
    store.dispatch({ type: 'DATA_CHANGED' });
    const msg = e instanceof Error ? e.message : 'خطای نامشخص';
    toast(`دانلود «${item.title}» ناموفق بود: ${msg}`, { kind: 'error', duration: 4000 });
  }
}
