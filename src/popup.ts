import { store } from './state.js';
import {
  addCustomQuestion,
  downloadTopic,
  fetchCatalog,
  getActiveTopicId,
  getCustomQuestions,
  getDownloadedVersions,
  getFontSize,
  getGamification,
  getRecentTopics,
  getSession,
  getTheme,
  getTopics,
  getUserStates,
  runMigrations,
  saveGamification,
  saveRecentTopics,
  setActiveTopicId,
  setFontSize,
  setTheme,
  setUserStateEntry,
} from './storage.js';
import type { AppState } from './state.js';
import { faNum, type FontSize, type Theme } from './types.js';
import {
  button,
  emptyState,
  errorCard,
  h,
  skeleton,
  skeletonList,
  svgIcon,
  toast,
} from './ui.js';
import { applyFlip } from './components/flashcard.js';
import { renderGame, patchGameCard } from './features/game.js';
import { renderAllGames } from './features/all-games.js';
import { renderReview, pickRandomQuestion } from './features/review.js';
import { renderAdd } from './features/add.js';
import { renderSettings } from './features/settings.js';
import { topicIconEl } from './lib/helpers.js';
import { answerCurrentCard, answerRandomCard, setLastFlashcard, XP_PER_STATE } from './lib/undo.js';
import { findQuestion } from './lib/topic-utils.js';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app root');
const headerEl = h('header', { className: 'app-header' });
const mainEl = h('main', { className: 'app-main', id: 'app-main' });
const navEl = h('nav', { className: 'bottom-nav', attrs: { 'aria-label': 'ناوبری اصلی' } });
const liveRegion = h('div', {
  className: 'sr-only',
  attrs: { 'aria-live': 'polite', role: 'status' },
});
root.append(headerEl, mainEl, navEl, liveRegion);

mainEl.append(
  skeleton('skeleton--header'),
  skeletonList(3, 'skeleton--card'),
);

void init();

async function init(): Promise<void> {
  try {
    await runMigrations();
    const [topics, userStates, customQuestions, downloadedVersions, gamification, activeTopic, session, recentTopics] = await Promise.all([
      getTopics(),
      getUserStates(),
      getCustomQuestions(),
      getDownloadedVersions(),
      getGamification(),
      getActiveTopicId(),
      getSession(),
      getRecentTopics(),
    ]);

    store.dispatch({ type: 'HYDRATE', payload: { topics, userStates, customQuestions, downloadedVersions, gamification, recentTopics } });

    const topicIds = Object.keys(topics);
    let resolvedTopic = activeTopic && topics[activeTopic] ? activeTopic : (topicIds[0] ?? '');
    if (resolvedTopic && resolvedTopic !== activeTopic) void setActiveTopicId(resolvedTopic);
    store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: resolvedTopic });

    const fontSize = await getFontSize();
    store.dispatch({ type: 'SET_FONT_SIZE', fontSize });
    applyFontSize(fontSize);

    const theme = await getTheme();
    store.dispatch({ type: 'SET_THEME', theme });
    applyTheme(theme);

    if (session && session.activeTopicId && topics[session.activeTopicId]) {
      const validQueue = session.queue.filter((id) => findQuestion(session.activeTopicId, id) !== null);
      store.dispatch({
        type: 'RESTORE',
        snapshot: {
          activeTab: session.activeTab,
          activeTopicId: session.activeTopicId,
          selectedLevel: session.selectedLevel,
          selectedCategoryId: session.selectedCategoryId,
          currentQuestionIndex: Math.min(session.currentQuestionIndex, Math.max(0, validQueue.length - 1)),
          queue: validQueue,
          sessionXp: session.sessionXp,
          sessionAnswered: session.sessionAnswered,
        },
      });
      if (session.selectedCategoryId) {
        toast('ادامه از جایی که بودی 👋', { duration: 2200, kind: 'info' });
      }
    }
  } catch {
    mainEl.replaceChildren(
      errorCard('خواندن داده‌های ذخیره‌شده ممکن نشد.', () => window.location.reload()),
    );
    return;
  }

  renderHeader();
  renderNav();
  renderMain(store.getState());
  bindKeyboard();
  void fetchCatalog().then((c) => store.dispatch({ type: 'SET_CATALOG', catalog: c.topics })).catch(() => {});

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flushPersist();
  });

  store.subscribe((state, prev) => {
    if (state.fontSize !== prev.fontSize && state.activeTab === 'settings') {
      renderMain(state);
      return;
    }
    if (state.theme !== prev.theme && state.activeTab === 'settings') {
      renderMain(state);
      return;
    }
    if (state.activeTab !== prev.activeTab) {
      renderNav();
      if (state.activeTab === 'settings') {
        void chrome.action.setBadgeText({ text: '' });
      }
      renderMain(state);
      return;
    }
    if (state.gamification !== prev.gamification) {
      updateHeaderStats();
    }
    if (
      state.activeTopicId !== prev.activeTopicId ||
      state.selectedLevel !== prev.selectedLevel ||
      state.selectedCategoryId !== prev.selectedCategoryId ||
      state.dataRevision !== prev.dataRevision ||
      state.topics !== prev.topics ||
      (state.catalog !== prev.catalog && (Object.keys(state.topics).length > 0 || state.activeTab !== 'game'))
    ) {
      renderMain(state);
      return;
    }
    if (
      state.activeTab === 'game' &&
      prev.activeTab === 'game' &&
      state.selectedCategoryId !== null &&
      prev.selectedCategoryId !== null &&
      state.selectedCategoryId === prev.selectedCategoryId &&
      (state.currentQuestionIndex !== prev.currentQuestionIndex || state.queue !== prev.queue)
    ) {
      if (state.selectedLevel && !patchGameCard(state, state.selectedLevel)) {
        renderMain(state);
      }
      return;
    }
    if (
      state.randomQuestionId !== prev.randomQuestionId ||
      state.currentQuestionIndex !== prev.currentQuestionIndex ||
      state.queue !== prev.queue
    ) {
      renderMain(state);
      return;
    }
    if (state.isFlipped !== prev.isFlipped) {
      applyFlip(state.isFlipped, mainEl, liveRegion);
      return;
    }
  });

  store.onAction((action) => {
    switch (action.type) {
      case 'SET_USER_STATE':
        void setUserStateEntry(action.key, action.value);
        break;
      case 'SET_GAMIFICATION':
        void saveGamification(action.gamification);
        break;
      case 'ADD_CUSTOM_QUESTION':
        void addCustomQuestion(action.question);
        break;
      case 'SET_ACTIVE_TOPIC':
        void setActiveTopicId(action.topicId);
        void saveRecentTopics(store.getState().recentTopics);
        break;
      case 'SET_FONT_SIZE':
        void setFontSize(action.fontSize);
        applyFontSize(action.fontSize);
        break;
      case 'SET_THEME':
        void setTheme(action.theme);
        applyTheme(action.theme);
        break;
    }
  });
}

let streakValueEl: HTMLElement | null = null;
let xpValueEl: HTMLElement | null = null;

function renderHeader(): void {
  const { gamification } = store.getState();
  streakValueEl = h('span', { className: 'stat__value' }, faNum(gamification.streak));
  xpValueEl = h('span', { className: 'stat__value' }, faNum(gamification.xp));
  headerEl.replaceChildren(
    h('div', { className: 'brand' }, h('span', { className: 'brand__logo', attrs: { 'aria-hidden': 'true' } }, '⚡'), 'دِوکوئیز'),
    h(
      'div',
      { className: 'header-stats' },
      h(
        'div',
        { className: 'stat stat--streak', title: 'استریک روزانه', attrs: { 'aria-label': `استریک: ${faNum(gamification.streak)} روز` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, '🔥'),
        streakValueEl,
      ),
      h(
        'div',
        { className: 'stat stat--xp', title: 'امتیاز تجربه', attrs: { 'aria-label': `امتیاز: ${faNum(gamification.xp)}` } },
        h('span', { className: 'stat__icon', attrs: { 'aria-hidden': 'true' } }, '✦'),
        xpValueEl,
        h('span', { className: 'stat__unit' }, 'XP'),
      ),
    ),
  );
}

function updateHeaderStats(): void {
  const { gamification } = store.getState();
  if (streakValueEl) streakValueEl.textContent = faNum(gamification.streak);
  if (xpValueEl) {
    xpValueEl.textContent = faNum(gamification.xp);
    xpValueEl.parentElement?.classList.remove('stat--pulse');
    void xpValueEl.parentElement?.offsetWidth;
    xpValueEl.parentElement?.classList.add('stat--pulse');
  }
}

const NAV_ITEMS: { tab: 'game' | 'all-games' | 'review' | 'add' | 'settings'; label: string; icon: string }[] = [
  { tab: 'game', label: 'بازی', icon: 'M6 12h4m-2-2v4m8-3h.01M18 13h.01M7 5h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z' },
  { tab: 'all-games', label: 'همه بازی‌ها', icon: 'M4 5h16M4 12h16M4 19h16' },
  { tab: 'review', label: 'مرور', icon: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16l-8-4-8 4V5z' },
  { tab: 'add', label: 'اضافه', icon: 'M12 5v14M5 12h14' },
  { tab: 'settings', label: 'تنظیمات', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z' },
];

function renderNav(): void {
  const state = store.getState();
  navEl.replaceChildren(
    ...NAV_ITEMS.map(({ tab, label, icon }) => {
      const active = state.activeTab === tab;
      return h(
        'button',
        {
          className: `nav-item${active ? ' nav-item--active' : ''}`,
          type: 'button',
          attrs: { 'aria-label': label, 'aria-current': active ? 'page' : 'false' },
          onClick: () => store.dispatch({ type: 'SET_TAB', tab }),
        },
        svgIcon(icon, 22),
        h('span', { className: 'nav-item__label' }, label),
      );
    }),
  );
}

function renderMain(state: AppState): void {
  setLastFlashcard(null);
  let view: HTMLElement;
  if (Object.keys(state.topics).length === 0) {
    view = renderNoTopics();
  } else {
    switch (state.activeTab) {
      case 'game':
        view = renderGame(state);
        break;
      case 'all-games':
        view = renderAllGames(state);
        break;
      case 'review':
        view = renderReview(state);
        break;
      case 'add':
        view = renderAdd(state);
        break;
      case 'settings':
        view = renderSettings(state);
        break;
      default:
        view = emptyState('', '', '');
    }
  }
  mainEl.replaceChildren(view);
}

function applyFontSize(size: FontSize): void {
  const map: Record<FontSize, string> = { small: '12px', medium: '14px', large: '16px', extra: '18px' };
  document.documentElement.style.setProperty('--font-size', map[size]);
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function renderNoTopics(): HTMLElement {
  const wrap = h('div', { className: 'view view--picker' });
  wrap.appendChild(
    h('div', { className: 'picker-head' },
      h('h2', { className: 'view__title' }, 'یه موضوع انتخاب کن'),
      h('p', { className: 'view__sub' }, 'روی هر کارت بزن تا انتخاب بشه، بعد «دانلود انتخاب‌شده‌ها» رو بزن'),
    ),
  );
  const grid = h('div', { className: 'topic-picker', attrs: { role: 'list' } });
  wrap.appendChild(grid);
  const footer = h('div', { className: 'picker-footer' });
  wrap.appendChild(footer);
  void loadPickerInto(grid, footer);
  return wrap;
}

async function loadPickerInto(grid: HTMLElement, footer: HTMLElement): Promise<void> {
  grid.replaceChildren(skeletonList(4, 'skeleton--card'));
  footer.replaceChildren();
  try {
    const existing = store.getState().catalog;
    const catalog = existing.length > 0 ? { topics: existing } : await fetchCatalog();
    if (existing.length === 0) {
      store.dispatch({ type: 'SET_CATALOG', catalog: catalog.topics });
    }
    if (catalog.topics.length === 0) {
      grid.replaceChildren(
        emptyState('📦', 'فهرست خالیه', 'فعلاً موضوعی برای دانلود موجود نیست.'),
      );
      return;
    }
    const selected = new Set<string>();
    const tiles = new Map<string, HTMLButtonElement>();
    const downloadBtn = button('دانلود انتخاب‌شده‌ها', () => void downloadSelected(), {
      variant: 'primary',
      className: 'btn--wide btn--big',
    });
    downloadBtn.disabled = true;
    const selectAllBtn = button('انتخاب همه', () => {
      for (const item of catalog.topics) {
        selected.add(item.id);
        tiles.get(item.id)?.classList.add('topic-tile--selected');
      }
      updateFooter();
    }, { variant: 'ghost', className: 'btn--wide' });

    function updateFooter(): void {
      const n = selected.size;
      downloadBtn.disabled = n === 0;
      downloadBtn.textContent = n === 0 ? 'دانلود انتخاب‌شده‌ها' : `دانلود ${faNum(n)} موضوع`;
    }

    function toggle(item: typeof catalog.topics[number]): void {
      if (selected.has(item.id)) {
        selected.delete(item.id);
        tiles.get(item.id)?.classList.remove('topic-tile--selected');
      } else {
        selected.add(item.id);
        tiles.get(item.id)?.classList.add('topic-tile--selected');
      }
      updateFooter();
    }

    async function downloadSelected(): Promise<void> {
      if (selected.size === 0) return;
      downloadBtn.disabled = true;
      selectAllBtn.disabled = true;
      for (const tile of tiles.values()) tile.disabled = true;
      let ok = 0;
      let total = selected.size;
      for (const item of catalog.topics) {
        if (!selected.has(item.id)) continue;
        downloadBtn.textContent = `دانلود ${faNum(ok + 1)} از ${faNum(total)}…`;
        const tile = tiles.get(item.id);
        if (tile) {
          const old = tile.querySelector<HTMLElement>('.topic-tile__icon');
          const next = h('span', { className: 'topic-tile__icon', attrs: { 'aria-hidden': 'true' } }, '⏳');
          if (old) old.replaceWith(next);
        }
        try {
          await downloadTopic(item);
          ok++;
          if (tile) tile.classList.add('topic-tile--done');
        } catch (e) {
          if (tile) tile.classList.remove('topic-tile--selected');
          toast(e instanceof Error ? e.message : `دانلود «${item.title}» ناموفق بود.`, { kind: 'error' });
        }
      }
      if (ok > 0) {
        const [topics, versions, us] = await Promise.all([getTopics(), getDownloadedVersions(), getUserStates()]);
        store.dispatch({ type: 'REPLACE_TOPICS', topics });
        store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
        store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
        const firstId = catalog.topics.find((t) => selected.has(t.id))?.id;
        if (firstId && !store.getState().activeTopicId) {
          void setActiveTopicId(firstId);
          store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: firstId });
        }
        store.dispatch({ type: 'DATA_CHANGED' });
        toast(`${faNum(ok)} موضوع دانلود شد ✅`, { kind: 'success' });
        setTimeout(() => {
          store.dispatch({ type: 'SET_TAB', tab: 'game' });
          store.dispatch({ type: 'SELECT_LEVEL', level: null });
        }, 400);
      } else {
        for (const tile of tiles.values()) tile.disabled = false;
        selectAllBtn.disabled = false;
        updateFooter();
      }
    }

    const cards: HTMLElement[] = [];
    for (const item of catalog.topics) {
      const isDownloaded = store.getState().downloadedVersions[item.id] !== undefined;
      const tile = h(
        'button',
        {
          className: `topic-tile glass${isDownloaded ? ' topic-tile--done' : ''}`,
          type: 'button',
          attrs: {
            'aria-label': `${isDownloaded ? 'دانلود شده: ' : 'انتخاب '}${item.title}`,
            'aria-pressed': 'false',
            role: 'listitem',
          },
          onClick: () => toggle(item),
        },
        h('span', { className: 'topic-tile__check', attrs: { 'aria-hidden': 'true' } }, '✓'),
        topicIconEl(item),
        h('span', { className: 'topic-tile__title' }, item.title),
      );
      tiles.set(item.id, tile);
      cards.push(tile);
    }
    grid.replaceChildren(...cards);
    footer.replaceChildren(selectAllBtn, downloadBtn);
    updateFooter();
  } catch (e) {
    grid.replaceChildren(
      errorCard(
        e instanceof Error ? e.message : 'دریافت فهرست موضوعات ناموفق بود.',
        () => void loadPickerInto(grid, footer),
      ),
    );
  }
}

function bindKeyboard(): void {
  document.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    ) {
      return;
    }
    const card = mainEl.querySelector<HTMLElement>('.flashcard');
    if (!card) return;
    const s = store.getState();
    const isRandom = s.activeTab === 'review' && s.randomQuestionId !== null;
    const isGame = s.activeTab === 'game' && s.selectedCategoryId !== null && s.queue.length > 0;
    if (!isRandom && !isGame) return;

    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      store.dispatch({ type: 'FLIP_CARD', flipped: !s.isFlipped });
      return;
    }
    if (!s.isFlipped) return;
    const act = (state: 'know' | 'want_to_learn' | 'skip'): void => {
      ev.preventDefault();
      if (isRandom) {
        const q = s.randomQuestionId ? findQuestion(s.activeTopicId, s.randomQuestionId) : null;
        if (q) {
          const xp = XP_PER_STATE[state];
          answerRandomCard(q, state, xp, pickRandomQuestion, card);
        }
      } else {
        const xp = XP_PER_STATE[state];
        answerCurrentCard(state, xp, card);
      }
    };
    if (ev.key === 'ArrowLeft') act('know');
    else if (ev.key === 'ArrowDown') act('want_to_learn');
    else if (ev.key === 'ArrowRight') act('skip');
  });
}
