/* ============================================================
 * DevQuiz — app/keyboard.ts
 * RTL-aware keyboard shortcuts for flashcard views.
 * Space/Enter flip; ← know, ↓ want_to_learn, → skip.
 * Ignores when focus is in form fields.
 * ============================================================ */

import { store } from '../state.js';
import { answerCurrentCard, answerRandomCard, XP_PER_STATE } from '../lib/undo.js';
import { findQuestion } from '../lib/topic-utils.js';
import { pickRandomQuestion } from '../features/review.js';
import type { AppShell } from './router.js';

export function bindKeyboard(shell: AppShell): void {
  document.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    ) {
      return;
    }
    const card = shell.mainEl.querySelector<HTMLElement>('.flashcard');
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
