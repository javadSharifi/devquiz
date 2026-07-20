/* ============================================================
 * src/features/game/cat-list.ts
 * Category-question list view: per-question row, inline answer
 * expand/collapse, per-item state set (know / want_to_learn / skip)
 * with live progress bar + count update.
 *
 * - Pure math: src/lib/cat-list-stats.ts
 * - DOM mutations: applyCategoryItemState() (exported for test)
 * - No chrome.* access, no fetch — dispatches only.
 * ============================================================ */

import { store } from '../../state.js';
import { renderMarkdown } from '../../markdown.js';
import { categoryStats } from '../../lib/topic-utils.js';
import { faNum, stateKey } from '../../types.js';
import type { QuestionState, Topic } from '../../types.js';
import type { AppState } from '../../state.js';
import { backButton } from '../../lib/helpers.js';
import { button, emptyState, h, progressBar } from '../../ui.js';
import { computeKnownCount, computeProgress, STATE_COLORS } from '../../lib/cat-list-stats.js';

/** Pre-resolved DOM references for a single category-list row + the shared header bits. */
export interface CatListItemRefs {
  itemEl: HTMLElement;
  toggleEl: HTMLElement;
  bodyEl: HTMLElement;
  countEl: HTMLElement;
  barFillEl: HTMLElement;
}

/**
 * Apply the visual side-effects of a per-question state change.
 * Pure DOM mutation given the refs and inputs. Caller is responsible
 * for the store.dispatch() and the count recompute.
 */
export function applyCategoryItemState(
  refs: CatListItemRefs,
  newState: QuestionState,
  total: number,
  knownCount: number,
  formatCount: (known: number, total: number) => string,
): void {
  const color = STATE_COLORS[newState];
  refs.itemEl.style.borderInlineStartColor = color;
  refs.itemEl.classList.toggle('cat-list__item--done', newState === 'know');
  refs.toggleEl.classList.toggle('cat-list__head--done', newState === 'know');
  refs.bodyEl.setAttribute('hidden', '');
  refs.toggleEl.setAttribute('aria-expanded', 'false');
  refs.countEl.textContent = formatCount(knownCount, total);
  const { widthPct } = computeProgress(knownCount, total, formatCount);
  refs.barFillEl.style.width = `${widthPct}%`;
}

export function renderCategoryList(state: AppState, topic: Topic, categoryId: string): HTMLElement {
  const wrap = h('div', { className: 'view view--cat-list' });
  const cat = topic.categories.find((c) => c.id === categoryId);
  if (!cat) return emptyState('🗂️', 'دسته پیدا نشد', '');

  const { done, total } = categoryStats(cat, state.activeTopicId, state.userStates);

  wrap.appendChild(
    h('div', { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SELECT_CATEGORY', categoryId: null, queue: [] })),
      h('h2', { className: 'view__title view__title--sm' }, `${cat.icon} ${cat.title}`),
    ),
  );
  const bar = progressBar(done, total);
  wrap.appendChild(bar);
  const countEl = h('p', { className: 'cat-list__count' }, `${faNum(done)} از ${faNum(total)} پاسخ`);
  wrap.appendChild(countEl);
  const barFillEl = (bar.querySelector('.progress__fill') as HTMLElement | null)
    ?? (h('div', { className: 'progress__fill' }) as HTMLElement);
  const formatCount = (k: number, t: number): string => `${faNum(k)} از ${faNum(t)} پاسخ`;

  const nonKnowIds = cat.questions
    .filter((q) => {
      const s = state.userStates[stateKey(state.activeTopicId, q.id)]?.state ?? 'unseen';
      return s !== 'know';
    })
    .map((q) => q.id);
  const allIds = cat.questions.map((q) => q.id);

  wrap.appendChild(
    h('div', { className: 'cat-list__actions' },
      nonKnowIds.length > 0
        ? button('▶ ادامه یادگیری', () => {
            store.dispatch({ type: 'SET_QUEUE', queue: nonKnowIds, index: 0 });
          }, { variant: 'primary', className: 'btn--wide btn--big' })
        : h('p', { className: 'cat-list__all-done' }, '✅ همه رو بلدی!'),
      button('مرور همه', () => {
        store.dispatch({ type: 'SET_QUEUE', queue: allIds, index: 0 });
      }, { variant: 'ghost', className: 'btn--wide' }),
    ),
  );

  if (total === 0) {
    wrap.appendChild(emptyState('📭', 'سوالی نیست', 'این دسته خالیه'));
    return wrap;
  }

  const list = h('div', { className: 'cat-list' });
  for (const q of cat.questions) {
    const currentState = state.userStates[stateKey(state.activeTopicId, q.id)]?.state ?? 'unseen';
    const color = STATE_COLORS[currentState] ?? 'var(--danger)';
    const isDone = currentState === 'know';
    const body = h('div', { className: 'cat-list__body', attrs: { hidden: '' } });
    const toggle = h(
      'button',
      {
        className: `cat-list__head${isDone ? ' cat-list__head--done' : ''}`,
        type: 'button',
        attrs: { 'aria-expanded': 'false' },
        onClick: () => {
          const hidden = body.hasAttribute('hidden');
          if (hidden) {
            body.replaceChildren();
            body.appendChild(renderCardAnswer(q.answer));
            body.appendChild(
              h('div', { className: 'cat-list__actions-inline' },
                button('✅ بلدم', () => setQState('know'), { variant: 'soft', className: 'act act--know', ariaLabel: 'بلدم' }),
                button('📚 یاد می‌گیرم', () => setQState('want_to_learn'), { variant: 'soft', className: 'act act--learn', ariaLabel: 'یاد می‌گیرم' }),
                button('⏭ رد کن', () => setQState('skip'), { variant: 'soft', className: 'act act--skip', ariaLabel: 'رد کن' }),
              ),
            );
          }
          if (hidden) body.removeAttribute('hidden');
          else body.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', String(!hidden));
          toggle.parentElement?.classList.toggle('cat-list__item--open', !hidden);
        },
      },
      h('span', { className: 'cat-list__q' }, q.question),
    );
    const item = h('div', {
      className: `cat-list__item${isDone ? ' cat-list__item--done' : ''}`,
      style: { borderInlineStart: `3px solid ${color}` },
    }, toggle, body);
    list.appendChild(item);

    const refs: CatListItemRefs = { itemEl: item, toggleEl: toggle, bodyEl: body, countEl, barFillEl };
    function setQState(newState: QuestionState): void {
      const key = stateKey(state.activeTopicId, q.id);
      store.dispatch({ type: 'SET_USER_STATE', key, value: { state: newState, updatedAt: Date.now() } });
      const s = store.getState();
      const newPct = computeKnownCount(cat!.questions, s.userStates, s.activeTopicId);
      applyCategoryItemState(refs, newState, total, newPct, formatCount);
    }
  }
  wrap.appendChild(list);
  return wrap;
}

function renderCardAnswer(answer: string): HTMLElement {
  const req = document.createElement('div');
  req.appendChild(renderMarkdown(answer));
  return req;
}
