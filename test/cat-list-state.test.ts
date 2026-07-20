import { describe, it, expect, beforeEach } from 'vitest';
import { FakeElement, installDomStub } from './dom-helpers.js';
import {
  STATE_COLORS,
  computeKnownCount,
  computeProgress,
} from '../src/lib/cat-list-stats.js';
import { applyCategoryItemState, type CatListItemRefs } from '../src/features/game/cat-list.js';
import type { Question, UserQuestionState } from '../src/types.js';

const qs = (id: string): Question[] => [
  { id, question: `Q ${id}?`, answer: `A ${id}` },
];

const us = (entries: Array<[string, 'know' | 'want_to_learn' | 'skip' | 'unseen']>): Record<string, UserQuestionState> => {
  const out: Record<string, UserQuestionState> = {};
  for (const [k, s] of entries) out[`js:${k}`] = { state: s, updatedAt: 1 };
  return out;
};

const formatCount = (k: number, t: number): string => `${k} / ${t}`;

describe('STATE_COLORS', () => {
  it('maps know → var(--junior)', () => expect(STATE_COLORS.know).toBe('var(--junior)'));
  it('maps want_to_learn → var(--mid)', () => expect(STATE_COLORS.want_to_learn).toBe('var(--mid)'));
  it('maps skip → var(--danger)', () => expect(STATE_COLORS.skip).toBe('var(--danger)'));
  it('maps unseen → var(--danger)', () => expect(STATE_COLORS.unseen).toBe('var(--danger)'));
});

describe('computeKnownCount', () => {
  it('returns 0 for empty userStates', () => {
    expect(computeKnownCount(qs('q1'), {}, 'js')).toBe(0);
  });
  it('counts know and want_to_learn only', () => {
    const states = us([
      ['q1', 'know'],
      ['q2', 'want_to_learn'],
      ['q3', 'skip'],
      ['q4', 'unseen'],
    ]);
    expect(computeKnownCount(qs('q1').concat(qs('q2'), qs('q3'), qs('q4')), states, 'js')).toBe(2);
  });
  it('ignores other topic prefixes', () => {
    const states: Record<string, UserQuestionState> = { 'ts:q1': { state: 'know', updatedAt: 1 } };
    expect(computeKnownCount(qs('q1'), states, 'js')).toBe(0);
  });
  it('returns 0 for empty question list', () => {
    expect(computeKnownCount([], us([['q1', 'know']]), 'js')).toBe(0);
  });
});

describe('computeProgress', () => {
  it('total=0 → width 0, no NaN', () => {
    expect(computeProgress(0, 0, formatCount)).toEqual({ text: '0 / 0', widthPct: 0 });
  });
  it('full = 100%', () => {
    expect(computeProgress(3, 3, formatCount)).toEqual({ text: '3 / 3', widthPct: 100 });
  });
  it('half = 50%', () => {
    expect(computeProgress(1, 2, formatCount)).toEqual({ text: '1 / 2', widthPct: 50 });
  });
  it('rounds 2/3 → 67%', () => {
    expect(computeProgress(2, 3, formatCount)).toEqual({ text: '2 / 3', widthPct: 67 });
  });
});

describe('applyCategoryItemState', () => {
  let dom: ReturnType<typeof installDomStub>;
  let refs: CatListItemRefs;

  beforeEach(() => {
    dom = installDomStub();
    const item = new FakeElement();
    const toggle = new FakeElement();
    const body = new FakeElement();
    const count = new FakeElement();
    const bar = new FakeElement();
    item.className = 'cat-list__item';
    toggle.className = 'cat-list__head';
    body.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'true');
    refs = { itemEl: item as unknown as HTMLElement, toggleEl: toggle as unknown as HTMLElement, bodyEl: body as unknown as HTMLElement, countEl: count as unknown as HTMLElement, barFillEl: bar as unknown as HTMLElement };
  });

  it('know → junior color + done classes + body hidden + aria-expanded false', () => {
    applyCategoryItemState(refs, 'know', 4, 1, formatCount);
    expect((refs.itemEl as unknown as FakeElement).style.borderInlineStartColor).toBe('var(--junior)');
    expect(refs.itemEl.classList.contains('cat-list__item--done')).toBe(true);
    expect(refs.toggleEl.classList.contains('cat-list__head--done')).toBe(true);
    expect(refs.bodyEl.hasAttribute('hidden')).toBe(true);
    expect(refs.toggleEl.getAttribute('aria-expanded')).toBe('false');
  });

  it('want_to_learn → mid color, no done classes', () => {
    applyCategoryItemState(refs, 'want_to_learn', 4, 1, formatCount);
    expect((refs.itemEl as unknown as FakeElement).style.borderInlineStartColor).toBe('var(--mid)');
    expect(refs.itemEl.classList.contains('cat-list__item--done')).toBe(false);
    expect(refs.toggleEl.classList.contains('cat-list__head--done')).toBe(false);
  });

  it('skip → danger color, no done classes', () => {
    applyCategoryItemState(refs, 'skip', 4, 1, formatCount);
    expect((refs.itemEl as unknown as FakeElement).style.borderInlineStartColor).toBe('var(--danger)');
    expect(refs.itemEl.classList.contains('cat-list__item--done')).toBe(false);
  });

  it('updates count text and bar width', () => {
    applyCategoryItemState(refs, 'know', 4, 2, formatCount);
    expect((refs.countEl as unknown as FakeElement).textContent).toBe('2 / 4');
    expect((refs.barFillEl as unknown as FakeElement).style.width).toBe('50%');
  });

  it('total=0 → bar 0% (no NaN)', () => {
    applyCategoryItemState(refs, 'know', 0, 0, formatCount);
    expect((refs.barFillEl as unknown as FakeElement).style.width).toBe('0%');
  });

  it('rounds width to integer percent', () => {
    applyCategoryItemState(refs, 'want_to_learn', 3, 2, formatCount);
    expect((refs.barFillEl as unknown as FakeElement).style.width).toBe('67%');
  });
});
