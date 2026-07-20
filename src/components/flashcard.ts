import { renderMarkdown } from '../markdown.js';
import { store } from '../state.js';
import type { Question, QuestionState } from '../types.js';
import { button, h } from '../ui.js';

export function buildFlashcard(
  question: Question,
  flipped: boolean,
  onAnswer: (s: Exclude<QuestionState, 'unseen'>, btn: HTMLElement) => void,
): HTMLElement {
  const front = h(
    'div',
    { className: 'flashcard__face flashcard__face--front' },
    h('div', { className: 'face__body' }, renderMarkdown(question.question)),
    h('div', { className: 'face__foot', attrs: { 'aria-hidden': 'true' } }, '👆 پاسخ'),
  );
  const actions = h(
    'div',
    { className: 'face__actions' },
    button('✅ بلدم', (ev) => onAnswer('know', ev.currentTarget as HTMLElement), {
      variant: 'soft',
      className: 'act act--know',
      ariaLabel: 'بلدم (فلش چپ)',
    }),
    button('📚 یاد می‌گیرم', (ev) => onAnswer('want_to_learn', ev.currentTarget as HTMLElement), {
      variant: 'soft',
      className: 'act act--learn',
      ariaLabel: 'یاد می‌گیرم (فلش پایین)',
    }),
    button('⏭ رد کن', (ev) => onAnswer('skip', ev.currentTarget as HTMLElement), {
      variant: 'soft',
      className: 'act act--skip',
      ariaLabel: 'رد کن (فلش راست)',
    }),
  );
  const back = h(
    'div',
    { className: 'flashcard__face flashcard__face--back' },
    h('div', { className: 'face__badge face__badge--answer' }, 'پاسخ'),
    h('div', { className: 'face__body face__body--answer' }, renderMarkdown(question.answer)),
    actions,
  );
  const inner = h('div', { className: 'flashcard__inner' }, front, back);
  const card = h(
    'div',
    {
      className: `flashcard${flipped ? ' flashcard--flipped' : ''}`,
      tabIndex: 0,
      attrs: {
        role: 'button',
        'aria-label': flipped ? 'پاسخ. برای برگشتن به سؤال کلیک کن' : 'سؤال. برای دیدن پاسخ کلیک کن',
      },
      onClick: (ev) => {
        const t = ev.target as HTMLElement;
        if (t.closest('.face__actions') || t.closest('a')) return;
        store.dispatch({ type: 'FLIP_CARD', flipped: !store.getState().isFlipped });
      },
    },
    inner,
  );
  return card;
}

export function applyFlip(flipped: boolean, mainEl: HTMLElement, liveRegion: HTMLElement): void {
  const card = mainEl.querySelector<HTMLElement>('.flashcard');
  if (!card) return;
  card.classList.toggle('flashcard--flipped', flipped);
  card.setAttribute(
    'aria-label',
    flipped ? 'پاسخ. برای برگشتن به سؤال کلیک کن' : 'سؤال. برای دیدن پاسخ کلیک کن',
  );
  liveRegion.textContent = flipped ? 'پاسخ نمایش داده شد' : 'سؤال نمایش داده شد';
}
