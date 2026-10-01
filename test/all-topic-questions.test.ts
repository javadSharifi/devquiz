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

import { renderAllTopicQuestions } from '../src/features/game/all-topic-questions.js';

describe('renderAllTopicQuestions', () => {
  const sampleTopic: Topic = {
    meta: { version: '1.0.0', topic: 'git', title: 'گیت', lang: 'fa' },
    categories: [
      {
        id: 'cat1',
        title: 'مقدمات',
        level: 'junior',
        icon: '🌱',
        questions: [
          { id: 'q1', question: 'سوال اول', answer: 'پاسخ ۱', priority: 5 },
          { id: 'q2', question: 'سوال دوم', answer: 'پاسخ ۲', priority: 10 },
          { id: 'q3', question: 'سوال سوم', answer: 'پاسخ ۳', priority: 8 },
        ],
      },
    ],
  };

  it('renders all questions sorted by priority descending', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'git',
      userStates: {},
    });

    const el = renderAllTopicQuestions(fakeStore.getState(), sampleTopic);
    expect(el).toBeInstanceOf(FakeElement);
    expect(el.className).toContain('view--all-questions');

    const questionTexts = (el as any).querySelectorAll('.all-q__question-text');
    // q2 (priority 10) should come first, then q3 (priority 8), then q1 (priority 5)
    // In our DOM stub, check the list container
    const list = el.childNodes.find((c: any) => c.className?.includes('all-questions__list')) as FakeElement;
    expect(list).toBeDefined();

    const items = list.childNodes.filter((c: any) => c.className?.includes('all-q__item')) as FakeElement[];
    expect(items).toHaveLength(3);

    // First item is q2
    expect(items[0].textContent).toContain('سوال دوم');
    expect(items[0].textContent).toContain('۱۰۰٪');

    // Second item is q3
    expect(items[1].textContent).toContain('سوال سوم');
    expect(items[1].textContent).toContain('۸۰٪');

    // Third item is q1
    expect(items[2].textContent).toContain('سوال اول');
    expect(items[2].textContent).toContain('۵۰٪');
  });
});
