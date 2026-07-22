import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStore = new Map<string, unknown>();

beforeEach(() => {
  localStore.clear();
  // The production code goes through the platform adapter
  // (web-adapter in tests, since src/platform/index.ts is the
  // web default). The web-adapter reads window.localStorage;
  // the global in-memory shim from test/setup.ts is the one
  // actually hit. Clear it so state never leaks across tests.
  globalThis.localStorage.clear();
  // @ts-expect-error - replace chrome stub for this suite only
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          key === undefined ? Object.fromEntries(localStore) : { [key]: localStore.get(key) },
        ),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) localStore.set(k, v);
        }),
        remove: vi.fn(async (key: string) => {
          localStore.delete(key);
        }),
      },
      sync: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
  };
});

import {
  getGamification,
  saveGamification,
  recordAnswer,
  revertXp,
} from '../src/services/data/gamification.js';

describe('gamification', () => {
  it('getGamification returns defaults when nothing stored', async () => {
    const g = await getGamification();
    expect(g).toEqual({ streak: 0, xp: 0, lastActiveDate: '' });
  });

  it('saveGamification round-trips via getGamification', async () => {
    await saveGamification({ streak: 5, xp: 120, lastActiveDate: '2026-01-01' });
    const g = await getGamification();
    expect(g).toEqual({ streak: 5, xp: 120, lastActiveDate: '2026-01-01' });
  });

  it('recordAnswer adds XP and sets streak to 1 on first activity', async () => {
    const g = await recordAnswer(10);
    expect(g.streak).toBe(1);
    expect(g.xp).toBe(10);
    expect(g.lastActiveDate).not.toBe('');
  });

  it('recordAnswer does not double-advance streak within the same day', async () => {
    await recordAnswer(10);
    const g = await recordAnswer(5);
    expect(g.streak).toBe(1);
    expect(g.xp).toBe(15);
  });

  it('revertXp subtracts XP without touching the streak', async () => {
    await recordAnswer(10);
    const g = await revertXp(4);
    expect(g.xp).toBe(6);
    expect(g.streak).toBe(1);
  });

  it('revertXp clamps XP at zero (never goes negative)', async () => {
    await recordAnswer(5);
    const g = await revertXp(999);
    expect(g.xp).toBe(0);
  });

  it('getGamification returns a fresh default each call (no shared-mutation bug)', async () => {
    const a = await getGamification();
    a.streak = 99;
    a.xp = 999;
    const b = await getGamification();
    expect(b).toEqual({ streak: 0, xp: 0, lastActiveDate: '' });
  });
});
