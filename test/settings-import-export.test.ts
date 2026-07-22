/* ============================================================
 * test/settings-import-export.test.ts
 * Unit tests for settings/backup.ts pure helpers + IO.
 * Validators, buildBackupPayload, exportCustomQuestions,
 * importBackupFromFile.
 * ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const dispatches: Array<{ type: string; payload?: unknown }> = [];
  const state = {
    customQuestions: [
      { id: 'cq-1', topicId: 'js', categoryId: 'cat-1', level: 'junior', question: 'q', answer: 'a' },
    ],
    userStates: { 'js:q1': { state: 'know', updatedAt: 1 } },
    gamification: { streak: 2, xp: 100, lastActiveDate: '2026-07-20' },
  };
  const importCustomQuestions = vi.fn(async (raw: unknown) => {
    if (Array.isArray(raw)) return raw.length;
    if (raw && typeof raw === 'object') {
      return Object.keys(raw as Record<string, unknown>).length;
    }
    return 0;
  });
  const getCustomQuestions = vi.fn(async () => state.customQuestions);
  const chromeStorageSet = vi.fn(async () => undefined);
  return { dispatches, state, importCustomQuestions, getCustomQuestions, chromeStorageSet };
});

vi.mock('../src/state.js', () => ({
  store: {
    getState: () => hoisted.state,
    dispatch: (a: { type: string; [k: string]: unknown }) => {
      hoisted.dispatches.push({ type: a.type, payload: a });
    },
  },
}));

vi.mock('../src/storage.js', () => ({
  importCustomQuestions: hoisted.importCustomQuestions,
  getCustomQuestions: hoisted.getCustomQuestions,
  setLocal: hoisted.chromeStorageSet,
}));

vi.mock('../src/components/toast.js', () => ({
  toast: vi.fn(),
}));

import {
  buildBackupPayload,
  isValidGamification,
  isValidUserStates,
  importBackupFromFile,
} from '../src/features/settings/backup.js';

describe('isValidUserStates', () => {
  it('accepts empty object', () => {
    expect(isValidUserStates({})).toBe(true);
  });
  it('accepts well-formed entries', () => {
    expect(isValidUserStates({ 'js:q1': { state: 'know', updatedAt: 1 } })).toBe(true);
  });
  it('rejects null', () => {
    expect(isValidUserStates(null)).toBe(false);
  });
  it('rejects non-object', () => {
    expect(isValidUserStates('x')).toBe(false);
    expect(isValidUserStates(42)).toBe(false);
  });
  it('rejects bad state value', () => {
    expect(isValidUserStates({ 'js:q1': { state: 'nope', updatedAt: 1 } })).toBe(false);
  });
  it('rejects missing updatedAt', () => {
    expect(isValidUserStates({ 'js:q1': { state: 'know' } })).toBe(false);
  });
  it('rejects non-object entry', () => {
    expect(isValidUserStates({ 'js:q1': 'bad' })).toBe(false);
  });
});

describe('isValidGamification', () => {
  it('accepts valid shape', () => {
    expect(isValidGamification({ streak: 1, xp: 2, lastActiveDate: '2026-07-20' })).toBe(true);
  });
  it('rejects null', () => {
    expect(isValidGamification(null)).toBe(false);
  });
  it('rejects missing fields', () => {
    expect(isValidGamification({ streak: 1, xp: 2 })).toBe(false);
  });
  it('rejects wrong types', () => {
    expect(isValidGamification({ streak: '1', xp: 2, lastActiveDate: 'x' })).toBe(false);
    expect(isValidGamification({ streak: 1, xp: '2', lastActiveDate: 'x' })).toBe(false);
    expect(isValidGamification({ streak: 1, xp: 2, lastActiveDate: 5 })).toBe(false);
  });
});

describe('buildBackupPayload', () => {
  it('returns { customQuestions, userStates, gamification } from state', () => {
    const p = buildBackupPayload();
    expect(p.customQuestions).toBe(hoisted.state.customQuestions);
    expect(p.userStates).toBe(hoisted.state.userStates);
    expect(p.gamification).toBe(hoisted.state.gamification);
  });
});

describe('importBackupFromFile', () => {
  beforeEach(() => {
    hoisted.dispatches.length = 0;
    hoisted.importCustomQuestions.mockClear();
    hoisted.getCustomQuestions.mockClear();
    hoisted.chromeStorageSet.mockClear();
    (globalThis as any).chrome = {
      storage: { local: { set: hoisted.chromeStorageSet } },
    };
  });
  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  function fakeFileReaderWith(text: string): File {
    (globalThis as any).FileReader = class {
      onload: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      result: string | ArrayBuffer | null = text;
      readAsText(_f: File) {
        queueMicrotask(() => this.onload?.({ target: { result: text } }));
      }
    };
    return { name: 'b.json' } as File;
  }
  function fakeFileReaderError(): File {
    (globalThis as any).FileReader = class {
      onload: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      readAsText(_f: File) {
        queueMicrotask(() => this.onerror?.(new Error('boom')));
      }
    };
    return { name: 'b.json' } as File;
  }

  it('imports array as custom questions', async () => {
    const f = fakeFileReaderWith(JSON.stringify([{ id: 'a' }, { id: 'b' }]));
    await importBackupFromFile(f);
    expect(hoisted.importCustomQuestions).toHaveBeenCalledWith([{ id: 'a' }, { id: 'b' }]);
    const types = hoisted.dispatches.map((d) => d.type);
    expect(types).toContain('REPLACE_CUSTOM_QUESTIONS');
    expect(types).toContain('DATA_CHANGED');
  });

  it('imports object with customQuestions only', async () => {
    const f = fakeFileReaderWith(JSON.stringify({ customQuestions: [{ id: 'a' }] }));
    await importBackupFromFile(f);
    expect(hoisted.importCustomQuestions).toHaveBeenCalled();
    expect(hoisted.chromeStorageSet).not.toHaveBeenCalled();
  });

  it('imports object with userStates (valid)', async () => {
    const f = fakeFileReaderWith(
      JSON.stringify({ userStates: { 'js:q1': { state: 'know', updatedAt: 1 } } }),
    );
    await importBackupFromFile(f);
    expect(hoisted.chromeStorageSet).toHaveBeenCalledWith('user_states', { 'js:q1': { state: 'know', updatedAt: 1 } });
    const types = hoisted.dispatches.map((d) => d.type);
    expect(types).toContain('REPLACE_USER_STATES');
  });

  it('rejects object with invalid userStates', async () => {
    const f = fakeFileReaderWith(JSON.stringify({ userStates: { bad: 'nope' } }));
    await expect(importBackupFromFile(f)).rejects.toThrow(/userStates/);
  });

  it('imports object with gamification (valid)', async () => {
    const f = fakeFileReaderWith(
      JSON.stringify({ gamification: { streak: 1, xp: 5, lastActiveDate: '2026-07-20' } }),
    );
    await importBackupFromFile(f);
    expect(hoisted.chromeStorageSet).toHaveBeenCalledWith('gamification', { streak: 1, xp: 5, lastActiveDate: '2026-07-20' });
    const types = hoisted.dispatches.map((d) => d.type);
    expect(types).toContain('SET_GAMIFICATION');
  });

  it('rejects object with invalid gamification', async () => {
    const f = fakeFileReaderWith(JSON.stringify({ gamification: { streak: 'x' } }));
    await expect(importBackupFromFile(f)).rejects.toThrow(/gamification/);
  });

  it('rejects malformed JSON', async () => {
    const f = fakeFileReaderWith('{not json');
    await expect(importBackupFromFile(f)).rejects.toThrow();
  });

  it('surfaces FileReader errors', async () => {
    const f = fakeFileReaderError();
    await expect(importBackupFromFile(f)).rejects.toThrow(/خواندن فایل/);
  });
});
