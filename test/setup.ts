/* Global mocks for Node.js tests.
 * The test environment now goes through the platform adapter
 * layer (src/platform/index.ts). The default for the source
 * tree is the web adapter, which reads window.localStorage, so
 * we provide a minimal in-memory shim here. Tests that need
 * the chrome-specific behavior still get the chrome mock below. */
import { vi } from 'vitest';

const memStore = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((k: string) => memStore.get(k) ?? null),
  setItem: vi.fn((k: string, v: string) => { memStore.set(k, v); }),
  removeItem: vi.fn((k: string) => { memStore.delete(k); }),
  clear: vi.fn(() => { memStore.clear(); }),
  key: vi.fn((i: number) => Array.from(memStore.keys())[i] ?? null),
  get length() { return memStore.size; },
};

// @ts-expect-error - window not in Node types
globalThis.window = { localStorage: localStorageMock };
// @ts-expect-error - localStorage not in Node globals
globalThis.localStorage = localStorageMock;

const mockChromeStorage = {
  local: {
    get: vi.fn(() => Promise.resolve({})),
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
  setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
};

const mockAlarms = {
  create: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(null)),
  onAlarm: { addListener: vi.fn() },
};

const mockRuntime = {
  onInstalled: { addListener: vi.fn() },
  onStartup: { addListener: vi.fn() },
  OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update' },
};

// @ts-expect-error - chrome not in Node types
globalThis.chrome = {
  storage: mockChromeStorage,
  action: mockAction,
  alarms: mockAlarms,
  runtime: mockRuntime,
};
