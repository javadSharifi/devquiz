import { describe, it, expect } from 'vitest';
import { reduce } from '../src/state.js';
import type { Action, AppState } from '../src/state.js';
import type { Gamification, TopicCatalogItem } from '../src/types.js';

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

describe('reduce — remaining actions', () => {
  it('SET_CATALOG replaces catalog', () => {
    const cat: TopicCatalogItem[] = [{ id: 'js', title: 'JS', description: 'd', version: '1', downloadUrl: 'https://gist.github.com/u/r' }];
    const s = reduce(baseState, { type: 'SET_CATALOG', catalog: cat });
    expect(s.catalog).toEqual(cat);
    expect(s.catalog).not.toBe(baseState.catalog);
  });

  it('SET_RECENT_TOPICS replaces recentTopics', () => {
    const s = reduce(baseState, { type: 'SET_RECENT_TOPICS', topicIds: ['ts', 'js'] });
    expect(s.recentTopics).toEqual(['ts', 'js']);
  });

  it('REPLACE_CUSTOM_QUESTIONS replaces questions', () => {
    const qs = [{ id: 'cq1', question: '?', answer: '!', topicId: 'js', categoryId: 'cat1', isCustom: true as const }];
    const s = reduce(baseState, { type: 'REPLACE_CUSTOM_QUESTIONS', questions: qs });
    expect(s.customQuestions).toEqual(qs);
    expect(s.customQuestions).not.toBe(baseState.customQuestions);
  });

  it('REPLACE_DOWNLOADED_VERSIONS replaces versions', () => {
    const s = reduce(baseState, { type: 'REPLACE_DOWNLOADED_VERSIONS', versions: { js: '2.0' } });
    expect(s.downloadedVersions).toEqual({ js: '2.0' });
  });

  it('REPLACE_USER_STATES replaces userStates', () => {
    const us = { 'js:q1': { state: 'know' as const, updatedAt: 100 } };
    const s = reduce(baseState, { type: 'REPLACE_USER_STATES', userStates: us });
    expect(s.userStates).toEqual(us);
    expect(s.userStates).not.toBe(baseState.userStates);
  });

  it('SET_FONT_SIZE updates fontSize', () => {
    const s = reduce(baseState, { type: 'SET_FONT_SIZE', fontSize: 'large' });
    expect(s.fontSize).toBe('large');
  });

  it('SET_THEME updates theme', () => {
    const s = reduce(baseState, { type: 'SET_THEME', theme: 'light' });
    expect(s.theme).toBe('light');
  });

  it('REPLACE_TOPICS auto-selects first topic when active missing', () => {
    const topics = { ts: { meta: { version: '1', topic: 'ts', title: 'TS', lang: 'fa' }, categories: [] } };
    const s = reduce(baseState, { type: 'REPLACE_TOPICS', topics });
    expect(s.activeTopicId).toBe('ts');
    expect(s.selectedLevel).toBeNull();
    expect(s.selectedCategoryId).toBeNull();
  });

  it('REPLACE_TOPICS keeps active topic when it exists', () => {
    const topics = { js: { meta: { version: '1', topic: 'js', title: 'JS', lang: 'fa' }, categories: [] } };
    const s = reduce(baseState, { type: 'REPLACE_TOPICS', topics });
    expect(s.activeTopicId).toBe('js');
  });

  it('REPLACE_TOPICS with empty topics picks empty string', () => {
    const s = reduce(baseState, { type: 'REPLACE_TOPICS', topics: {} });
    expect(s.activeTopicId).toBe('');
  });

  it('HYDRATE preserves recentTopics when not in payload', () => {
    const withRecent = { ...baseState, recentTopics: ['js'] };
    const s = reduce(withRecent, {
      type: 'HYDRATE',
      payload: { gamification, topics: {}, userStates: {}, customQuestions: [], downloadedVersions: {} },
    });
    expect(s.recentTopics).toEqual(['js']);
  });

  it('HYDRATE overwrites recentTopics when in payload', () => {
    const s = reduce(baseState, {
      type: 'HYDRATE',
      payload: { gamification, topics: {}, userStates: {}, customQuestions: [], downloadedVersions: {}, recentTopics: ['ts'] },
    });
    expect(s.recentTopics).toEqual(['ts']);
  });

  it('SET_ACTIVE_TOPIC maintains recentTopics order (max 8)', () => {
    const withRecent = { ...baseState, recentTopics: ['a', 'b', 'c'] };
    const s = reduce(withRecent, { type: 'SET_ACTIVE_TOPIC', topicId: 'b' });
    expect(s.recentTopics).toEqual(['b', 'a', 'c']);
  });

  it('SET_ACTIVE_TOPIC with empty string does nothing to recentTopics', () => {
    const withRecent = { ...baseState, recentTopics: ['a', 'b'] };
    const s = reduce(withRecent, { type: 'SET_ACTIVE_TOPIC', topicId: '' });
    expect(s.recentTopics).toEqual(['a', 'b']);
  });
});
