import { describe, it, expect } from 'vitest';
import { levelStats, categoryStats } from '../src/lib/topic-utils.js';
import type { Topic, Category, UserQuestionState } from '../src/types.js';

const cat1: Category = {
  id: 'vars',
  title: 'Variables',
  level: 'junior',
  icon: '📦',
  questions: [
    { id: 'q1', question: 'What is let?', answer: 'A block-scoped variable' },
    { id: 'q2', question: 'What is const?', answer: 'A constant reference' },
  ],
};

const cat2: Category = {
  id: 'scope',
  title: 'Scope',
  level: 'junior',
  icon: '🔭',
  questions: [
    { id: 'q3', question: 'What is closure?', answer: 'A function with its lexical scope' },
  ],
};

const cat3: Category = {
  id: 'types',
  title: 'Types',
  level: 'mid',
  icon: '🏷️',
  questions: [
    { id: 'q4', question: 'What is a union type?', answer: 'A type that can be one of several types' },
  ],
};

const topic: Topic = {
  meta: { version: '1.0', topic: 'js', title: 'JavaScript', lang: 'en' },
  categories: [cat1, cat2, cat3],
};

describe('levelStats', () => {
  it('returns 0 done and total for empty userStates', () => {
    const result = levelStats(topic, 'js', 'junior', {});
    expect(result).toEqual({ done: 0, total: 3 });
  });

  it('counts know/want_to_learn as done', () => {
    const us: Record<string, UserQuestionState> = {
      'js:q1': { state: 'know', updatedAt: 100 },
      'js:q3': { state: 'want_to_learn', updatedAt: 200 },
    };
    const result = levelStats(topic, 'js', 'junior', us);
    expect(result).toEqual({ done: 2, total: 3 });
  });

  it('skip and unseen are not counted as done', () => {
    const us: Record<string, UserQuestionState> = {
      'js:q1': { state: 'know', updatedAt: 100 },
      'js:q2': { state: 'skip', updatedAt: 200 },
      'js:q3': { state: 'unseen', updatedAt: 0 },
    };
    const result = levelStats(topic, 'js', 'junior', us);
    expect(result).toEqual({ done: 1, total: 3 });
  });

  it('mid level only counts mid category', () => {
    const us: Record<string, UserQuestionState> = {
      'js:q4': { state: 'know', updatedAt: 100 },
    };
    const result = levelStats(topic, 'js', 'mid', us);
    expect(result).toEqual({ done: 1, total: 1 });
  });

  it('senior level returns 0 total when no senior categories', () => {
    const result = levelStats(topic, 'js', 'senior', {});
    expect(result).toEqual({ done: 0, total: 0 });
  });

  it('is pure: does not mutate inputs', () => {
    const us: Record<string, UserQuestionState> = {};
    const topicBefore = JSON.stringify(topic);
    levelStats(topic, 'js', 'junior', us);
    expect(JSON.stringify(topic)).toBe(topicBefore);
  });
});

describe('categoryStats', () => {
  it('returns done and total for a category', () => {
    const us: Record<string, UserQuestionState> = {
      'js:q1': { state: 'know', updatedAt: 100 },
      'js:q2': { state: 'want_to_learn', updatedAt: 200 },
    };
    const result = categoryStats(cat1, 'js', us);
    expect(result).toEqual({ done: 2, total: 2 });
  });

  it('skip is not counted as done', () => {
    const us: Record<string, UserQuestionState> = {
      'js:q1': { state: 'know', updatedAt: 100 },
      'js:q2': { state: 'skip', updatedAt: 200 },
    };
    const result = categoryStats(cat1, 'js', us);
    expect(result).toEqual({ done: 1, total: 2 });
  });

  it('empty userStates returns 0 done', () => {
    const result = categoryStats(cat1, 'js', {});
    expect(result).toEqual({ done: 0, total: 2 });
  });

  it('different topicId prefix does not match', () => {
    const us: Record<string, UserQuestionState> = {
      'ts:q1': { state: 'know', updatedAt: 100 },
    };
    const result = categoryStats(cat1, 'js', us);
    expect(result).toEqual({ done: 0, total: 2 });
  });
});
