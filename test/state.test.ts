import { describe, it, expect } from 'vitest';
import { reduce } from '../src/state.js';
import type { Action, AppState } from '../src/state.js';
import type { Gamification } from '../src/types.js';

const baseState: AppState = {
  activeTab: 'game',
  activeTopicId: 'js',
  selectedLevel: 'junior',
  selectedCategoryId: 'cat1',
  queue: ['q1', 'q2', 'q3'],
  currentQuestionIndex: 0,
  isFlipped: false,
  sessionXp: 0,
  sessionAnswered: 0,
  randomQuestionId: null,
  dataRevision: 0,
  topics: {},
  userStates: {},
  customQuestions: [],
  downloadedVersions: {},
  gamification: { streak: 0, xp: 0, lastActiveDate: '' },
  recentTopics: [],
};

const gamification: Gamification = { streak: 3, xp: 150, lastActiveDate: '2026-07-17' };

describe('reduce', () => {
  it('SET_TAB changes activeTab and resets flip/random', () => {
    const s = reduce(baseState, { type: 'SET_TAB', tab: 'review' });
    expect(s.activeTab).toBe('review');
    expect(s.isFlipped).toBe(false);
    expect(s.randomQuestionId).toBeNull();
    expect(s.activeTopicId).toBe(baseState.activeTopicId);
  });

  it('SET_ACTIVE_TOPIC resets selection', () => {
    const s = reduce(baseState, { type: 'SET_ACTIVE_TOPIC', topicId: 'ts' });
    expect(s.activeTopicId).toBe('ts');
    expect(s.selectedLevel).toBeNull();
    expect(s.selectedCategoryId).toBeNull();
    expect(s.queue).toEqual([]);
    expect(s.currentQuestionIndex).toBe(0);
  });

  it('SELECT_LEVEL sets level and resets category', () => {
    const s = reduce(baseState, { type: 'SELECT_LEVEL', level: 'senior' });
    expect(s.selectedLevel).toBe('senior');
    expect(s.selectedCategoryId).toBeNull();
    expect(s.queue).toEqual([]);
  });

  it('SELECT_CATEGORY with id sets category and resets session', () => {
    const s = reduce(baseState, { type: 'SELECT_CATEGORY', categoryId: 'cat2', queue: ['q1'] });
    expect(s.selectedCategoryId).toBe('cat2');
    expect(s.queue).toEqual(['q1']);
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.sessionXp).toBe(0);
    expect(s.sessionAnswered).toBe(0);
  });

  it('SELECT_CATEGORY with null preserves session stats', () => {
    const withXp = { ...baseState, sessionXp: 50, sessionAnswered: 5 };
    const s = reduce(withXp, { type: 'SELECT_CATEGORY', categoryId: null, queue: [] });
    expect(s.selectedCategoryId).toBeNull();
    expect(s.sessionXp).toBe(50);
    expect(s.sessionAnswered).toBe(5);
  });

  it('FLIP_CARD toggles flipped', () => {
    const s = reduce(baseState, { type: 'FLIP_CARD', flipped: true });
    expect(s.isFlipped).toBe(true);
    expect(s.queue).toBe(baseState.queue);
    expect(s.currentQuestionIndex).toBe(baseState.currentQuestionIndex);
  });

  it('ANSWER_CARD updates queue, index, xp, answered — immutable', () => {
    const s = reduce(baseState, {
      type: 'ANSWER_CARD',
      questionKey: 'js:q1',
      state: 'know',
      nextIndex: 1,
      queue: ['q2', 'q3'],
      xpGained: 10,
      incrementAnswer: 1,
    });
    expect(s.queue).toEqual(['q2', 'q3']);
    expect(s.currentQuestionIndex).toBe(1);
    expect(s.isFlipped).toBe(false);
    expect(s.sessionXp).toBe(10);
    expect(s.sessionAnswered).toBe(1);
    expect(s.queue).not.toBe(baseState.queue);
    expect(s.userStates).toBe(baseState.userStates);
  });

  it('ANSWER_CARD with skip does not increment answer count', () => {
    const s = reduce(baseState, {
      type: 'ANSWER_CARD',
      questionKey: 'js:q1',
      state: 'skip',
      nextIndex: 0,
      queue: ['q2', 'q3'],
      xpGained: 0,
      incrementAnswer: 0,
    });
    expect(s.sessionAnswered).toBe(0);
    expect(s.sessionXp).toBe(0);
  });

  it('SET_QUEUE sets queue and index, resets flip', () => {
    const s = reduce({ ...baseState, isFlipped: true }, { type: 'SET_QUEUE', queue: ['q5'], index: 0 });
    expect(s.queue).toEqual(['q5']);
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.isFlipped).toBe(false);
  });

  it('SET_RANDOM_QUESTION sets questionId, resets flip', () => {
    const s = reduce(baseState, { type: 'SET_RANDOM_QUESTION', questionId: 'rand1' });
    expect(s.randomQuestionId).toBe('rand1');
    expect(s.isFlipped).toBe(false);
  });

  it('RESTORE merges snapshot fields', () => {
    const s = reduce(baseState, {
      type: 'RESTORE',
      snapshot: { sessionXp: 100, sessionAnswered: 10, isFlipped: true },
    });
    expect(s.sessionXp).toBe(100);
    expect(s.sessionAnswered).toBe(10);
    expect(s.isFlipped).toBe(true);
    expect(s.activeTab).toBe('game');
  });

  it('SESSION_RESET clears session fields', () => {
    const filled = { ...baseState, sessionXp: 99, sessionAnswered: 9, selectedLevel: 'mid' as const, queue: ['q1'] };
    const s = reduce(filled, { type: 'SESSION_RESET' });
    expect(s.selectedLevel).toBeNull();
    expect(s.selectedCategoryId).toBeNull();
    expect(s.queue).toEqual([]);
    expect(s.sessionXp).toBe(0);
    expect(s.sessionAnswered).toBe(0);
  });

  it('DATA_CHANGED increments dataRevision', () => {
    const s = reduce(baseState, { type: 'DATA_CHANGED' });
    expect(s.dataRevision).toBe(1);
    const s2 = reduce(s, { type: 'DATA_CHANGED' });
    expect(s2.dataRevision).toBe(2);
  });

  it('HYDRATE merges payload fields', () => {
    const s = reduce(baseState, {
      type: 'HYDRATE',
      payload: { gamification, topics: {}, userStates: {}, customQuestions: [], downloadedVersions: {} },
    });
    expect(s.gamification).toEqual(gamification);
  });

  it('SET_USER_STATE adds entry immutably', () => {
    const s = reduce(baseState, { type: 'SET_USER_STATE', key: 'js:q1', value: { state: 'know', updatedAt: 100 } });
    expect(s.userStates['js:q1']).toEqual({ state: 'know', updatedAt: 100 });
    expect(s.userStates).not.toBe(baseState.userStates);
  });

  it('SET_USER_STATE deletes entry when value is null', () => {
    const withState = reduce(baseState, { type: 'SET_USER_STATE', key: 'js:q1', value: { state: 'know', updatedAt: 100 } });
    const s = reduce(withState, { type: 'SET_USER_STATE', key: 'js:q1', value: null });
    expect(s.userStates['js:q1']).toBeUndefined();
  });

  it('SET_GAMIFICATION updates gamification', () => {
    const s = reduce(baseState, { type: 'SET_GAMIFICATION', gamification });
    expect(s.gamification).toEqual(gamification);
    expect(s.gamification).not.toBe(baseState.gamification);
  });

  it('ADD_CUSTOM_QUESTION appends question immutably', () => {
    const q = { id: 'cq1', question: '?', answer: '!', topicId: 'js', categoryId: 'cat1', isCustom: true as const };
    const s = reduce(baseState, { type: 'ADD_CUSTOM_QUESTION', question: q });
    expect(s.customQuestions).toHaveLength(1);
    expect(s.customQuestions[0]).toEqual(q);
    expect(s.customQuestions).not.toBe(baseState.customQuestions);
  });

  it('REPLACE_TOPICS replaces topics map', () => {
    const topics = { js: { meta: { version: '1', topic: 'js', title: 'JS', lang: 'fa' }, categories: [] } };
    const s = reduce(baseState, { type: 'REPLACE_TOPICS', topics });
    expect(s.topics).toEqual(topics);
    expect(s.topics).not.toBe(baseState.topics);
  });
});
