/* ============================================================
 * DevQuiz — services/storage/chrome-storage.ts
 * Thin typed wrapper around chrome.storage.local / chrome.storage.sync
 * plus a single shared Mutex for read-modify-write serialization.
 * ============================================================ */

import { Mutex } from './mutex.js';

const mutex = new Mutex();

export async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const release = await mutex.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const res = await chrome.storage.local.get(key);
  const val = res[key] as T | undefined;
  return val === undefined ? fallback : val;
}

export async function setLocal(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getSync<T>(key: string, fallback: T): Promise<T> {
  const res = await chrome.storage.sync.get(key);
  const val = res[key] as T | undefined;
  return val === undefined ? fallback : val;
}

export async function setSync(key: string, value: unknown): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
}
