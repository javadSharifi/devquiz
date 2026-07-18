import { buildFlashcard } from '../components/flashcard.js';
import { store } from '../state.js';
import { getMergedTopic, levelStats, categoryStats, buildQueue } from '../lib/topic-utils.js';
import { answerCurrentCard, XP_PER_STATE, setLastFlashcard } from '../lib/undo.js';
import { backButton, LEVEL_LABEL, statChip, topicIconEl } from '../lib/helpers.js';
import { viewport, patchViewport } from '../lib/dom-patch.js';
import type { QuestionLevel, QuestionState, Topic } from '../types.js';
import type { AppState } from '../state.js';
import { renderMarkdown } from '../markdown.js';
import { faNum, stateKey } from '../types.js';
import { button, confetti, emptyState, errorCard, h, progressBar, progressRing } from '../ui.js';

const LEVEL_COLOR: Record<QuestionLevel, string> = {
  junior: 'var(--junior)',
  mid: 'var(--mid)',
  senior: 'var(--senior)',
};

export function renderGame(state: AppState): HTMLElement {
  const topic = getMergedTopic(state.activeTopicId);
  if (!topic) {
    const hasOtherTopics = Object.keys(state.topics).length > 0;
    const btn = button(
      hasOtherTopics ? 'انتخاب بازی دیگر' : 'دانلود بازی',
      () => store.dispatch({ type: 'SET_TAB', tab: 'all-games' }),
    );
    const wrap = h('div', { className: 'view view--game' });
    wrap.appendChild(emptyState('📭', 'موضوعی یافت نشد', 'بازی مورد نظر حذف شده است.', btn));
    return wrap;
  }

  if (state.selectedLevel === null) {
    const wrap = renderLevelSelect(state, topic);
    const switcher = renderTopicSwitcher(state);
    if (switcher) wrap.prepend(switcher);
    return wrap;
  }
  if (state.selectedCategoryId === null) return renderCategoryGrid(state, topic, state.selectedLevel);
  const finishedSession = state.queue.length === 0 && state.sessionAnswered > 0;
  if (state.currentQuestionIndex < state.queue.length || finishedSession) {
    return renderFlashcardScreen(state, topic, state.selectedLevel, state.selectedCategoryId);
  }
  return renderCategoryList(state, topic, state.selectedLevel, state.selectedCategoryId);
}

function renderTopicSwitcher(state: AppState): HTMLElement | null {
  const entries = Object.entries(state.topics);
  if (entries.length < 2) return null;
  const row = h('div', { className: 'topic-switcher', attrs: { role: 'list', 'aria-label': 'تعویض بازی' } });
  for (const [id, t] of entries) {
    const active = id === state.activeTopicId;
    const catalogItem = state.catalog.find((c) => c.id === id);
    const icon = catalogItem?.icon ?? t.meta.icon;
    row.appendChild(
      h(
        'button',
        {
          className: `topic-chip${active ? ' topic-chip--active' : ''}`,
          type: 'button',
          attrs: { role: 'listitem', 'aria-pressed': String(active), 'aria-label': `انتخاب بازی ${t.meta.title || id}` },
          onClick: () => {
            if (active) return;
            store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: id });
          },
        },
        topicIconEl({ id, icon }),
        h('span', { className: 'topic-chip__title' }, t.meta.title || id),
      ),
    );
  }
  return h('div', { className: 'topic-switcher-wrap' }, row);
}

function renderLevelSelect(state: AppState, topic: Topic): HTMLElement {
  const wrap = h('div', { className: 'view view--levels' });
  wrap.appendChild(h('h2', { className: 'view__title' }, topic.meta.title || 'انتخاب سطح'));
  wrap.appendChild(h('p', { className: 'view__sub' }, 'سطح خودت رو انتخاب کن'));
  const levels: QuestionLevel[] = ['junior', 'mid', 'senior'];
  for (const level of levels) {
    const { done, total } = levelStats(topic, state.activeTopicId, level, state.userStates);
    const card = h(
      'button',
      {
        className: `level-card level-card--${level}`,
        type: 'button',
        attrs: { 'aria-label': `سطح ${LEVEL_LABEL[level]}، ${faNum(done)} از ${faNum(total)} پاسخ داده شده` },
        onClick: () => store.dispatch({ type: 'SELECT_LEVEL', level }),
        disabled: total === 0,
      },
      h(
        'div',
        { className: 'level-card__info' },
        h('span', { className: 'level-card__name' }, LEVEL_LABEL[level]),
        h('span', { className: 'level-card__meta' }, total === 0 ? 'سوالی موجود نیست' : `${faNum(total)} سؤال`),
      ),
      progressRing(done, total, LEVEL_COLOR[level]),
    );
    wrap.appendChild(card);
  }
  return wrap;
}

function renderCategoryGrid(state: AppState, topic: Topic, level: QuestionLevel): HTMLElement {
  const wrap = h('div', { className: 'view view--categories' });
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SELECT_LEVEL', level: null })),
      h('h2', { className: 'view__title' }, `دسته‌بندی‌ها · ${LEVEL_LABEL[level]}`),
    ),
  );
  const grid = h('div', { className: 'cat-grid' });
  const cats = topic.categories.filter((c) => c.level === level);
  if (cats.length === 0) {
    wrap.appendChild(emptyState('🗂️', 'دسته‌ای پیدا نشد', 'برای این سطح هنوز سوالی ثبت نشده است.'));
    return wrap;
  }
  for (const cat of cats) {
    const { done, total } = categoryStats(cat, state.activeTopicId, state.userStates);
    const card = h(
      'button',
      {
        className: `cat-card glass${done === total && total > 0 ? ' cat-card--done' : ''}`,
        type: 'button',
        attrs: { 'aria-label': `${cat.title}: ${faNum(done)} از ${faNum(total)}` },
        onClick: () => {
          store.dispatch({ type: 'SELECT_CATEGORY', categoryId: cat.id, queue: [] });
        },
      },
      h('span', { className: 'cat-card__icon', attrs: { 'aria-hidden': 'true' } }, cat.icon || '📚'),
      h('span', { className: 'cat-card__title' }, cat.title),
      progressBar(done, total),
      h('span', { className: 'cat-card__count' }, `${faNum(done)} از ${faNum(total)}`),
    );
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
}

const STATE_COLORS: Record<QuestionState, string> = {
  know: 'var(--junior)',
  want_to_learn: 'var(--mid)',
  skip: 'var(--danger)',
  unseen: 'var(--danger)',
};

function renderCategoryList(state: AppState, topic: Topic, level: QuestionLevel, categoryId: string): HTMLElement {
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
  wrap.appendChild(progressBar(done, total));
  wrap.appendChild(h('p', { className: 'cat-list__count' }, `${faNum(done)} از ${faNum(total)} پاسخ`));

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
    function setQState(newState: QuestionState): void {
      const key = stateKey(state.activeTopicId, q.id);
      store.dispatch({ type: 'SET_USER_STATE', key, value: { state: newState, updatedAt: Date.now() } });
      const itemEl = toggle.closest('.cat-list__item') as HTMLElement;
      if (itemEl) {
        const c = STATE_COLORS[newState];
        itemEl.style.borderInlineStartColor = c;
        itemEl.classList.toggle('cat-list__item--done', newState === 'know');
        toggle.classList.toggle('cat-list__head--done', newState === 'know');
        body.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
      }
      const s = store.getState();
      const pct = cat!.questions.filter((x) => {
        const st = s.userStates[stateKey(s.activeTopicId, x.id)]?.state ?? 'unseen';
        return st === 'know' || st === 'want_to_learn';
      }).length;
      const totalStr = `${faNum(pct)} از ${faNum(total)} پاسخ`;
      const countEl = wrap.querySelector('.cat-list__count');
      if (countEl) countEl.textContent = totalStr;
      const bar = wrap.querySelector('.progress__fill') as HTMLElement;
      if (bar) bar.style.width = `${total > 0 ? Math.round((pct / total) * 100) : 0}%`;
    }
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
  }
  wrap.appendChild(list);
  return wrap;
}

function renderCardAnswer(answer: string): HTMLElement {
  const req = document.createElement('div');
  req.appendChild(renderMarkdown(answer));
  return req;
}

function renderFlashcardScreen(
  state: AppState,
  topic: Topic,
  level: QuestionLevel,
  categoryId: string,
): HTMLElement {
  const wrap = h('div', { className: 'view view--card' });
  const cat = topic.categories.find((c) => c.id === categoryId);
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SELECT_CATEGORY', categoryId: state.selectedCategoryId, queue: [] })),
      h('h2', { className: 'view__title view__title--sm' }, cat ? `${cat.icon} ${cat.title}` : ''),
    ),
  );

  if (state.queue.length === 0) {
    wrap.appendChild(renderCelebration(state, topic, level, categoryId));
    return wrap;
  }

  const content = buildCardContent(state, level);
  if (content) wrap.appendChild(content);
  return wrap;
}

function buildCardContent(state: AppState, level: QuestionLevel): HTMLElement | null {
  if (state.queue.length === 0) return null;
  const idx = Math.min(state.currentQuestionIndex, state.queue.length - 1);
  const questionId = state.queue[idx];
  const question = questionId !== undefined ? getMergedTopic(state.activeTopicId) : null;
  const q = question
    ? (() => {
        for (const c of question.categories) {
          const found = c.questions.find((x) => x.id === questionId);
          if (found) return found;
        }
        return null;
      })()
    : null;
  if (!q || questionId === undefined) {
    return errorCard('کارت پیدا نشد.', () => store.dispatch({ type: 'SELECT_CATEGORY', categoryId: null, queue: [] }));
  }

  const position = state.sessionAnswered + 1;
  const total = state.sessionAnswered + state.queue.length;

  const card = buildFlashcard(q, level, state.isFlipped, (newState, btnEl) => {
    const xp = XP_PER_STATE[newState];
    setLastFlashcard(card);
    answerCurrentCard(newState, xp, btnEl);
  });
  card.classList.add('card-enter');
  setLastFlashcard(card);

  return viewport('game-card',
    h('div', { className: 'card-counter' }, `${faNum(position)} از ${faNum(total)}`),
    card,
    h('p', { className: 'card-hint' }, state.isFlipped ? 'یکی از گزینه‌ها را انتخاب کن' : 'برای دیدن پاسخ، روی کارت بزن'),
  );
}

/** Granular patch for card advance within the same game session. */
export function patchGameCard(state: AppState, level: QuestionLevel): boolean {
  const existing = document.getElementById('app-main')?.querySelector('.view--card');
  if (!existing) return false;
  const content = buildCardContent(state, level);
  if (!content) return false;
  patchViewport(existing as HTMLElement, 'game-card', content);
  return true;
}

function renderCelebration(state: AppState, topic: Topic, level: QuestionLevel, categoryId: string): HTMLElement {
  const cat = topic.categories.find((c) => c.id === categoryId);
  const box = h('div', { className: 'celebrate glass' });
  confetti(box);
  box.append(
    h('div', { className: 'celebrate__badge', attrs: { 'aria-hidden': 'true' } }, '🏆'),
    h('h2', { className: 'celebrate__title' }, 'آفرین! تمومش کردی 🎉'),
    h('p', { className: 'celebrate__sub' }, cat ? `دسته «${cat.title}» در سطح ${LEVEL_LABEL[level]}` : ''),
    h(
      'div',
      { className: 'celebrate__stats' },
      statChip('🃏', 'کارت‌ها', faNum(state.sessionAnswered)),
      statChip('✦', 'امتیاز جلسه', faNum(state.sessionXp)),
      statChip('🔥', 'استریک', faNum(state.gamification.streak)),
    ),
    h(
      'div',
      { className: 'celebrate__actions' },
      button('بازگشت به دسته‌ها', () => store.dispatch({ type: 'SELECT_CATEGORY', categoryId: null, queue: [] })),
      button(
        'مرور دوباره',
        () => {
          const merged = getMergedTopic(state.activeTopicId);
          const c = merged?.categories.find((x) => x.id === categoryId);
          const all = c ? c.questions.map((x) => x.id) : [];
          store.dispatch({ type: 'SELECT_CATEGORY', categoryId, queue: all });
        },
        { variant: 'ghost' },
      ),
    ),
  );
  return box;
}
