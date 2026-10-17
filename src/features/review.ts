import { buildFlashcard } from '../components/flashcard.js';
import { store } from '../state.js';
import { findQuestion, getMergedTopic } from '../lib/topic-utils.js';
import { answerRandomCard as undoAnswerRandomCard, XP_PER_STATE, setLastFlashcard } from '../lib/undo.js';
import { backButton, renderPriorityBadge, topicIconEl } from '../lib/helpers.js';
import type { Category, Question, QuestionLevel, QuestionState } from '../types.js';
import type { AppState } from '../state.js';
import { stateKey } from '../types.js';
import { faNum } from '../types.js';
import { renderMarkdown } from '../markdown.js';
import { button, emptyState, h, toast } from '../ui.js';
import { ico } from '../components/icons.js';

const randomSeen = new Set<string>();

export function clearRandomSeen(): void {
  randomSeen.clear();
}

let selectedReviewTopic: string = 'all';
let selectedReviewLevel: QuestionLevel | 'all' = 'all';
let selectedReviewState: QuestionState | 'all' = 'all';

export function getReviewTopicFilter(): string {
  return selectedReviewTopic;
}

export function setReviewTopicFilter(tid: string): void {
  selectedReviewTopic = tid;
}

export function resetReviewFilters(): void {
  selectedReviewTopic = 'all';
  selectedReviewLevel = 'all';
  selectedReviewState = 'all';
}

function isEligibleForRandom(state: AppState, topicId: string, questionId: string): boolean {
  const s = state.userStates[stateKey(topicId, questionId)]?.state ?? 'unseen';
  return s !== 'know';
}

interface ReviewItemData {
  q: Question;
  cat: Category;
  topicId: string;
  topicTitle: string;
  topicIcon?: string;
}

export function renderReview(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--review' });
  const topicIds = Object.keys(state.topics);

  if (topicIds.length === 0) {
    return emptyState(ico('inbox', 42), 'موضوعی یافت نشد', 'ابتدا از صفحه همه بازی‌ها یک بازی دانلود یا انتخاب کنید.');
  }

  if (state.randomQuestionId !== null) {
    const q = findQuestion(state.activeTopicId, state.randomQuestionId);
    if (q) {
      wrap.appendChild(
        h(
          'div',
          { className: 'view-head' },
          backButton(() => {
            clearRandomSeen();
            store.dispatch({ type: 'SET_RANDOM_QUESTION', questionId: null });
          }),
          h('h2', { className: 'view__title view__title--sm' }, [ico('dice', 18), ' سؤال تصادفی']),
        ),
      );
      const card = buildFlashcard(q, state.isFlipped, (newState, btn) => {
        const xp = XP_PER_STATE[newState];
        setLastFlashcard(card);
        undoAnswerRandomCard(q, newState, xp, () => pickRandomQuestion(selectedReviewTopic), btn);
      });
      card.classList.add('card-enter');
      setLastFlashcard(card);
      wrap.appendChild(card);
      return wrap;
    }
  }

  // Header
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SET_TAB', tab: 'all-games' })),
      h('h2', { className: 'view__title rv-title' }, 'مرور'),
    ),
  );

  // Gather all learning items across all topics
  const allLearningItems: ReviewItemData[] = [];
  const topicCounts: Record<string, number> = {};
  for (const tid of topicIds) {
    topicCounts[tid] = 0;
  }

  for (const topicId of topicIds) {
    const topic = getMergedTopic(topicId);
    if (!topic) continue;
    const catalogItem = state.catalog.find((c) => c.id === topicId);
    const topicTitle = topic.meta.title || catalogItem?.title || topicId;
    const topicIcon = catalogItem?.icon ?? topic.meta.icon;

    for (const cat of topic.categories) {
      for (const q of cat.questions) {
        const s = state.userStates[stateKey(topicId, q.id)]?.state ?? 'unseen';
        if (s === 'want_to_learn' || s === 'skip') {
          allLearningItems.push({ q, cat, topicId, topicTitle, topicIcon });
          topicCounts[topicId] = (topicCounts[topicId] ?? 0) + 1;
        }
      }
    }
  }

  if (allLearningItems.length === 0) {
    wrap.appendChild(
      emptyState(ico('sprout', 42), 'لیست یادگیری خالیه', 'وقتی روی کارتی «یاد می‌گیرم» بزنی، اینجا برای مرور ظاهر می‌شه.'),
    );
    return wrap;
  }

  // If active filter has 0 items, reset to 'all'
  if (selectedReviewTopic !== 'all' && (topicCounts[selectedReviewTopic] ?? 0) === 0) {
    selectedReviewTopic = 'all';
  }

  // Random question button (topic-aware)
  const isFilteredTopic = selectedReviewTopic !== 'all' && (topicCounts[selectedReviewTopic] ?? 0) > 0;
  const filteredTopicTitle = isFilteredTopic
    ? (state.topics[selectedReviewTopic]?.meta?.title || selectedReviewTopic)
    : '';

  const poolCount = isFilteredTopic ? (topicCounts[selectedReviewTopic] ?? 0) : allLearningItems.length;
  wrap.appendChild(
    h(
      'button',
      {
        className: 'rv-random',
        type: 'button',
        onClick: () => pickRandomQuestion(selectedReviewTopic),
      },
      h('span', { className: 'rv-random__icon', attrs: { 'aria-hidden': 'true' } }, ico('dice', 24)),
      h(
        'span',
        { className: 'rv-random__text' },
        h('span', { className: 'rv-random__title' }, 'سؤال تصادفی'),
        h(
          'span',
          { className: 'rv-random__sub' },
          isFilteredTopic
            ? `از «${filteredTopicTitle}» · ${faNum(poolCount)} سؤال در لیست`
            : `از همهٔ موضوع‌ها · ${faNum(poolCount)} سؤال در لیست`,
        ),
      ),
      h('span', { className: 'rv-random__go', attrs: { 'aria-hidden': 'true' } }, ico('play', 16)),
    ),
  );

  // Filter chips: only include topics that actually have learning items (count > 0)
  const activeTopicIds = topicIds.filter((tid) => (topicCounts[tid] ?? 0) > 0);

  if (activeTopicIds.length > 0) {
    const filtersWrap = h('div', { className: 'review-filters' });
    const chipsScroll = h('div', {
      className: 'review-chips-scroll',
      attrs: { role: 'tablist', 'aria-label': 'فیلتر موضوعات مرور' },
    });

    // "All" chip
    const allActive = selectedReviewTopic === 'all';
    const allChip = h(
      'button',
      {
        className: `review-chip${allActive ? ' review-chip--active' : ''}`,
        type: 'button',
        attrs: { 'aria-pressed': String(allActive), 'aria-label': `همه موضوعات: ${faNum(allLearningItems.length)} سؤال` },
        onClick: () => {
          if (selectedReviewTopic === 'all') return;
          selectedReviewTopic = 'all';
          store.dispatch({ type: 'DATA_CHANGED' });
        },
      },
      h('span', {}, 'همه'),
      h('span', { className: 'review-chip__count' }, faNum(allLearningItems.length)),
    );
    chipsScroll.appendChild(allChip);

    // Individual topic chips (ONLY for topics with count > 0)
    for (const tid of activeTopicIds) {
      const topic = state.topics[tid];
      if (!topic) continue;
      const catalogItem = state.catalog.find((c) => c.id === tid);
      const title = topic.meta?.title || catalogItem?.title || tid;
      const icon = catalogItem?.icon ?? topic.meta?.icon;
      const count = topicCounts[tid] ?? 0;
      const active = selectedReviewTopic === tid;

      const chip = h(
        'button',
        {
          className: `review-chip${active ? ' review-chip--active' : ''}`,
          type: 'button',
          attrs: { 'aria-pressed': String(active), 'aria-label': `${title}: ${faNum(count)} سؤال` },
          onClick: () => {
            selectedReviewTopic = active ? 'all' : tid;
            store.dispatch({ type: 'DATA_CHANGED' });
          },
        },
        topicIconEl({ id: tid, icon }),
        h('span', { className: 'review-chip__title' }, title),
        h('span', { className: 'review-chip__count' }, faNum(count)),
      );
      chipsScroll.appendChild(chip);
    }
    filtersWrap.appendChild(chipsScroll);
    wrap.appendChild(filtersWrap);
  }

  // Filter items according to active filter
  const filteredItems = selectedReviewTopic === 'all'
    ? allLearningItems
    : allLearningItems.filter((item) => item.topicId === selectedReviewTopic);

  const sectionTitle = isFilteredTopic
    ? `لیست یادگیری: ${filteredTopicTitle} (${faNum(filteredItems.length)})`
    : `لیست یادگیری (${faNum(filteredItems.length)})`;

  wrap.appendChild(h('h3', { className: 'section-title' }, sectionTitle));

  if (filteredItems.length === 0) {
    const clearBtn = button(
      'نمایش همه سؤالات',
      () => {
        resetReviewFilters();
        store.dispatch({ type: 'DATA_CHANGED' });
      },
      { variant: 'soft', className: 'btn--sm' },
    );
    wrap.appendChild(
      emptyState(ico('search', 42), 'سؤالی با این فیلتر یافت نشد', 'می‌توانی فیلترها را تغییر دهی یا پاک کنی.', clearBtn),
    );
    return wrap;
  }

  const list = h('div', { className: 'review-list' });
  const showTopicBadge = selectedReviewTopic === 'all';
  for (const { q, cat, topicId, topicTitle } of filteredItems) {
    list.appendChild(reviewItem(state, q, cat, topicId, topicTitle, showTopicBadge));
  }
  wrap.appendChild(list);
  return wrap;
}

/** Re-render after a state change without losing the user's place in the list. */
function dispatchKeepingScroll(fn: () => void): void {
  const main = document.getElementById('app-main');
  const top = main?.scrollTop ?? 0;
  fn();
  store.dispatch({ type: 'DATA_CHANGED' });
  if (main) {
    main.scrollTop = top;
    requestAnimationFrame(() => {
      main.scrollTop = top;
    });
  }
}

function reviewItem(
  state: AppState,
  q: Question,
  cat: Category,
  topicId: string,
  topicTitle: string,
  showTopicBadge: boolean,
): HTMLElement {
  const key = stateKey(topicId, q.id);
  const current: QuestionState = state.userStates[key]?.state ?? 'unseen';
  const isSkipped = current === 'skip';

  const setState = (value: QuestionState | null, msg: string): void => {
    dispatchKeepingScroll(() => {
      store.dispatch({
        type: 'SET_USER_STATE',
        key,
        value: value === null ? null : { state: value, updatedAt: Date.now() },
      });
    });
    toast(msg, { kind: 'success', duration: 2500 });
  };

  const body = h('div', { className: 'review-item__body', attrs: { hidden: '' } });
  let rendered = false;
  const toggle = h(
    'button',
    {
      className: 'review-item__head',
      type: 'button',
      attrs: { 'aria-expanded': 'false', 'aria-label': `نمایش پاسخ: ${q.question.slice(0, 60)}` },
      onClick: () => {
        const opening = body.hasAttribute('hidden');
        if (opening && !rendered) {
          body.appendChild(renderMarkdown(q.answer));
          body.appendChild(
            h(
              'div',
              { className: 'review-item__actions' },
              button([ico('checkCircle', 16), 'بلدم شد'], () => setState('know', 'به «بلدم» منتقل شد'), {
                variant: 'soft',
                className: 'act act--know',
              }),
              button([ico('trash', 16), 'حذف از مرور'], () => setState(null, 'از لیست مرور حذف شد'), {
                variant: 'soft',
                className: 'act act--remove',
              }),
              button(
                isSkipped ? [ico('book', 16), 'یاد می‌گیرم'] : [ico('skip', 16), 'رد کن'],
                () => setState(isSkipped ? 'want_to_learn' : 'skip', isSkipped ? 'به «یاد می‌گیرم» برگشت' : 'به «رد شده» منتقل شد'),
                { variant: 'soft', className: `act ${isSkipped ? 'act--learn' : 'act--skip'}` },
              ),
              button(
                [ico('play', 14), 'تمرین این موضوع'],
                () => {
                  store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId });
                  store.dispatch({ type: 'SET_TAB', tab: 'game' });
                },
                { variant: 'ghost', className: 'act act--goto' },
              ),
            ),
          );
          rendered = true;
        }
        if (opening) {
          body.removeAttribute('hidden');
        } else {
          body.setAttribute('hidden', '');
          // keep the question in view once the answer collapses
          item.scrollIntoView?.({ block: 'nearest' });
        }
        toggle.setAttribute('aria-expanded', String(opening));
        item.classList.toggle('review-item--open', opening);
      },
    },
    h('span', { className: 'review-item__cat', attrs: { 'aria-hidden': 'true' } }, ico('folder', 18)),
    h(
      'span',
      { className: 'review-item__main' },
      h('span', { className: 'review-item__q' }, q.question),
      h(
        'span',
        { className: 'review-item__meta' },
        ...(showTopicBadge ? [h('span', { className: 'review-item__topic-badge' }, topicTitle)] : []),
        h('span', { className: `review-item__state review-item__state--${current}` }, isSkipped ? 'رد شده' : 'یاد می‌گیرم'),
        renderPriorityBadge(q.priority, { compact: true }),
      ),
    ),
    h('span', { className: 'review-item__chev', attrs: { 'aria-hidden': 'true' } }, '‹'),
  );
  const item = h('div', { className: `review-item review-item--${current}` }, toggle, body);
  return item;
}

export function pickRandomQuestion(topicFilter?: string): void {
  const state = store.getState();
  const pool: { topicId: string; qId: string }[] = [];

  const targetTopicIds = (topicFilter && topicFilter !== 'all' && state.topics[topicFilter] !== undefined)
    ? [topicFilter]
    : Object.keys(state.topics);

  for (const topicId of targetTopicIds) {
    const topic = getMergedTopic(topicId);
    if (!topic) continue;
    for (const cat of topic.categories) {
      for (const q of cat.questions) {
        if (isEligibleForRandom(state, topicId, q.id) && !randomSeen.has(`${topicId}:${q.id}`)) {
          pool.push({ topicId, qId: q.id });
        }
      }
    }
  }

  if (pool.length === 0) {
    clearRandomSeen();
    for (const topicId of targetTopicIds) {
      const topic = getMergedTopic(topicId);
      if (!topic) continue;
      for (const cat of topic.categories) {
        for (const q of cat.questions) {
          if (isEligibleForRandom(state, topicId, q.id)) {
            pool.push({ topicId, qId: q.id });
          }
        }
      }
    }

    if (pool.length === 0) {
      const targetTitle = (topicFilter && topicFilter !== 'all')
        ? (state.topics[topicFilter]?.meta?.title || topicFilter)
        : null;
      const msg = targetTitle ? `همه سؤال‌های ${targetTitle} رو بلدی` : 'همه سؤال‌ها رو بلدی';
      toast(msg, { kind: 'success' });
      store.dispatch({ type: 'SET_RANDOM_QUESTION', questionId: null });
      return;
    }
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (!pick) return;

  randomSeen.add(`${pick.topicId}:${pick.qId}`);

  store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: pick.topicId });
  store.dispatch({ type: 'SET_RANDOM_QUESTION', questionId: pick.qId });
}

