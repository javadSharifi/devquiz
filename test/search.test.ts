import { describe, it, expect } from 'vitest';
import { normalizeSearchText } from '../src/features/search.js';

describe('normalizeSearchText', () => {
  it('normalizes Arabic characters to Persian', () => {
    expect(normalizeSearchText('يك كتاب')).toBe('یک کتاب');
    expect(normalizeSearchText('علیي')).toBe('علیی');
  });

  it('normalizes Arabic kaf and teh marbuta', () => {
    expect(normalizeSearchText('ديكور')).toBe('دیکور');
    expect(normalizeSearchText('نكتة')).toBe('نکته');
  });

  it('lowercases English text and trims extra whitespace', () => {
    expect(normalizeSearchText('  Git Rebase  ')).toBe('git rebase');
    expect(normalizeSearchText('React   Hooks')).toBe('react hooks');
  });
});
