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

  it('renders quick-know shortcut button on each question item and updates state on click without opening card', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'git',
      userStates: {},
    });

    const el = renderAllTopicQuestions(fakeStore.getState(), sampleTopic);
    const list = el.childNodes.find((c: any) => c.className?.includes('all-questions__list')) as FakeElement;
    const items = list.childNodes.filter((c: any) => c.className?.includes('all-q__item')) as FakeElement[];

    // Check first item (q2)
    const firstItem = items[0];
    const headWrap = firstItem.childNodes.find((c: any) => c.className?.includes('all-q__head-wrap')) as FakeElement;
    expect(headWrap).toBeDefined();

    const quickKnowBtn = headWrap.childNodes.find((c: any) => c.className?.includes('all-q__quick-know')) as FakeElement;
    expect(quickKnowBtn).toBeDefined();
    expect(quickKnowBtn.textContent).toBe('✅ بلدم');

    const body = firstItem.childNodes.find((c: any) => c.className?.includes('cat-list__body')) as FakeElement;
    expect(body.hasAttribute('hidden')).toBe(true);

    // Click quick-know button
    dom.dispatchClick(quickKnowBtn);

    // Should dispatch SET_USER_STATE with know
    expect(fakeStore.dispatch).toHaveBeenCalledWith({
      type: 'SET_USER_STATE',
      key: 'git:q2',
      value: expect.objectContaining({ state: 'know' }),
    });

    // Card should NOT be opened
    expect(body.hasAttribute('hidden')).toBe(true);
    expect(firstItem.classList.contains('cat-list__item--open')).toBe(false);

    // Card should be marked as done
    expect(firstItem.classList.contains('cat-list__item--done')).toBe(true);
    expect(quickKnowBtn.classList.contains('all-q__quick-know--done')).toBe(true);
    expect(quickKnowBtn.textContent).toBe('✔ بلدم');
  });

  it('renders quick-know button with done state if question is already known', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'git',
      userStates: {
        'git:q2': { state: 'know', updatedAt: 123 },
      },
    });

    const el = renderAllTopicQuestions(fakeStore.getState(), sampleTopic);
    const list = el.childNodes.find((c: any) => c.className?.includes('all-questions__list')) as FakeElement;
    const items = list.childNodes.filter((c: any) => c.className?.includes('all-q__item')) as FakeElement[];

    const firstItem = items[0]; // q2
    expect(firstItem.className).toContain('cat-list__item--done');

    const headWrap = firstItem.childNodes.find((c: any) => c.className?.includes('all-q__head-wrap')) as FakeElement;
    const quickKnowBtn = headWrap.childNodes.find((c: any) => c.className?.includes('all-q__quick-know')) as FakeElement;
    expect(quickKnowBtn.className).toContain('all-q__quick-know--done');
    expect(quickKnowBtn.textContent).toBe('✔ بلدم');
  });

  it('collapses card and calls scrollIntoView when answering via inline action buttons', () => {
    fakeStore.getState.mockReturnValue({
      activeTopicId: 'git',
      userStates: {},
    });

    const el = renderAllTopicQuestions(fakeStore.getState(), sampleTopic);
    const list = el.childNodes.find((c: any) => c.className?.includes('all-questions__list')) as FakeElement;
    const items = list.childNodes.filter((c: any) => c.className?.includes('all-q__item')) as FakeElement[];
    const firstItem = items[0];

    const headWrap = firstItem.childNodes.find((c: any) => c.className?.includes('all-q__head-wrap')) as FakeElement;
    const toggle = headWrap.childNodes.find((c: any) => c.className?.includes('cat-list__head')) as FakeElement;
    const body = firstItem.childNodes.find((c: any) => c.className?.includes('cat-list__body')) as FakeElement;

    // Open card
    dom.dispatchClick(toggle);
    expect(body.hasAttribute('hidden')).toBe(false);
    expect(firstItem.classList.contains('cat-list__item--open')).toBe(true);

    // Spy on scrollIntoView
    let scrollOptions: unknown = null;
    firstItem.scrollIntoView = (opts?: any) => {
      scrollOptions = opts;
    };

    // Find inline know button
    const actionsInline = body.childNodes.find((c: any) => c.className?.includes('cat-list__actions-inline')) as FakeElement;
    expect(actionsInline).toBeDefined();
    const knowBtn = actionsInline.childNodes.find((c: any) => c.className?.includes('act--know')) as FakeElement;
    expect(knowBtn).toBeDefined();

    // Click know button
    dom.dispatchClick(knowBtn);

    // Assert card is collapsed and scrollIntoView called
    expect(body.hasAttribute('hidden')).toBe(true);
    expect(firstItem.classList.contains('cat-list__item--open')).toBe(false);
    expect(scrollOptions).toEqual({ block: 'nearest' });
  });
});
