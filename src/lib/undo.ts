import { store } from '../state.js';
import { recordAnswer, revertXp } from '../storage.js';
import type { QuestionState, UserQuestionState } from '../types.js';
import { stateKey } from '../types.js';
import { toast, xpFloat } from '../ui.js';

export const XP_PER_STATE: Record<QuestionState, number> = {
  know: 10,
  want_to_learn: 5,
  skip: 0,
  unseen: 0,
};

export interface UndoRecord {
  key: string;
  prevUserState: UserQuestionState | undefined;
  xp: number;
  prevQueue: string[];
  prevIndex: number;
  prevSessionXp: number;
  prevSessionAnswered: number;
  wasRandom: boolean;
  prevRandomId: string | null;
}

let lastUndo: UndoRecord | null = null;
let lastFlashcard: HTMLElement | null = null;

export function getLastFlashcard(): HTMLElement | null {
  return lastFlashcard;
}

export function setLastFlashcard(el: HTMLElement | null): void {
  lastFlashcard = el;
}

function storeLastUndo(record: UndoRecord): void {
  lastUndo = record;
}

function showUndoToast(newState: QuestionState): void {
  const label =
    newState === 'know' ? 'ثبت شد: بلدم ✅' : newState === 'want_to_learn' ? 'ثبت شد: یاد می‌گیرم 📚' : 'رد شد ⏭';
  toast(label, {
    actionLabel: 'برگردون',
    duration: 4000,
    onAction: undoLastAnswer,
  });
}

export function answerCurrentCard(
  newState: Exclude<QuestionState, 'unseen'>,
  xpGained: number,
  anchor?: HTMLElement,
): void {
  const s = store.getState();
  if (s.queue.length === 0) return;
  const idx = Math.min(s.currentQuestionIndex, s.queue.length - 1);
  const questionId = s.queue[idx];
  if (questionId === undefined) return;
  const key = stateKey(s.activeTopicId, questionId);

  const prevUserState = s.userStates[key];

  storeLastUndo({
    key,
    prevUserState,
    xp: xpGained,
    prevQueue: s.queue,
    prevIndex: idx,
    prevSessionXp: s.sessionXp,
    prevSessionAnswered: s.sessionAnswered,
    wasRandom: false,
    prevRandomId: null,
  });

  store.dispatch({
    type: 'SET_USER_STATE',
    key,
    value: { state: newState, updatedAt: Date.now() },
  });

  void recordAnswer(xpGained).then((g) => {
    store.dispatch({ type: 'SET_GAMIFICATION', gamification: g });
  });

  if (anchor) xpFloat(anchor, xpGained);

  let nextQueue: string[];
  let nextIndex: number;
  if (newState === 'skip') {
    nextQueue = [...s.queue.slice(0, idx), ...s.queue.slice(idx + 1)];
    nextIndex = Math.min(idx, Math.max(0, nextQueue.length - 1));
  } else {
    nextQueue = [...s.queue.slice(0, idx), ...s.queue.slice(idx + 1)];
    nextIndex = Math.min(idx, Math.max(0, nextQueue.length - 1));
  }

  const dispatchNext = (): void => {
    store.dispatch({
      type: 'ANSWER_CARD',
      questionKey: key,
      state: newState,
      nextIndex,
      queue: nextQueue,
      xpGained,
      incrementAnswer: newState === 'skip' ? 0 : 1,
    });
    showUndoToast(newState);
  };

  if (lastFlashcard) {
    lastFlashcard.classList.add('card-exit');
    setTimeout(dispatchNext, 200);
  } else {
    dispatchNext();
  }
}

export function answerRandomCard(
  q: { id: string },
  newState: Exclude<QuestionState, 'unseen'>,
  xpGained: number,
  onPickNext: () => void,
  anchor?: HTMLElement,
): void {
  const s = store.getState();
  const key = stateKey(s.activeTopicId, q.id);

  const prevUserState = s.userStates[key];

  storeLastUndo({
    key,
    prevUserState,
    xp: xpGained,
    prevQueue: s.queue,
    prevIndex: s.currentQuestionIndex,
    prevSessionXp: s.sessionXp,
    prevSessionAnswered: s.sessionAnswered,
    wasRandom: true,
    prevRandomId: q.id,
  });

  store.dispatch({
    type: 'SET_USER_STATE',
    key,
    value: { state: newState, updatedAt: Date.now() },
  });

  void recordAnswer(xpGained).then((g) => {
    store.dispatch({ type: 'SET_GAMIFICATION', gamification: g });
  });

  if (anchor) xpFloat(anchor, xpGained);

  const next = (): void => {
    onPickNext();
    showUndoToast(newState);
  };

  if (lastFlashcard) {
    lastFlashcard.classList.add('card-exit');
    setTimeout(next, 200);
  } else {
    next();
  }
}

export function undoLastAnswer(): void {
  const u = lastUndo;
  if (!u) return;
  lastUndo = null;

  if (u.prevUserState === undefined) {
    store.dispatch({ type: 'SET_USER_STATE', key: u.key, value: null });
  } else {
    store.dispatch({ type: 'SET_USER_STATE', key: u.key, value: u.prevUserState });
  }

  void revertXp(u.xp).then((g) => {
    store.dispatch({ type: 'SET_GAMIFICATION', gamification: g });
  });

  if (u.wasRandom) {
    store.dispatch({
      type: 'RESTORE',
      snapshot: { sessionXp: u.prevSessionXp, sessionAnswered: u.prevSessionAnswered },
    });
    store.dispatch({ type: 'SET_RANDOM_QUESTION', questionId: u.prevRandomId });
  } else {
    store.dispatch({
      type: 'RESTORE',
      snapshot: {
        queue: u.prevQueue,
        currentQuestionIndex: u.prevIndex,
        sessionXp: u.prevSessionXp,
        sessionAnswered: u.prevSessionAnswered,
        isFlipped: false,
      },
    });
  }
}
