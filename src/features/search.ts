/* ============================================================
 * src/features/search.ts
 * Global Search across ALL questions in ALL JSON files/topics.
 * - Searches across every downloaded topic + custom questions
 * - Highlights matches in question and answer text
 * - Normalized Persian/English text search
 * - Displays topic badge, level badge, and importance percentage badge
 * - Filter by topic, level, and question state
 * - Sort by importance percentage, relevance, or topic
 * - Inline answer accordion with live state updates (know, learn, skip)
 * - 1-click button to download any undownloaded catalog topics
 * ============================================================ */

import { store } from '../state.js';
import { getMergedTopic } from '../lib/topic-utils.js';
import { renderMarkdown } from '../markdown.js';
import { downloadTopic } from '../storage.js';
import { faNum, getPriorityPercent, stateKey } from '../types.js';
import type { AppState } from '../state.js';
import type { Category, Question, QuestionLevel, QuestionState, TopicCatalogItem } from '../types.js';
import { LEVEL_LABEL, renderPriorityBadge, topicIconEl } from '../lib/helpers.js';
import { button, emptyState, h, toast } from '../ui.js';
import { STATE_COLORS } from '../lib/cat-list-stats.js';

export interface SearchQuestionResult {
  question: Question;
  category: Category;
  topicId: string;
  topicTitle: string;
  topicIcon?: string;
  priorityPercent: number;
}

/** Normalize Persian and English text for accurate search matching. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderSearch(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--search' });

  // Header
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      h(
        'div',
        { className: 'view-head__titles' },
        h('h2', { className: 'view__title' }, '🔍 جستجو در همه سؤال‌ها'),
        h(
          'p',
          { className: 'view__sub' },
          'جستجو در میان تمام سؤالات و پاسخ‌های تمام موضوعات (JSONها)',
        ),
      ),
    ),
  );

  // Collect all searchable questions from all merged topics
  const allQuestions: SearchQuestionResult[] = [];
  const topicIds = Object.keys(state.topics);

  for (const tid of topicIds) {
    const topic = getMergedTopic(tid);
    if (!topic) continue;
    const catalogItem = state.catalog.find((c) => c.id === tid);
    const topicTitle = topic.meta.title || catalogItem?.title || tid;
    const topicIcon = catalogItem?.icon ?? topic.meta.icon;

    for (const cat of topic.categories) {
      for (const q of cat.questions) {
        allQuestions.push({
          question: q,
          category: cat,
          topicId: tid,
          topicTitle,
          topicIcon,
          priorityPercent: getPriorityPercent(q.priority) ?? -1,
        });
      }
    }
  }

  // Undownloaded catalog topics check
  const undownloadedCatalogItems = state.catalog.filter((c) => state.topics[c.id] === undefined);
  if (undownloadedCatalogItems.length > 0) {
    const banner = h(
      'div',
      { className: 'search-download-banner glass' },
      h(
        'div',
        { className: 'search-download-banner__text' },
        h(
          'span',
          {},
          `💡 ${faNum(undownloadedCatalogItems.length)} موضوع هنوز دانلود نشده‌اند. برای جستجوی کامل در تمام JSONها می‌توانید آن‌ها را دریافت کنید:`,
        ),
      ),
      button(
        `دانلود همه (${faNum(undownloadedCatalogItems.length)} موضوع)`,
        () => void downloadRemainingTopics(undownloadedCatalogItems, banner),
        { variant: 'soft', className: 'btn--sm' },
      ),
    );
    wrap.appendChild(banner);
  }

  // Search input bar
  let query = '';
  let selectedTopicFilter = 'all';
  let selectedLevelFilter: QuestionLevel | 'all' = 'all';
  let selectedStateFilter: QuestionState | 'all' = 'all';
  let sortMode: 'priority' | 'relevance' | 'topic' = 'priority';

  const searchBar = h('div', { className: 'search-bar-wrap' });
  const inputEl = h('input', {
    className: 'field__input search-bar__input',
    attrs: {
      type: 'search',
      placeholder: 'متن سؤال، کلمه کلیدی یا پاسخ را جستجو کنید…',
      'aria-label': 'جستجو در همه سؤال‌ها',
      autofocus: 'true',
    },
    onInput: (ev) => {
      query = (ev.target as HTMLInputElement).value;
      clearBtn.style.display = query ? 'flex' : 'none';
      renderResults();
    },
  }) as HTMLInputElement;

  const clearBtn = h(
    'button',
    {
      className: 'search-bar__clear',
      type: 'button',
      attrs: { 'aria-label': 'پاک کردن جستجو' },
      style: { display: 'none' },
      onClick: () => {
        inputEl.value = '';
        query = '';
        clearBtn.style.display = 'none';
        inputEl.focus();
        renderResults();
      },
    },
    '✕',
  );

  searchBar.append(inputEl, clearBtn);
  wrap.appendChild(searchBar);

  // Filter and Sort row
  const filterControls = h('div', { className: 'search-filters' });

  // Topic selector dropdown
  const topicSelect = h(
    'select',
    {
      className: 'search-select',
      attrs: { 'aria-label': 'فیلتر موضوع' },
      onChange: (ev) => {
        selectedTopicFilter = (ev.target as HTMLSelectElement).value;
        renderResults();
      },
    },
    h('option', { attrs: { value: 'all' } }, `همه موضوعات (${faNum(topicIds.length)})`),
    ...topicIds.map((tid) => {
      const title = state.topics[tid]?.meta?.title || tid;
      return h('option', { attrs: { value: tid } }, title);
    }),
  );
  filterControls.appendChild(topicSelect);

  // Level selector dropdown
  const levelSelect = h(
    'select',
    {
      className: 'search-select',
      attrs: { 'aria-label': 'فیلتر سطح' },
      onChange: (ev) => {
        selectedLevelFilter = (ev.target as HTMLSelectElement).value as QuestionLevel | 'all';
        renderResults();
      },
    },
    h('option', { attrs: { value: 'all' } }, 'همه سطوح'),
    h('option', { attrs: { value: 'junior' } }, 'جونیور 🌱'),
    h('option', { attrs: { value: 'mid' } }, 'میدلول ⚙️'),
    h('option', { attrs: { value: 'senior' } }, 'سنیور 🧭'),
  );
  filterControls.appendChild(levelSelect);

  // Sort dropdown
  const sortSelect = h(
    'select',
    {
      className: 'search-select search-select--sort',
      attrs: { 'aria-label': 'مرتب‌سازی نتایج' },
      onChange: (ev) => {
        sortMode = (ev.target as HTMLSelectElement).value as typeof sortMode;
        renderResults();
      },
    },
    h('option', { attrs: { value: 'priority' } }, 'مرتب‌سازی: بیشترین درصد اهمیت 🎯'),
    h('option', { attrs: { value: 'relevance' } }, 'مرتب‌سازی: مرتبط‌ترین 🔍'),
    h('option', { attrs: { value: 'topic' } }, 'مرتب‌سازی: بر اساس موضوع 📚'),
  );
  filterControls.appendChild(sortSelect);

  wrap.appendChild(filterControls);

  // Results area
  const countBar = h('div', { className: 'search-count-bar' });
  const resultsContainer = h('div', { className: 'search-results-list' });
  wrap.appendChild(countBar);
  wrap.appendChild(resultsContainer);

  function renderResults(): void {
    resultsContainer.replaceChildren();

    const normalizedQ = normalizeSearchText(query);
    const hasQuery = normalizedQ.length > 0;

    let items = allQuestions.filter((it) => {
      if (selectedTopicFilter !== 'all' && it.topicId !== selectedTopicFilter) return false;
      if (selectedLevelFilter !== 'all' && it.category.level !== selectedLevelFilter) return false;

      const qKey = stateKey(it.topicId, it.question.id);
      const s = state.userStates[qKey]?.state ?? 'unseen';
      if (selectedStateFilter !== 'all' && s !== selectedStateFilter) return false;

      if (!hasQuery) return true;

      const normQ = normalizeSearchText(it.question.question);
      const normA = normalizeSearchText(it.question.answer);
      const normCat = normalizeSearchText(it.category.title);
      const normTopic = normalizeSearchText(it.topicTitle);

      return (
        normQ.includes(normalizedQ) ||
        normA.includes(normalizedQ) ||
        normCat.includes(normalizedQ) ||
        normTopic.includes(normalizedQ)
      );
    });

    // Sorting
    if (sortMode === 'priority') {
      items.sort((a, b) => {
        if (b.priorityPercent !== a.priorityPercent) {
          return b.priorityPercent - a.priorityPercent;
        }
        return a.question.id.localeCompare(b.question.id);
      });
    } else if (sortMode === 'relevance' && hasQuery) {
      items.sort((a, b) => {
        const aNorm = normalizeSearchText(a.question.question);
        const bNorm = normalizeSearchText(b.question.question);
        const aStarts = aNorm.startsWith(normalizedQ) ? 10 : 0;
        const bStarts = bNorm.startsWith(normalizedQ) ? 10 : 0;
        const aExact = aNorm.includes(normalizedQ) ? 5 : 0;
        const bExact = bNorm.includes(normalizedQ) ? 5 : 0;
        const scoreA = aStarts + aExact + (a.priorityPercent > 0 ? a.priorityPercent / 20 : 0);
        const scoreB = bStarts + bExact + (b.priorityPercent > 0 ? b.priorityPercent / 20 : 0);
        return scoreB - scoreA;
      });
    } else if (sortMode === 'topic') {
      items.sort((a, b) => {
        if (a.topicTitle !== b.topicTitle) {
          return a.topicTitle.localeCompare(b.topicTitle);
        }
        return b.priorityPercent - a.priorityPercent;
      });
    }

    // Limit initial display for max performance
    const displayItems = items.slice(0, 150);

    countBar.textContent = hasQuery
      ? `${faNum(items.length)} نتیجه برای «${query}» در بین ${faNum(allQuestions.length)} سؤال:`
      : `همه ${faNum(allQuestions.length)} سؤال از ${faNum(topicIds.length)} موضوع (مرتب‌شده بر اساس درصد اهمیت):`;

    if (items.length === 0) {
      resultsContainer.appendChild(
        emptyState(
          '🔍',
          'سؤالی پیدا نشد',
          `عبارت دیگری را امتحان کنید یا فیلترها را تغییر دهید.`,
        ),
      );
      return;
    }

    for (const item of displayItems) {
      resultsContainer.appendChild(buildSearchResultItem(state, item, query));
    }

    if (items.length > displayItems.length) {
      const moreNote = h(
        'p',
        { className: 'search-more-note' },
        `نمایش ${faNum(displayItems.length)} مورد اول از ${faNum(items.length)} نتیجه. برای نتایج دقیق‌تر جستجو را محدودتر کنید.`,
      );
      resultsContainer.appendChild(moreNote);
    }
  }

  // Initial render
  renderResults();

  return wrap;
}

function buildSearchResultItem(
  state: AppState,
  item: SearchQuestionResult,
  query: string,
): HTMLElement {
  const q = item.question;
  const qKey = stateKey(item.topicId, q.id);
  let currentState = state.userStates[qKey]?.state ?? 'unseen';
  let isDone = currentState === 'know';
  let color = STATE_COLORS[currentState] ?? 'var(--danger)';

  const priorityBadge = renderPriorityBadge(q.priority, { compact: false });
  const body = h('div', { className: 'cat-list__body search-item__body', attrs: { hidden: '' } });

  const toggle = h(
    'button',
    {
      className: `cat-list__head search-item__head${isDone ? ' cat-list__head--done' : ''}`,
      type: 'button',
      attrs: { 'aria-expanded': 'false', 'aria-label': `نمایش پاسخ: ${q.question.slice(0, 60)}` },
      onClick: () => {
        const hidden = body.hasAttribute('hidden');
        if (hidden) {
          body.replaceChildren();
          body.appendChild(buildAnswerView(item));
          body.appendChild(
            h(
              'div',
              { className: 'cat-list__actions-inline' },
              button('✅ بلدم', () => updateState('know'), {
                variant: 'soft',
                className: 'act act--know',
                ariaLabel: 'بلدم',
              }),
              button('📚 یاد می‌گیرم', () => updateState('want_to_learn'), {
                variant: 'soft',
                className: 'act act--learn',
                ariaLabel: 'یاد می‌گیرم',
              }),
              button('⏭ رد کن', () => updateState('skip'), {
                variant: 'soft',
                className: 'act act--skip',
                ariaLabel: 'رد کن',
              }),
              button(
                '▶ تمرین این موضوع',
                () => {
                  store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: item.topicId });
                  store.dispatch({ type: 'SET_TAB', tab: 'game' });
                },
                { variant: 'ghost', className: 'act act--goto' },
              ),
            ),
          );
        }
        if (hidden) body.removeAttribute('hidden');
        else body.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', String(!hidden));
        card.classList.toggle('cat-list__item--open', !hidden);
      },
    },
    h(
      'div',
      { className: 'search-item__meta-row' },
      h('span', { className: 'search-item__topic-chip' }, topicIconEl({ id: item.topicId, icon: item.topicIcon }), ` ${item.topicTitle}`),
      h('span', { className: 'search-item__cat-chip' }, `${item.category.icon} ${item.category.title}`),
      h('span', { className: `all-q__lvl-tag all-q__lvl-tag--${item.category.level}` }, LEVEL_LABEL[item.category.level] ?? item.category.level),
      priorityBadge ?? h('span', { className: 'priority-badge priority-badge--low' }, 'بدون اولویت'),
    ),
    h('span', { className: 'search-item__q' }, highlightMatch(q.question, query)),
  );

  const card = h(
    'div',
    {
      className: `cat-list__item search-item${isDone ? ' cat-list__item--done' : ''}`,
      style: { borderInlineStart: `3px solid ${color}` },
    },
    toggle,
    body,
  );

  function updateState(newState: QuestionState): void {
    currentState = newState;
    isDone = newState === 'know';
    color = STATE_COLORS[newState] ?? 'var(--danger)';
    card.style.borderInlineStart = `3px solid ${color}`;
    card.classList.toggle('cat-list__item--done', isDone);
    toggle.classList.toggle('cat-list__head--done', isDone);

    // Collapse card after choosing an answer
    body.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    card.classList.remove('cat-list__item--open');

    store.dispatch({
      type: 'SET_USER_STATE',
      key: qKey,
      value: { state: newState, updatedAt: Date.now() },
    });
    toast(
      newState === 'know'
        ? 'به بلدم منتقل شد ✅'
        : newState === 'want_to_learn'
          ? 'به لیست یادگیری اضافه شد 📚'
          : 'رد شد ⏭',
      { kind: 'success', duration: 1500 },
    );
  }

  return card;
}

function buildAnswerView(item: SearchQuestionResult): HTMLElement {
  const wrap = h('div', { className: 'search-item__answer' });
  const priorityBadge = renderPriorityBadge(item.question.priority);
  if (priorityBadge) {
    wrap.appendChild(h('div', { className: 'search-item__answer-badge' }, priorityBadge));
  }
  wrap.appendChild(renderMarkdown(item.question.answer));
  return wrap;
}

/** Highlight matching query words inside question text safely. */
function highlightMatch(text: string, query: string): HTMLElement {
  const container = document.createElement('span');
  const cleanQ = query.trim();
  if (!cleanQ) {
    container.textContent = text;
    return container;
  }

  try {
    const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    for (const part of parts) {
      if (part.toLowerCase() === cleanQ.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = part;
        container.appendChild(mark);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    }
    return container;
  } catch {
    container.textContent = text;
    return container;
  }
}

async function downloadRemainingTopics(
  items: TopicCatalogItem[],
  bannerEl: HTMLElement,
): Promise<void> {
  const btn = bannerEl.querySelector('button');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'در حال دانلود…';
  }

  let successCount = 0;
  for (const item of items) {
    try {
      if (btn) btn.textContent = `در حال دریافت ${item.title}…`;
      await downloadTopic(item);
      successCount++;
    } catch {
      // ignore single topic error and proceed
    }
  }

  toast(`${faNum(successCount)} موضوع با موفقیت دانلود شد 🎉`, { kind: 'success', duration: 3000 });
  bannerEl.remove();
  store.dispatch({ type: 'DATA_CHANGED' });
}
