/* global chrome mock for Node.js tests */
import { vi } from 'vitest';

const mockStorage: Record<string, unknown> = {};

const mockChromeStorage = {
  local: {
    get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
      return Promise.resolve({});
    }),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  },
  sync: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  },
};

const mockAction = {
  setBadgeText: vi.fn(() => Promise.resolve()),
};

// @ts-expect-error - chrome not in Node types
globalThis.chrome = {
  storage: mockChromeStorage,
  action: mockAction,
};
