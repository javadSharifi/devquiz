import { buildFlashcard } from '../components/flashcard.js';
import { store } from '../state.js';
import { findQuestion, getMergedTopic } from '../lib/topic-utils.js';
import { answerRandomCard as undoAnswerRandomCard, XP_PER_STATE, setLastFlashcard } from '../lib/undo.js';
import { backButton } from '../lib/helpers.js';
import type { Category, Question } from '../types.js';
import type { AppState } from '../state.js';
import { stateKey } from '../types.js';
import { faNum } from '../types.js';
import { renderMarkdown } from '../markdown.js';
import { button, emptyState, h, toast } from '../ui.js';

const randomSeen = new Set<string>();

function clearRandomSeen(): void {
  randomSeen.clear();
}

function isEligibleForRandom(state: AppState, topicId: string, questionId: string): boolean {
  const s = state.userStates[stateKey(topicId, questionId)]?.state ?? 'unseen';
  return s !== 'know';
}

export function renderReview(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--review' });
  const topic = getMergedTopic(state.activeTopicId);
  if (!topic) return emptyState('📭', 'موضوعی یافت نشد', '');

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
          h('h2', { className: 'view__title view__title--sm' }, '🎲 سؤال تصادفی'),
        ),
      );
      const card = buildFlashcard(q, state.isFlipped, (newState, btn) => {
        const xp = XP_PER_STATE[newState];
        setLastFlashcard(card);
        undoAnswerRandomCard(q, newState, xp, pickRandomQuestion, btn);
      });
      card.classList.add('card-enter');
      setLastFlashcard(card);
      wrap.appendChild(card);
      return wrap;
    }
  }

  wrap.appendChild(
    h(
      'div',
      { className: 'view-head' },
      backButton(() => store.dispatch({ type: 'SET_TAB', tab: 'all-games' })),
      h('h2', { className: 'view__title' }, 'مرور'),
    ),
  );
  wrap.appendChild(
    button('🎲 سؤال تصادفی', () => pickRandomQuestion(), { variant: 'primary', className: 'btn--wide' }),
  );

  const items: { q: Question; cat: Category; topicId: string }[] = [];

  for (const topicId of Object.keys(state.topics)) {
    const topic = getMergedTopic(topicId);
    if (!topic) continue;
    for (const cat of topic.categories) {
      for (const q of cat.questions) {
        const s = state.userStates[stateKey(topicId, q.id)]?.state ?? 'unseen';
        if (s === 'want_to_learn' || s === 'skip') {
          items.push({ q, cat, topicId });
        }
      }
    }
  }

  wrap.appendChild(h('h3', { className: 'section-title' }, `📚 لیست یادگیری (${faNum(items.length)})`));
  if (items.length === 0) {
    wrap.appendChild(
      emptyState('🌱', 'لیست یادگیری خالیه', 'وقتی روی کارتی «یاد می‌گیرم» بزنی، اینجا برای مرور ظاهر می‌شه.'),
    );
    return wrap;
  }
  const list = h('div', { className: 'review-list' });
  for (const { q, cat, topicId } of items) {
    list.appendChild(reviewItem(state, q, cat, topicId));
  }
  wrap.appendChild(list);
  return wrap;
}

function reviewItem(state: AppState, q: Question, cat: Category, topicId: string): HTMLElement {
  const body = h('div', { className: 'review-item__body', attrs: { hidden: '' } });
  let rendered = false;
  const toggle = h(
    'button',
    {
      className: 'review-item__head',
      type: 'button',
      attrs: { 'aria-expanded': 'false', 'aria-label': `نمایش پاسخ: ${q.question.slice(0, 60)}` },
      onClick: () => {
        const hidden = body.hasAttribute('hidden');
        if (hidden && !rendered) {
          body.appendChild(renderMarkdown(q.answer));
          body.appendChild(
            button(
              '✅ بلدم شد',
              () => {
                const key = stateKey(topicId, q.id);
                store.dispatch({ type: 'SET_USER_STATE', key, value: { state: 'know', updatedAt: Date.now() } });
                toast('به «بلدم» منتقل شد ✅', { kind: 'success', duration: 2500 });
                store.dispatch({ type: 'DATA_CHANGED' });
              },
              { variant: 'soft', className: 'act act--know' },
            ),
          );
          rendered = true;
        }
        if (hidden) body.removeAttribute('hidden');
        else body.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', String(hidden));
        item.classList.toggle('review-item--open', hidden);
      },
    },
    h('span', { className: 'review-item__cat', attrs: { 'aria-hidden': 'true' } }, cat.icon),
    h('span', { className: 'review-item__q' }, q.question),
    h('span', { className: 'review-item__chev', attrs: { 'aria-hidden': 'true' } }, '‹'),
  );
  const item = h('div', { className: 'review-item glass' }, toggle, body);
  return item;
}

export function pickRandomQuestion(): void {
  const state = store.getState();
  const pool: { topicId: string; qId: string }[] = [];

  for (const topicId of Object.keys(state.topics)) {
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
    for (const topicId of Object.keys(state.topics)) {
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
      toast('همه سؤال‌ها رو بلدی 🎉', { kind: 'success' });
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
