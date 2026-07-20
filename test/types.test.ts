import { describe, it, expect } from 'vitest';
import {
  compareVersions,
  faNum,
  faDigits,
  localDateString,
  stateKey,
  isQuestionLevel,
  isTheme,
  isQuestionState,
  isQuestion,
  isCategory,
  isTopic,
  isTopicCatalogItem,
  isTopicCatalog,
  isCustomQuestion,
  isCustomQuestionArray,
} from '../src/types.js';

describe('compareVersions', () => {
  it('identical versions return 0', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2', '2')).toBe(0);
    expect(compareVersions('0.0.1', '0.0.1')).toBe(0);
  });

  it('newer version returns > 0', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
  });

  it('older version returns < 0', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
  });

  it('handles different length parts', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0', '1.0.1')).toBeLessThan(0);
  });

  it('handles non-numeric segments gracefully', () => {
    expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1-alpha', '1.0.0')).toBeGreaterThan(0);
  });

  it('handles single-part versions', () => {
    expect(compareVersions('2', '1')).toBeGreaterThan(0);
    expect(compareVersions('1', '2')).toBeLessThan(0);
    expect(compareVersions('1', '1')).toBe(0);
  });

  it('handles empty string parts', () => {
    expect(compareVersions('', '')).toBe(0);
    // '1..0' and '1.0.0' both parse to [1,0,0] → equal
    expect(compareVersions('1..0', '1.0.0')).toBe(0);
  });

  it('handles large numbers', () => {
    expect(compareVersions('999.999.999', '999.999.998')).toBeGreaterThan(0);
  });
});

describe('faNum', () => {
  it('converts numbers to Persian digits', () => {
    expect(faNum(0)).toBe('۰');
    expect(faNum(1)).toBe('۱');
    expect(faNum(123)).toBe('۱۲۳');
  });

  it('handles large numbers with locale grouping', () => {
    const result = faNum(1000000);
    expect(result).toContain('۱');
    expect(result).toContain('۰');
    expect(result.length).toBeGreaterThanOrEqual(7);
  });

  it('handles negative numbers', () => {
    const result = faNum(-5);
    expect(result).toContain('۵');
    expect(result).toContain('−');
  });
});

describe('faDigits', () => {
  it('converts ASCII digits in a string', () => {
    expect(faDigits('1.2.0')).toBe('۱.۲.۰');
    expect(faDigits('v1.0')).toBe('v۱.۰');
  });

  it('handles empty string', () => {
    expect(faDigits('')).toBe('');
  });

  it('ignores non-digit characters', () => {
    expect(faDigits('abc')).toBe('abc');
    expect(faDigits('version 3.14')).toBe('version ۳.۱۴');
  });
});

describe('localDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 20);
    expect(localDateString(d)).toBe('2026-07-20');
  });

  it('pads month and day', () => {
    const d = new Date(2026, 0, 5);
    expect(localDateString(d)).toBe('2026-01-05');
  });

  it('handles last day of year', () => {
    const d = new Date(2026, 11, 31);
    expect(localDateString(d)).toBe('2026-12-31');
  });
});

describe('stateKey', () => {
  it('returns composite key', () => {
    expect(stateKey('js', 'q1')).toBe('js:q1');
    expect(stateKey('ts', 'question_42')).toBe('ts:question_42');
  });

  it('handles empty strings', () => {
    expect(stateKey('', '')).toBe(':');
  });
});

describe('isQuestionLevel', () => {
  it('accepts valid levels', () => {
    expect(isQuestionLevel('junior')).toBe(true);
    expect(isQuestionLevel('mid')).toBe(true);
    expect(isQuestionLevel('senior')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isQuestionLevel('')).toBe(false);
    expect(isQuestionLevel('expert')).toBe(false);
    expect(isQuestionLevel(null)).toBe(false);
    expect(isQuestionLevel(undefined)).toBe(false);
    expect(isQuestionLevel(0)).toBe(false);
  });
});

describe('isTheme', () => {
  it('accepts dark and light', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isTheme('blue')).toBe(false);
    expect(isTheme('')).toBe(false);
  });
});

describe('isQuestionState', () => {
  it('accepts all valid states', () => {
    expect(isQuestionState('unseen')).toBe(true);
    expect(isQuestionState('know')).toBe(true);
    expect(isQuestionState('want_to_learn')).toBe(true);
    expect(isQuestionState('skip')).toBe(true);
  });

  it('rejects invalid states', () => {
    expect(isQuestionState('maybe')).toBe(false);
    expect(isQuestionState('')).toBe(false);
  });
});

describe('isQuestion', () => {
  it('accepts valid question object', () => {
    expect(isQuestion({ id: 'q1', question: '?', answer: '!' })).toBe(true);
  });

  it('accepts question with isCustom', () => {
    expect(isQuestion({ id: 'q1', question: '?', answer: '!', isCustom: true })).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(isQuestion({})).toBe(false);
    expect(isQuestion({ id: 'q1', question: '?' })).toBe(false);
    expect(isQuestion({ id: 'q1', answer: '!' })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isQuestion(null)).toBe(false);
    expect(isQuestion('string')).toBe(false);
    expect(isQuestion(42)).toBe(false);
  });

  it('rejects empty id', () => {
    expect(isQuestion({ id: '', question: '?', answer: '!' })).toBe(false);
  });
});

describe('isCategory', () => {
  const validCat = {
    id: 'cat1',
    title: 'Variables',
    level: 'junior',
    icon: '📦',
    questions: [{ id: 'q1', question: '?', answer: '!' }],
  };

  it('accepts valid category', () => {
    expect(isCategory(validCat)).toBe(true);
  });

  it('accepts empty title (title type is string, no length check)', () => {
    expect(isCategory({ ...validCat, title: '' })).toBe(true);
  });

  it('rejects invalid level', () => {
    expect(isCategory({ ...validCat, level: 'pro' })).toBe(false);
  });

  it('rejects non-array questions', () => {
    expect(isCategory({ ...validCat, questions: 'all' })).toBe(false);
  });

  it('rejects empty empty questions array', () => {
    expect(isCategory({ ...validCat, questions: [] })).toBe(true);
  });
});

describe('isTopic', () => {
  const validTopic = {
    meta: { version: '1.0', topic: 'js', title: 'JS', lang: 'fa' },
    categories: [],
  };

  it('accepts valid topic', () => {
    expect(isTopic(validTopic)).toBe(true);
  });

  it('rejects missing meta fields', () => {
    expect(isTopic({ meta: {}, categories: [] })).toBe(false);
    expect(isTopic({ meta: { version: '1.0' }, categories: [] })).toBe(false);
  });

  it('rejects non-array categories', () => {
    expect(isTopic({ ...validTopic, categories: null })).toBe(false);
  });
});

describe('isTopicCatalogItem', () => {
  const validItem = {
    id: 'js',
    title: 'JavaScript',
    description: 'JS questions',
    version: '1.0',
    downloadUrl: 'https://gist.githubusercontent.com/user/repo',
  };

  it('accepts valid item', () => {
    expect(isTopicCatalogItem(validItem)).toBe(true);
  });

  it('accepts item with icon', () => {
    expect(isTopicCatalogItem({ ...validItem, icon: '🟨' })).toBe(true);
  });

  it('rejects non-gist downloadUrl', () => {
    expect(isTopicCatalogItem({ ...validItem, downloadUrl: 'https://evil.com' })).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(isTopicCatalogItem({})).toBe(false);
  });
});

describe('isTopicCatalog', () => {
  it('accepts valid catalog', () => {
    const item = {
      id: 'js',
      title: 'JS',
      description: 'desc',
      version: '1',
      downloadUrl: 'https://gist.githubusercontent.com/u/r',
    };
    expect(isTopicCatalog({ topics: [item] })).toBe(true);
  });

  it('rejects non-array topics', () => {
    expect(isTopicCatalog({ topics: 'not-array' })).toBe(false);
  });

  it('accepts empty topics', () => {
    expect(isTopicCatalog({ topics: [] })).toBe(true);
  });
});

describe('isCustomQuestion', () => {
  it('accepts valid custom question', () => {
    const q = { id: 'cq1', question: '?', answer: '!', topicId: 'js', categoryId: 'cat1', isCustom: true };
    expect(isCustomQuestion(q)).toBe(true);
  });

  it('rejects non-custom question', () => {
    const q = { id: 'q1', question: '?', answer: '!', topicId: 'js', categoryId: 'cat1' };
    expect(isCustomQuestion(q)).toBe(false);
  });

  it('rejects missing topicId', () => {
    const q = { id: 'cq1', question: '?', answer: '!', isCustom: true };
    expect(isCustomQuestion(q)).toBe(false);
  });
});

describe('isCustomQuestionArray', () => {
  it('accepts array of custom questions', () => {
    const q = { id: 'cq1', question: '?', answer: '!', topicId: 'js', categoryId: 'cat1', isCustom: true };
    expect(isCustomQuestionArray([q])).toBe(true);
  });

  it('rejects mixed array', () => {
    expect(isCustomQuestionArray([{ id: 'q1', question: '?', answer: '!' }])).toBe(false);
  });

  it('accepts empty array', () => {
    expect(isCustomQuestionArray([])).toBe(true);
  });

  it('rejects non-array', () => {
    expect(isCustomQuestionArray(null)).toBe(false);
  });
});
