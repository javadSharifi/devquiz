/* ============================================================
 * DevQuiz — platform/web-adapter.ts
 * Browser-only (GitHub Pages) implementation of PlatformAdapter.
 * Persists via localStorage with a JSON envelope. Alarms, action
 * badges, and tab creation are no-ops in the web build — the
 * popup itself runs in a real tab, so there is no badge to set
 * and no separate fullscreen to open.
 * ============================================================ */

import type {
  ActionAdapter,
  AlarmsAdapter,
  PlatformAdapter,
  RuntimeAdapter,
  StorageAdapter,
  TabsAdapter,
} from './types.js';

const PREFIX = 'devquiz.web.';

function key(name: string): string {
  return `${PREFIX}${name}`;
}

function localStorageArea(areaName: string): StorageAdapter {
  return {
    async get<T>(k: string, fallback: T): Promise<T> {
      try {
        const raw = window.localStorage.getItem(key(`${areaName}.${k}`));
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    async set(k: string, value: unknown): Promise<void> {
      try {
        window.localStorage.setItem(key(`${areaName}.${k}`), JSON.stringify(value));
      } catch (e) {
        if (e instanceof Error && /quota/i.test(e.message)) {
          throw new Error('فضای ذخیره‌سازی مرورگر پر شده است.');
        }
        throw e;
      }
    },
    async remove(k: string): Promise<void> {
      window.localStorage.removeItem(key(`${areaName}.${k}`));
    },
  };
}

const noopAlarms: AlarmsAdapter = {
  async create() {},
  async get() {
    return undefined;
  },
  async clear() {
    return true;
  },
  onAlarm() {},
};

const webRuntime: RuntimeAdapter = {
  getURL(path) {
    return path;
  },
  onInstalled() {},
  onStartup() {},
};

const noopAction: ActionAdapter = {
  async setBadgeText() {},
  async setBadgeBackgroundColor() {},
};

const webTabs: TabsAdapter = {
  async create(details) {
    window.open(details.url, '_blank', 'noopener,noreferrer');
    return undefined;
  },
};

export const webAdapter: PlatformAdapter = {
  name: 'web',
  isExtension: false,
  storage: { local: localStorageArea('local'), sync: localStorageArea('sync') },
  alarms: noopAlarms,
  runtime: webRuntime,
  action: noopAction,
  tabs: webTabs,
};
