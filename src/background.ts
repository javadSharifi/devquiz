/* ============================================================
 * DevQuiz — background.ts (MV3 service worker, module)
 * Extension-only: registers alarms + badge updates through the
 * platform adapter so the same source works in Chrome MV3 and
 * Firefox MV3. The web build never imports this file.
 * ============================================================ */

import { fetchCatalog, getDownloadedVersions } from './storage.js';
import { compareVersions } from './types.js';
import type { TopicCatalogItem } from './types.js';
import { platform } from './platform/index.js';

const ALARM_NAME = 'devquiz-catalog-check';
const RETRY_ALARM_NAME = 'devquiz-catalog-retry';

/** Pure: check whether any catalog item is newer than the local version. */
export function detectUpdates(
  versions: Record<string, string>,
  topics: TopicCatalogItem[],
): boolean {
  return topics.some((item) => {
    const local = versions[item.id];
    return local !== undefined && compareVersions(item.version, local) > 0;
  });
}

if (platform.isExtension) {
  platform.runtime.onInstalled((details) => {
    void ensureAlarm();
    if (details.reason === 'install') {
      // First-run UX: the popup itself hosts the topic picker.
      // No external tab is opened — the user just clicks the extension icon.
    }
  });

  platform.runtime.onStartup(() => {
    void ensureAlarm();
  });

  platform.alarms.onAlarm((alarm) => {
    if (alarm.name !== ALARM_NAME && alarm.name !== RETRY_ALARM_NAME) return;
    void checkForUpdates();
  });
}

async function ensureAlarm(): Promise<void> {
  const existing = await platform.alarms.get(ALARM_NAME);
  if (!existing) {
    await platform.alarms.create(ALARM_NAME, {
      delayInMinutes: 5,
      periodInMinutes: 60 * 24,
    });
  }
}

async function checkForUpdates(): Promise<void> {
  try {
    const versions = await getDownloadedVersions();
    const ids = Object.keys(versions);
    if (ids.length === 0) return;
    const catalog = await fetchCatalog();
    const hasUpdate = detectUpdates(versions, catalog.topics);
    if (hasUpdate) {
      await platform.action.setBadgeBackgroundColor({ color: '#7c5cff' });
      await platform.action.setBadgeText({ text: '🔔' });
    } else {
      await platform.action.setBadgeText({ text: '' });
    }
  } catch {
    await platform.alarms.create(RETRY_ALARM_NAME, { delayInMinutes: 30 });
  }
}
