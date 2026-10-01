/* ============================================================
 * src/features/game/all-topic-questions.ts
 * "نمایش همه سوال‌ها" view for a topic:
 * - Collects all questions across all categories of the active topic
 * - Sorted by importance percentage (درصد اهمیت) descending by default
 * - Displays priority percentage badge prominently next to each question
 * - In-place collapsible answer with live status actions (know, learn, skip)
 * - Search & filter within the topic
 * - Option to start flashcard session in priority order
 * ============================================================ */

import { store } from '../../state.js';
import { renderMarkdown } from '../../markdown.js';
import { faNum, getPriorityPercent, stateKey } from '../../types.js';
import type { AppState } from '../../state.js';
import type { Category, Question, QuestionLevel, QuestionState, Topic } from '../../types.js';
import { backButton, LEVEL_LABEL, renderPriorityBadge } from '../../lib/helpers.js';
import { button, emptyState, h, progressBar } from '../../ui.js';
import { STATE_COLORS } from '../../lib/cat-list-stats.js';

interface TopicQuestionItem {
  question: Question;
  category: Category;
  topicId: string;
}

export function renderAllTopicQuestions(state: AppState, topic: Topic): HTMLElement {
  const wrap = h('div', { className: 'view view--all-questions' });

  // 1. Gather all questions from all categories in this topic
  const allItems: TopicQuestionItem[] = [];
  for (const cat of topic.categories) {
    for (const q of cat.questions) {
      allItems.push({ question: q, category: cat, topicId: state.activeTopicId });
    }
  }

  // 2. Sort by importance percentage (درصد اهمیت) descending
  // High percentage first (100% -> 95% -> 80% ... 10%), no-priority at bottom
  allItems.sort((a, b) => {
    const pA = getPriorityPercent(a.question.priority) ?? -1;
    const pB = getPriorityPercent(b.question.priority) ?? -1;
    if (pB !== pA) return pB - pA;
    return a.question.id.localeCompare(b.question.id);
  });

  // Calculate overall stats for this topic
  let knownCount = 0;
  for (const item of allItems) {
    const s = state.userStates[stateKey(state.activeTopicId, item.question.id)]?.state ?? 'unseen';
    if (s === 'know') knownCount++;
  }

  // Header
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SELECT_CATEGORY', categoryId: null, queue: [] })),
      h(
        'div',
        { className: 'view-head__titles' },
        h('h2', { className: 'view__title view__title--sm' }, `📋 همه سؤال‌های ${topic.meta.title}`),
        h(
          'p',
          { className: 'view__sub view__sub--sm' },
          `مرتب‌شده بر اساس درصد اهمیت • ${faNum(knownCount)} از ${faNum(allItems.length)} بلدی`,
        ),
      ),
    ),
  );

  // Overall Progress Bar
  const bar = progressBar(knownCount, allItems.length);
  wrap.appendChild(bar);

  // Action buttons
  const unlearnedIds = allItems
    .filter((it) => {
      const s = state.userStates[stateKey(state.activeTopicId, it.question.id)]?.state ?? 'unseen';
      return s !== 'know';
    })
    .map((it) => it.question.id);

  const allSortedIds = allItems.map((it) => it.question.id);

  wrap.appendChild(
    h(
      'div',
      { className: 'all-questions__actions' },
      unlearnedIds.length > 0
        ? button(
            `▶ تمرین کارتی (${faNum(unlearnedIds.length)} سؤال بلدنشده)`,
            () => store.dispatch({ type: 'SET_QUEUE', queue: unlearnedIds, index: 0 }),
            { variant: 'primary', className: 'btn--wide btn--big' },
          )
        : h('p', { className: 'cat-list__all-done' }, '✅ تمام سوالات این موضوع را بلدید!'),
      button(
        `مرور تمام ${faNum(allItems.length)} سؤال در فلش‌کارت`,
        () => store.dispatch({ type: 'SET_QUEUE', queue: allSortedIds, index: 0 }),
        { variant: 'ghost', className: 'btn--wide' },
      ),
    ),
  );

  // Search and Filter controls within this topic
  let searchQuery = '';
  let selectedLevelFilter: QuestionLevel | 'all' = 'all';
  let selectedStateFilter: QuestionState | 'all' = 'all';

  const filterRow = h('div', { className: 'all-questions__filter-row' });
  const searchInput = h('input', {
    className: 'field__input all-questions__search-input',
    attrs: {
      type: 'search',
      placeholder: `جستجو در بین ${faNum(allItems.length)} سؤال…`,
      'aria-label': 'جستجو در سوالات موضوع',
    },
    onInput: (ev) => {
      searchQuery = (ev.target as HTMLInputElement).value.trim().toLowerCase();
      renderList();
    },
  });
  filterRow.appendChild(searchInput);

  // Level selector chips
  const chipsRow = h('div', { className: 'filter-chips-row', attrs: { role: 'group', 'aria-label': 'فیلتر سطح' } });
  const levels: (QuestionLevel | 'all')[] = ['all', 'junior', 'mid', 'senior'];
  const levelLabels: Record<string, string> = { all: 'همه سطوح', junior: 'جونیور', mid: 'میدلول', senior: 'سنیور' };

  for (const lvl of levels) {
    const chip = h(
      'button',
      {
        className: `filter-chip${lvl === selectedLevelFilter ? ' filter-chip--active' : ''}`,
        type: 'button',
        onClick: () => {
          selectedLevelFilter = lvl;
          for (const c of chipsRow.querySelectorAll('.filter-chip')) {
            c.classList.remove('filter-chip--active');
          }
          chip.classList.add('filter-chip--active');
          renderList();
        },
      },
      levelLabels[lvl] ?? lvl,
    );
    chipsRow.appendChild(chip);
  }
  filterRow.appendChild(chipsRow);
  wrap.appendChild(filterRow);

  const listContainer = h('div', { className: 'all-questions__list' });
  wrap.appendChild(listContainer);

  function renderList(): void {
    listContainer.replaceChildren();

    const filtered = allItems.filter((it) => {
      if (selectedLevelFilter !== 'all' && it.category.level !== selectedLevelFilter) {
        return false;
      }
      const s = state.userStates[stateKey(state.activeTopicId, it.question.id)]?.state ?? 'unseen';
      if (selectedStateFilter !== 'all' && s !== selectedStateFilter) {
        return false;
      }
      if (searchQuery.length > 0) {
        const qMatch = it.question.question.toLowerCase().includes(searchQuery);
        const aMatch = it.question.answer.toLowerCase().includes(searchQuery);
        if (!qMatch && !aMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listContainer.appendChild(
        emptyState('🔍', 'سؤالی یافت نشد', 'با تغییر فیلتر یا عبارت جستجو دوباره امتحان کن.'),
      );
      return;
    }

    const countHeader = h(
      'div',
      { className: 'all-questions__count-info' },
      h('span', {}, `نمایش ${faNum(filtered.length)} سؤال (مرتب‌شده از بیشترین درصد اهمیت):`),
    );
    listContainer.appendChild(countHeader);

    for (const item of filtered) {
      const q = item.question;
      const cat = item.category;
      const qKey = stateKey(state.activeTopicId, q.id);
      let currentState = state.userStates[qKey]?.state ?? 'unseen';
      let isDone = currentState === 'know';
      let color = STATE_COLORS[currentState] ?? 'var(--danger)';

      const body = h('div', { className: 'cat-list__body', attrs: { hidden: '' } });
      const priorityBadge = renderPriorityBadge(q.priority, { compact: false });

      const toggle = h(
        'button',
        {
          className: `cat-list__head all-q__head${isDone ? ' cat-list__head--done' : ''}`,
          type: 'button',
          attrs: { 'aria-expanded': 'false' },
          onClick: () => {
            const hidden = body.hasAttribute('hidden');
            if (hidden) {
              body.replaceChildren();
              body.appendChild(buildAnswerBlock(q, cat));
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
                ),
              );
            }
            if (hidden) body.removeAttribute('hidden');
            else body.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', String(!hidden));
            cardWrap.classList.toggle('cat-list__item--open', !hidden);
          },
        },
        h(
          'div',
          { className: 'all-q__meta-row' },
          h('span', { className: 'all-q__cat-tag' }, `${cat.icon} ${cat.title}`),
          h('span', { className: `all-q__lvl-tag all-q__lvl-tag--${cat.level}` }, LEVEL_LABEL[cat.level] ?? cat.level),
          priorityBadge ?? h('span', { className: 'priority-badge priority-badge--low' }, 'بدون اولویت'),
        ),
        h('span', { className: 'all-q__question-text' }, q.question),
      );

      const cardWrap = h(
        'div',
        {
          className: `cat-list__item all-q__item${isDone ? ' cat-list__item--done' : ''}`,
          style: { borderInlineStart: `3px solid ${color}` },
        },
        toggle,
        body,
      );

      function updateState(newState: QuestionState): void {
        currentState = newState;
        isDone = newState === 'know';
        color = STATE_COLORS[newState] ?? 'var(--danger)';
        cardWrap.style.borderInlineStart = `3px solid ${color}`;
        cardWrap.classList.toggle('cat-list__item--done', isDone);
        toggle.classList.toggle('cat-list__head--done', isDone);

        store.dispatch({
          type: 'SET_USER_STATE',
          key: qKey,
          value: { state: newState, updatedAt: Date.now() },
        });
      }

      listContainer.appendChild(cardWrap);
    }
  }

  function buildAnswerBlock(q: Question, cat: Category): HTMLElement {
    const wrap = h('div', { className: 'all-q__answer-content' });
    const priorityBadge = renderPriorityBadge(q.priority);
    if (priorityBadge) {
      wrap.appendChild(h('div', { className: 'all-q__answer-meta' }, priorityBadge));
    }
    wrap.appendChild(renderMarkdown(q.answer));
    return wrap;
  }

  // Initial render
  renderList();

  return wrap;
}
