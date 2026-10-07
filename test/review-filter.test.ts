import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';
import type { Topic } from '../src/types.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    getState: vi.fn(),
    dispatch: vi.fn(),
  },
}));

vi.mock('../src/state.js', () => ({ store: fakeStore }));
vi.mock('../src/lib/topic-utils.js', () => ({
  getMergedTopic: (id: string) => {
    const s = fakeStore.getState();
    return s.topics?.[id] ?? null;
  },
  findQuestion: (topicId: string, qId: string) => {
    const s = fakeStore.getState();
    const t = s.topics?.[topicId];
    if (!t) return null;
    for (const c of t.categories) {
      for (const q of c.questions) {
        if (q.id === qId) return q;
      }
    }
    return null;
  },
}));

import {
  renderReview,
  pickRandomQuestion,
  getReviewTopicFilter,
  setReviewTopicFilter,
  resetReviewFilters,
} from '../src/features/review.js';

describe('Review Filtering', () => {
  const jsTopic: Topic = {
    meta: { version: '1.0.0', topic: 'javascript', title: 'جاوااسکریپت', lang: 'fa', icon: '⚡' },
    categories: [
      {
        id: 'js-basics',
        title: 'مبانی JS',
        level: 'junior',
        icon: '📜',
        questions: [
          { id: 'js1', question: 'جاوااسکریپت چیست؟', answer: 'زبان برنامه‌نویسی' },
          { id: 'js2', question: 'Closure چیست؟', answer: 'توابع با محیط بسته' },
        ],
      },
    ],
  };

  const reactTopic: Topic = {
    meta: { version: '1.0.0', topic: 'react', title: 'ری‌اکت', lang: 'fa', icon: '⚛️' },
    categories: [
      {
        id: 'react-basics',
        title: 'مبانی React',
        level: 'mid',
        icon: '⚛️',
        questions: [
          { id: 'r1', question: 'Hook چیست؟', answer: 'قابلیت استفاده از استیت' },
        ],
      },
    ],
  };

  beforeEach(() => {
    resetReviewFilters();
    fakeStore.dispatch.mockClear();
  });

function findByClass(node: any, cls: string): any[] {
  const result: any[] = [];
  if (node.className && typeof node.className === 'string') {
    const classes = node.className.split(/\s+/);
    if (classes.includes(cls)) {
      result.push(node);
    }
  }
  if (Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) {
      result.push(...findByClass(child, cls));
    }
  }
  return result;
}

  it('renders topic chips for each available topic plus all chip', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'javascript',
      activeTab: 'review',
      randomQuestionId: null,
      isFlipped: false,
      topics: { javascript: jsTopic, react: reactTopic },
      catalog: [],
      userStates: {
        'javascript:js1': { state: 'want_to_learn', updatedAt: 1 },
        'react:r1': { state: 'skip', updatedAt: 2 },
      },
    });

    const el = renderReview(fakeStore.getState());
    expect(el).toBeInstanceOf(FakeElement);

    const chips = findByClass(el, 'review-chip');
    expect(chips.length).toBe(3); // "همه", "جاوااسکریپت", "ری‌اکت"
  });

  it('filters questions to only selected topic when topic chip is clicked', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'javascript',
      activeTab: 'review',
      randomQuestionId: null,
      isFlipped: false,
      topics: { javascript: jsTopic, react: reactTopic },
      catalog: [],
      userStates: {
        'javascript:js1': { state: 'want_to_learn', updatedAt: 1 },
        'javascript:js2': { state: 'want_to_learn', updatedAt: 2 },
        'react:r1': { state: 'want_to_learn', updatedAt: 3 },
      },
    });

    // Set filter to javascript
    setReviewTopicFilter('javascript');
    expect(getReviewTopicFilter()).toBe('javascript');

    const el = renderReview(fakeStore.getState());
    const items = findByClass(el, 'review-item');
    expect(items.length).toBe(2); // Only js1 and js2

    // Check random question button label mentions topic
    const btn = findByClass(el, 'btn--wide')[0];
    expect(btn.textContent).toContain('جاوااسکریپت');
  });

  it('does not render chips for topics that have 0 review questions', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'javascript',
      activeTab: 'review',
      randomQuestionId: null,
      isFlipped: false,
      topics: { javascript: jsTopic, react: reactTopic },
      catalog: [],
      userStates: {
        'javascript:js1': { state: 'want_to_learn', updatedAt: 1 },
        // react has 0 items in want_to_learn or skip
      },
    });

    const el = renderReview(fakeStore.getState());
    expect(el).toBeInstanceOf(FakeElement);

    const chips = findByClass(el, 'review-chip');
    // Only "همه" and "جاوااسکریپت" should be rendered; "ری‌اکت" should NOT be rendered!
    expect(chips.length).toBe(2);
    expect(el.textContent).toContain('جاوااسکریپت');
    expect(chips.some((c) => c.textContent?.includes('ری‌اکت'))).toBe(false);
  });

  it('renders clean empty state when no topics have any review items', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'javascript',
      activeTab: 'review',
      randomQuestionId: null,
      isFlipped: false,
      topics: { javascript: jsTopic, react: reactTopic },
      catalog: [],
      userStates: {},
    });

    const el = renderReview(fakeStore.getState());
    expect(el.textContent).toContain('لیست یادگیری خالیه');
    // No chips rendered at all
    const chips = findByClass(el, 'review-chip');
    expect(chips.length).toBe(0);
  });

  it('pickRandomQuestion with topic filter only picks from filtered topic', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'javascript',
      topics: { javascript: jsTopic, react: reactTopic },
      userStates: {
        'javascript:js1': { state: 'unseen', updatedAt: 1 },
        'react:r1': { state: 'unseen', updatedAt: 2 },
      },
    });

    pickRandomQuestion('react');

    expect(fakeStore.dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_TOPIC',
      topicId: 'react',
    });
    expect(fakeStore.dispatch).toHaveBeenCalledWith({
      type: 'SET_RANDOM_QUESTION',
      questionId: 'r1',
    });
  });
});
