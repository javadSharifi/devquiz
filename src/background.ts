/* ============================================================
 * DevQuiz — background.ts (MV3 service worker, module)
 * MV3 workers are ephemeral — NO setInterval/setTimeout for
 * scheduling. chrome.alarms fires every 24h: fetch the catalog,
 * compare versions against downloaded_versions and light up the
 * action badge when updates exist. The popup clears the badge
 * when the user visits Settings.
 * ============================================================ */

import { fetchCatalog, getDownloadedVersions } from './storage.js';
import { compareVersions } from './types.js';

const ALARM_NAME = 'devquiz-catalog-check';

chrome.runtime.onInstalled.addListener((details) => {
  void ensureAlarm();
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // First-run UX: the popup itself hosts the topic picker.
    // No external tab is opened — the user just clicks the extension icon.
  }
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
});

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 5, // first check shortly after install/startup
      periodInMinutes: 60 * 24, // then every 24h
    });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void checkForUpdates();
});

async function checkForUpdates(): Promise<void> {
  try {
    const versions = await getDownloadedVersions();
    const ids = Object.keys(versions);
    if (ids.length === 0) return; // nothing downloaded yet
    const catalog = await fetchCatalog();
    const hasUpdate = catalog.topics.some((item) => {
      const local = versions[item.id];
      return local !== undefined && compareVersions(item.version, local) > 0;
    });
    if (hasUpdate) {
      await chrome.action.setBadgeBackgroundColor({ color: '#7c5cff' });
      await chrome.action.setBadgeText({ text: '🔔' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    // Offline / transient failure — try again on the next alarm.
  }
}
