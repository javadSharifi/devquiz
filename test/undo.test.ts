import { describe, it, expect } from 'vitest';
import { XP_PER_STATE } from '../src/lib/undo.js';

describe('XP_PER_STATE', () => {
  it('know gives 10 XP', () => {
    expect(XP_PER_STATE.know).toBe(10);
  });

  it('want_to_learn gives 5 XP', () => {
    expect(XP_PER_STATE.want_to_learn).toBe(5);
  });

  it('skip gives 0 XP', () => {
    expect(XP_PER_STATE.skip).toBe(0);
  });

  it('unseen gives 0 XP', () => {
    expect(XP_PER_STATE.unseen).toBe(0);
  });

  it('all values are non-negative numbers', () => {
    const entries = Object.entries(XP_PER_STATE) as [string, number][];
    for (const [, v] of entries) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
