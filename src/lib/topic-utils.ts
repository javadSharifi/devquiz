import { store } from '../state.js';
import type { Category, Question, QuestionLevel, QuestionState, Topic, UserQuestionState } from '../types.js';
import { stateKey } from '../types.js';

function qState(userStates: Record<string, UserQuestionState>, topicId: string, questionId: string): QuestionState {
  return userStates[stateKey(topicId, questionId)]?.state ?? 'unseen';
}

export function isEligibleForQueue(userStates: Record<string, UserQuestionState>, topicId: string, questionId: string): boolean {
  const s = qState(userStates, topicId, questionId);
  return s === 'unseen' || s === 'skip';
}

export function getMergedTopic(topicId: string): Topic | null {
  const { topics, customQuestions } = store.getState();
  const base = topics[topicId];
  if (!base) return null;
  const merged: Topic = {
    meta: { ...base.meta },
    categories: base.categories.map((c: Category) => ({ ...c, questions: [...c.questions] })),
  };
  for (const cq of customQuestions) {
    if (cq.topicId !== topicId) continue;
    let cat = merged.categories.find((c) => c.id === cq.categoryId);
    if (!cat) {
      cat = {
        id: cq.categoryId,
        title: cq.categoryTitle ?? 'سوال‌های من',
        level: cq.categoryLevel ?? 'junior',
        icon: '📝',
        questions: [],
      };
      merged.categories.push(cat);
    }
    cat.questions.push({ ...cq });
  }
  return merged;
}

export function findQuestion(topicId: string, questionId: string): Question | null {
  const merged = getMergedTopic(topicId);
  if (!merged) return null;
  for (const cat of merged.categories) {
    const q = cat.questions.find((x) => x.id === questionId);
    if (q) return q;
  }
  return null;
}

export function catOf(questionId: string): Category | null {
  const { activeTopicId } = store.getState();
  const merged = getMergedTopic(activeTopicId);
  if (!merged) return null;
  for (const cat of merged.categories) {
    if (cat.questions.some((q) => q.id === questionId)) return cat;
  }
  return null;
}

export function levelStats(
  topic: Topic,
  topicId: string,
  level: QuestionLevel,
  userStates: Record<string, UserQuestionState>,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const cat of topic.categories) {
    if (cat.level !== level) continue;
    total += cat.questions.length;
    for (const q of cat.questions) {
      const s = qState(userStates, topicId, q.id);
      if (s === 'know' || s === 'want_to_learn') done++;
    }
  }
  return { done, total };
}

export function categoryStats(
  cat: Category,
  topicId: string,
  userStates: Record<string, UserQuestionState>,
): { done: number; total: number } {
  let done = 0;
  const total = cat.questions.length;
  for (const q of cat.questions) {
    const s = qState(userStates, topicId, q.id);
    if (s === 'know' || s === 'want_to_learn') done++;
  }
  return { done, total };
}

export function buildQueue(topicId: string, categoryId: string): string[] {
  const merged = getMergedTopic(topicId);
  const cat = merged?.categories.find((c) => c.id === categoryId);
  if (!cat) return [];
  const { userStates } = store.getState();
  return cat.questions
    .filter((q) => isEligibleForQueue(userStates, topicId, q.id))
    .map((q) => q.id);
}
