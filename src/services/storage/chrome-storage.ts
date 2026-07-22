/* ============================================================
 * DevQuiz — services/storage/chrome-storage.ts
 * Thin typed wrapper around the platform storage adapters
 * (chrome.storage.* / browser.storage.* / localStorage) plus
 * a single shared Mutex for read-modify-write serialization.
 * The mutex guards in-memory read-modify-write sequences; the
 * underlying storage call is delegated to the active platform
 * adapter so the same code runs in Chrome, Firefox, and web.
 * ============================================================ */

import { Mutex } from './mutex.js';
import { platform } from '../../platform/index.js';

const mutex = new Mutex();

export async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const release = await mutex.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export function getLocal<T>(key: string, fallback: T): Promise<T> {
  return platform.storage.local.get<T>(key, fallback);
}

export function setLocal(key: string, value: unknown): Promise<void> {
  return platform.storage.local.set(key, value);
}

export function removeLocal(key: string): Promise<void> {
  return platform.storage.local.remove(key);
}

export function getSync<T>(key: string, fallback: T): Promise<T> {
  return platform.storage.sync.get<T>(key, fallback);
}

export function setSync(key: string, value: unknown): Promise<void> {
  return platform.storage.sync.set(key, value);
}
