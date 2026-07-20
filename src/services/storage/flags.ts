/* ============================================================
 * DevQuiz — services/storage/flags.ts
 * Lightweight persistence for tiny flags.
 * - chrome.storage.sync : active_topic, onboarding_done
 * - chrome.storage.local : recent_topics, font_size, theme
 * (sync items must stay far below the 8KB/item sync quota)
 * ============================================================ */

import { type FontSize, type Theme, isTheme } from '../../types.js';
import { getLocal, getSync, setLocal, setSync } from './chrome-storage.js';

export function getActiveTopicId(): Promise<string> {
  return getSync<string>('active_topic', '');
}

export function setActiveTopicId(id: string): Promise<void> {
  return setSync('active_topic', id);
}

export function getRecentTopics(): Promise<string[]> {
  return getLocal<string[]>('recent_topics', []);
}

export function saveRecentTopics(ids: string[]): Promise<void> {
  return setLocal('recent_topics', ids);
}

export function getFontSize(): Promise<FontSize> {
  return getLocal<FontSize>('font_size', 'medium');
}

export function setFontSize(size: FontSize): Promise<void> {
  return setLocal('font_size', size);
}

export async function getTheme(): Promise<Theme> {
  const raw = await getLocal<unknown>('theme', 'dark');
  return isTheme(raw) ? raw : 'dark';
}

export function setTheme(theme: Theme): Promise<void> {
  return setLocal('theme', theme);
}

export function getOnboardingDone(): Promise<boolean> {
  return getSync<boolean>('onboarding_done', false);
}

export function setOnboardingDone(v: boolean): Promise<void> {
  return setSync('onboarding_done', v);
}
