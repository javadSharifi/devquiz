/* ============================================================
 * DevQuiz — platform/firefox-adapter.ts
 * Firefox WebExtension (MV3) implementation of PlatformAdapter.
 * Wraps the global `browser.*` namespace. Firefox's `browser.*`
 * is Promise-based and semantically equivalent to Chrome MV3.
 * No business logic.
 * ============================================================ */

import type {
  ActionAdapter,
  AlarmHandle,
  AlarmsAdapter,
  PlatformAdapter,
  RuntimeAdapter,
  StorageAdapter,
  TabsAdapter,
} from './types.js';

const localStorage: StorageAdapter = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const res = await browser.storage.local.get(key);
    const val = res[key] as T | undefined;
    return val === undefined ? fallback : val;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

const syncStorage: StorageAdapter = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const res = await browser.storage.sync.get(key);
    const val = res[key] as T | undefined;
    return val === undefined ? fallback : val;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.sync.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.sync.remove(key);
  },
};

const alarms: AlarmsAdapter = {
  async create(name, info) {
    await browser.alarms.create(name, info);
  },
  async get(name) {
    const a = await browser.alarms.get(name);
    if (!a) return undefined;
    const handle: AlarmHandle = { name: a.name, scheduledTime: a.scheduledTime };
    if (a.periodInMinutes !== undefined) handle.periodInMinutes = a.periodInMinutes;
    return handle;
  },
  async clear(name) {
    return browser.alarms.clear(name);
  },
  onAlarm(cb) {
    browser.alarms.onAlarm.addListener((alarm) => {
      const handle: AlarmHandle = { name: alarm.name, scheduledTime: alarm.scheduledTime };
      if (alarm.periodInMinutes !== undefined) handle.periodInMinutes = alarm.periodInMinutes;
      cb(handle);
    });
  },
};

const runtime: RuntimeAdapter = {
  getURL(path) {
    return browser.runtime.getURL(path);
  },
  onInstalled(cb) {
    browser.runtime.onInstalled.addListener((details) => {
      const reason = (details.reason ?? 'install') as Parameters<typeof cb>[0]['reason'];
      cb({ reason, ...(details.previousVersion !== undefined ? { previousVersion: details.previousVersion } : {}) });
    });
  },
  onStartup(cb) {
    browser.runtime.onStartup.addListener(cb);
  },
};

const action: ActionAdapter = {
  async setBadgeText(details) {
    await browser.action.setBadgeText(details);
  },
  async setBadgeBackgroundColor(details) {
    await browser.action.setBadgeBackgroundColor(details);
  },
};

const tabs: TabsAdapter = {
  async create(details) {
    return browser.tabs.create(details);
  },
};

export const firefoxAdapter: PlatformAdapter = {
  name: 'firefox',
  isExtension: true,
  storage: { local: localStorage, sync: syncStorage },
  alarms,
  runtime,
  action,
  tabs,
};
