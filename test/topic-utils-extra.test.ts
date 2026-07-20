import { describe, it, expect } from 'vitest';
import { isEligibleForQueue } from '../src/lib/topic-utils.js';
import type { UserQuestionState } from '../src/types.js';

describe('isEligibleForQueue', () => {
  it('returns true for unseen questions', () => {
    expect(isEligibleForQueue({}, 'js', 'q1')).toBe(true);
  });

  it('returns true for skipped questions', () => {
    const us: Record<string, UserQuestionState> = { 'js:q1': { state: 'skip', updatedAt: 100 } };
    expect(isEligibleForQueue(us, 'js', 'q1')).toBe(true);
  });

  it('returns false for known questions', () => {
    const us: Record<string, UserQuestionState> = { 'js:q1': { state: 'know', updatedAt: 100 } };
    expect(isEligibleForQueue(us, 'js', 'q1')).toBe(false);
  });

  it('returns false for want_to_learn questions', () => {
    const us: Record<string, UserQuestionState> = { 'js:q1': { state: 'want_to_learn', updatedAt: 100 } };
    expect(isEligibleForQueue(us, 'js', 'q1')).toBe(false);
  });

  it('different topicId prefix does not match', () => {
    const us: Record<string, UserQuestionState> = { 'ts:q1': { state: 'know', updatedAt: 100 } };
    expect(isEligibleForQueue(us, 'js', 'q1')).toBe(true);
  });
});
