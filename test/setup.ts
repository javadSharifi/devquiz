/* global chrome mock for Node.js tests */
import { vi } from 'vitest';

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
