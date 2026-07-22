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

const inflight = new Set<string>();

export function renderAllGames(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--all-games' });
  wrap.appendChild(h('h2', { className: 'view__title' }, 'همه بازی‌ها'));

  if (state.catalog.length === 0) {
    wrap.appendChild(emptyState('📦', 'در حال دریافت فهرست…', ''));
    return wrap;
  }

  const downloaded = state.catalog.filter((item) => state.topics[item.id] !== undefined);
  const notDownloaded = state.catalog.filter((item) => state.topics[item.id] === undefined);

  if (downloaded.length > 0) {
    wrap.appendChild(h('h3', { className: 'section-title' }, `بازی‌های انتخاب شده (${faNum(downloaded.length)})`));
    wrap.appendChild(renderGrid(downloaded, state));
  }

  if (notDownloaded.length > 0) {
    wrap.appendChild(h('h3', { className: 'section-title' }, `بازی‌های انتخاب نشده (${faNum(notDownloaded.length)})`));
    wrap.appendChild(renderGrid(notDownloaded, state));
  }

  wrap.appendChild(renderUpdateStatus(state));
  return wrap;
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

  const card = h(
    'div',
    {
      className: `game-card glass${active ? ' game-card--active' : ''}${hasUpdate ? ' game-card--update' : ''}${!isDownloaded || downloading ? ' game-card--loading' : ''}`,
      attrs: { role: 'listitem', 'aria-pressed': String(active) },
    },
    h('div', { className: 'game-card__head' },
      topicIconEl(item),
      h('div', { className: 'game-card__titles' },
        h('span', { className: 'game-card__title' }, item.title),
        isDownloaded ? h('span', { className: 'game-card__ver' }, `نسخه ${faDigits(item.version)}`) : null,
      ),
      active
        ? h('span', { className: 'game-card__active-badge', attrs: { 'aria-hidden': 'true' } }, 'فعال')
        : hasUpdate
          ? h('span', { className: 'game-card__update-badge', attrs: { 'aria-hidden': 'true' } }, 'بروزرسانی')
          : null,
    ),
    isDownloaded && !downloading
      ? h('div', { className: 'game-card__meta' },
          h('span', {}, `${faNum(totalQuestions)} سؤال`),
          h('span', {}, `${faNum(answered)} پاسخ`),
        )
      : downloading
        ? h('div', { className: 'game-card__meta' },
            h('span', { className: 'game-card__status' }, 'در حال دانلود…'),
          )
        : null,
    isDownloaded && !downloading
      ? h('div', { className: 'game-card__bar' },
          h('div', { className: 'game-card__bar-fill', style: { width: `${pct(answered, totalQuestions)}%` } }),
        )
      : null,
    hasUpdate
      ? h('div', { className: 'game-card__actions' },
          button('بروزرسانی', (e) => {
            e.stopPropagation();
            void downloadOne(item);
          }, { variant: 'primary', className: 'game-card__update-btn' }),
        )
      : null,
  );

  if (isDownloaded && !hasUpdate && !downloading) {
    card.classList.add('game-card--clickable');
    card.addEventListener('click', () => selectTopic(item.id));
  } else if (!isDownloaded && !downloading) {
    card.classList.add('game-card--clickable');
    card.addEventListener('click', () => void downloadOne(item));
  }
  return card;
}

function renderUpdateStatus(state: AppState): HTMLElement {
  const versions = state.downloadedVersions;
  const downloadedCount = state.catalog.filter((c) => versions[c.id] !== undefined).length;
  const total = state.catalog.length;
  const allDone = downloadedCount === total;
  const note = allDone
    ? 'همه بازی‌ها دانلود شده‌اند ✨'
    : `دانلود شده ${faNum(downloadedCount)} از ${faNum(total)}`;
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
  toast('موضوع فعال شد ✅', { kind: 'success', duration: 1600 });
}

async function downloadOne(item: TopicCatalogItem): Promise<void> {
  if (inflight.has(item.id)) return;
  inflight.add(item.id);
  try {
    await downloadTopic(item);
    const [topics, versions, us] = await Promise.all([getTopics(), getDownloadedVersions(), getUserStates()]);
    inflight.delete(item.id);
    store.dispatch({ type: 'REPLACE_TOPICS', topics });
    store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
    store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
    store.dispatch({ type: 'DATA_CHANGED' });
  } catch (e) {
    inflight.delete(item.id);
    toast(`دانلود «${item.title}» ناموفق بود.`, { kind: 'error', duration: 3000 });
  }
}
