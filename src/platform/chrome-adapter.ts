/* ============================================================
 * DevQuiz — platform/chrome-adapter.ts
 * Chrome MV3 implementation of PlatformAdapter.
 * Wraps the global `chrome.*` namespace. No business logic.
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
    const res = await chrome.storage.local.get(key);
    const val = res[key] as T | undefined;
    return val === undefined ? fallback : val;
  },
  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  },
};

const syncStorage: StorageAdapter = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const res = await chrome.storage.sync.get(key);
    const val = res[key] as T | undefined;
    return val === undefined ? fallback : val;
  },
  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await chrome.storage.sync.remove(key);
  },
};

const alarms: AlarmsAdapter = {
  async create(name, info) {
    await chrome.alarms.create(name, info);
  },
  async get(name) {
    const a = await chrome.alarms.get(name);
    if (!a) return undefined;
    const handle: AlarmHandle = { name: a.name, scheduledTime: a.scheduledTime };
    if (a.periodInMinutes !== undefined) handle.periodInMinutes = a.periodInMinutes;
    return handle;
  },
  async clear(name) {
    return chrome.alarms.clear(name);
  },
  onAlarm(cb) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      const handle: AlarmHandle = { name: alarm.name, scheduledTime: alarm.scheduledTime };
      if (alarm.periodInMinutes !== undefined) handle.periodInMinutes = alarm.periodInMinutes;
      cb(handle);
    });
  },
};

const runtime: RuntimeAdapter = {
  getURL(path) {
    return chrome.runtime.getURL(path);
  },
  onInstalled(cb) {
    chrome.runtime.onInstalled.addListener((details) => {
      cb({ reason: details.reason, ...(details.previousVersion !== undefined ? { previousVersion: details.previousVersion } : {}) });
    });
  },
  onStartup(cb) {
    chrome.runtime.onStartup.addListener(cb);
  },
};

const action: ActionAdapter = {
  async setBadgeText(details) {
    await chrome.action.setBadgeText(details);
  },
  async setBadgeBackgroundColor(details) {
    await chrome.action.setBadgeBackgroundColor(details);
  },
};

const tabs: TabsAdapter = {
  async create(details) {
    return chrome.tabs.create(details);
  },
};

export const chromeAdapter: PlatformAdapter = {
  name: 'chrome',
  isExtension: true,
  storage: { local: localStorage, sync: syncStorage },
  alarms,
  runtime,
  action,
  tabs,
};
