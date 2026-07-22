import { buildFlashcard } from '../components/flashcard.js';
import { store } from '../state.js';
import { getMergedTopic, categoryStats, levelStats } from '../lib/topic-utils.js';
import { answerCurrentCard, XP_PER_STATE, setLastFlashcard } from '../lib/undo.js';
import { backButton, statChip, topicIconEl } from '../lib/helpers.js';
import { viewport, patchViewport } from '../lib/dom-patch.js';
import { renderCategoryList } from './game/cat-list.js';
import type { QuestionLevel, Topic } from '../types.js';
import type { AppState } from '../state.js';
import { faNum } from '../types.js';
import { button, confetti, emptyState, errorCard, h, progressBar } from '../ui.js';

const LEVEL_INFO: { level: QuestionLevel; label: string; tagline: string; emoji: string; cssClass: string }[] = [
  { level: 'junior', label: 'جونیور', tagline: 'مبانی و اصول پایه', emoji: '🌱', cssClass: 'level-pick__card--junior' },
  { level: 'mid', label: 'میدلول', tagline: 'حل مسئله و طراحی', emoji: '⚙️', cssClass: 'level-pick__card--mid' },
  { level: 'senior', label: 'سنیور', tagline: 'معماری و تصمیم‌های سخت', emoji: '🧭', cssClass: 'level-pick__card--senior' },
];

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

  if (state.selectedCategoryId === null) {
    const levelsPresent = new Set(topic.categories.map((c) => c.level));
    const multiLevel = levelsPresent.size > 1;
    const wrap = multiLevel && state.selectedLevel === null
      ? renderLevelPicker(state, topic)
      : renderAllCategories(state, topic);
    const switcher = renderTopicSwitcher(state);
    if (switcher) wrap.prepend(switcher);
    return wrap;
  }
  const finishedSession = state.queue.length === 0 && state.sessionAnswered > 0;
  if (state.currentQuestionIndex < state.queue.length || finishedSession) {
    return renderFlashcardScreen(state, topic, state.selectedCategoryId);
  }
  return renderCategoryList(state, topic, state.selectedCategoryId);
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

function renderLevelPicker(state: AppState, topic: Topic): HTMLElement {
  const wrap = h('div', { className: 'view view--level-pick' });
  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SET_TAB', tab: 'all-games' })),
      h('h2', { className: 'view__title' }, 'انتخاب سطح'),
    ),
  );
  wrap.appendChild(
    h('p', { className: 'view__sub' }, 'یکی از سطوح را انتخاب کن. سوالات همون سطح و بالاتر نمایش داده می‌شن.'),
  );

  const list = h('div', { className: 'level-pick__list' });
  for (const info of LEVEL_INFO) {
    const { done, total } = levelStats(topic, state.activeTopicId, info.level, state.userStates);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const card = h(
      'button',
      {
        className: `level-pick__card glass ${info.cssClass}`,
        type: 'button',
        attrs: { 'aria-label': `سطح ${info.label}: ${faNum(pct)} درصد پاسخ` },
        onClick: () => store.dispatch({ type: 'SELECT_LEVEL', level: info.level }),
      },
      h('div', { className: 'level-pick__head' },
        h('span', { className: 'level-pick__emoji', attrs: { 'aria-hidden': 'true' } }, info.emoji),
        h('div', { className: 'level-pick__titles' },
          h('span', { className: 'level-pick__label' }, info.label),
          h('span', { className: 'level-pick__tag' }, info.tagline),
        ),
        h('div', { className: 'level-pick__pct' }, `${faNum(pct)}٪`),
      ),
      h('div', { className: 'level-pick__bar' },
        h('div', { className: 'level-pick__bar-fill', style: { width: `${pct}%` } }),
      ),
      h('div', { className: 'level-pick__meta' },
        h('span', {}, `${faNum(done)} از ${faNum(total)} سؤال پاسخ داده شده`),
      ),
    );
    list.appendChild(card);
  }
  wrap.appendChild(list);
  return wrap;
}

function renderAllCategories(state: AppState, topic: Topic): HTMLElement {
  const wrap = h('div', { className: 'view view--categories' });
  const levelsPresent = new Set(topic.categories.map((c) => c.level));
  const multiLevel = levelsPresent.size > 1;
  const onBack = multiLevel
    ? () => store.dispatch({ type: 'SELECT_LEVEL', level: null })
    : () => store.dispatch({ type: 'SET_TAB', tab: 'all-games' });

  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(onBack),
      h('h2', { className: 'view__title' }, 'دسته‌بندی‌ها'),
    ),
  );
  if (state.selectedLevel !== null) {
    const info = LEVEL_INFO.find((l) => l.level === state.selectedLevel);
    wrap.appendChild(
      h('div', { className: 'level-filter-note' },
        h('span', {}, `سطح انتخاب‌شده: ${info?.label ?? state.selectedLevel}`),
        h('button', {
          className: 'level-filter-note__clear',
          type: 'button',
          attrs: { 'aria-label': 'تغییر سطح' },
          onClick: () => store.dispatch({ type: 'SELECT_LEVEL', level: null }),
        }, 'تغییر سطح'),
      ),
    );
  }

  const visibleCats = state.selectedLevel === null
    ? topic.categories
    : topic.categories.filter((c) => c.level === state.selectedLevel);

  const grid = h('div', { className: 'cat-grid' });
  if (visibleCats.length === 0) {
    wrap.appendChild(emptyState('🗂️', 'دسته‌ای پیدا نشد', 'برای این سطح سوالی وجود ندارد.'));
    return wrap;
  }
  for (const cat of visibleCats) {
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

function renderFlashcardScreen(
  state: AppState,
  topic: Topic,
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
    wrap.appendChild(renderCelebration(state, topic, categoryId));
    return wrap;
  }

  const content = buildCardContent(state);
  if (content) wrap.appendChild(content);
  return wrap;
}

function buildCardContent(state: AppState): HTMLElement | null {
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

  const card = buildFlashcard(q, state.isFlipped, (newState, btnEl) => {
    const xp = XP_PER_STATE[newState];
    setLastFlashcard(card);
    answerCurrentCard(newState, xp, btnEl);
  });
  card.classList.add('card-enter');
  setLastFlashcard(card);

  return viewport('game-card',
    h('div', { className: 'card-counter' }, `${faNum(position)} از ${faNum(total)}`),
    card,
  );
}

/** Granular patch for card advance within the same game session. */
export function patchGameCard(state: AppState): boolean {
  const existing = document.getElementById('app-main')?.querySelector('.view--card');
  if (!existing) return false;
  const content = buildCardContent(state);
  if (!content) return false;
  patchViewport(existing as HTMLElement, 'game-card', content);
  const flashcard = content.querySelector('.flashcard') as HTMLElement | null;
  if (flashcard) flashcard.focus();
  return true;
}

function renderCelebration(state: AppState, topic: Topic, categoryId: string): HTMLElement {
  const cat = topic.categories.find((c) => c.id === categoryId);
  const box = h('div', { className: 'celebrate glass' });
  confetti(box);
  box.append(
    h('div', { className: 'celebrate__badge', attrs: { 'aria-hidden': 'true' } }, '🏆'),
    h('h2', { className: 'celebrate__title' }, 'آفرین! تمومش کردی 🎉'),
    h('p', { className: 'celebrate__sub' }, cat ? `دسته «${cat.title}»` : ''),
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
