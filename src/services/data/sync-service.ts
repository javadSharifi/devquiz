import { store } from '../../state.js';
import type { Gamification, QuestionState, UserQuestionState } from '../../types.js';
import { isQuestionState } from '../../types.js';
import {
  pullCloudData,
  pushCloudData,
  saveLastSyncedAt,
} from '../api/auth-api.js';
import { fetchCatalog } from '../api/topic-api.js';
import { setLocal } from '../storage/chrome-storage.js';
import { setActiveTopicId } from '../storage/flags.js';
import { saveGamification } from './gamification.js';
import { downloadTopic, getDownloadedVersions, getTopics } from './topics.js';
import { getUserStates } from './user-states.js';

/**
 * Downloads any topics that exist in the user's cloud data (states or downloaded list)
 * but are not yet present in the local database.
 */
async function autoDownloadMissingTopics(candidateTopicIds: Set<string>): Promise<number> {
  if (candidateTopicIds.size === 0) return 0;

  const localTopics = await getTopics();
  const missingTopicIds = Array.from(candidateTopicIds).filter((tid) => !localTopics[tid]);
  if (missingTopicIds.length === 0) return 0;

  let catalog = store.getState().catalog;
  if (!catalog || catalog.length === 0) {
    try {
      const catRes = await fetchCatalog();
      catalog = catRes.topics;
      store.dispatch({ type: 'SET_CATALOG', catalog });
    } catch {
      return 0;
    }
  }

  let count = 0;
  for (const tid of missingTopicIds) {
    const item = catalog.find((c) => c.id === tid);
    if (!item) continue;
    try {
      await downloadTopic(item);
      count++;
    } catch (err) {
      console.error(`Auto-download failed for topic «${tid}»:`, err);
    }
  }

  if (count > 0) {
    const [updatedTopics, updatedVersions] = await Promise.all([
      getTopics(),
      getDownloadedVersions(),
    ]);
    store.dispatch({ type: 'REPLACE_TOPICS', topics: updatedTopics });
    store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions: updatedVersions });

    const currentActive = store.getState().activeTopicId;
    const topicKeys = Object.keys(updatedTopics);
    if (!currentActive && topicKeys.length > 0) {
      const firstId = topicKeys[0];
      if (firstId) {
        await setActiveTopicId(firstId);
        store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: firstId });
      }
    }
  }

  return count;
}

export async function performFullSync(): Promise<{
  success: boolean;
  syncedCount: number;
  autoDownloadedCount?: number;
  error?: string;
}> {
  const state = store.getState();
  const token = state.authToken;
  if (!token) {
    return { success: false, syncedCount: 0, error: 'کاربر وارد سیستم نشده است.' };
  }

  store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: true });

  try {
    // 1. Pull data from Cloudflare D1
    const cloud = await pullCloudData(token);

    // 2. Merge user states (LWW)
    const localStates = { ...state.userStates };
    const mergedStates: Record<string, UserQuestionState> = { ...localStates };
    let hasLocalChanges = false;

    for (const [key, cloudVal] of Object.entries(cloud.userStates)) {
      if (!isQuestionState(cloudVal.state)) continue;
      const localVal = localStates[key];

      if (!localVal || (cloudVal.updatedAt && cloudVal.updatedAt > (localVal.updatedAt || 0))) {
        mergedStates[key] = {
          state: cloudVal.state as QuestionState,
          updatedAt: cloudVal.updatedAt || Date.now(),
        };
        hasLocalChanges = true;
      }
    }

    // 3. Merge gamification (Max XP and Streak)
    const localGamification = state.gamification;
    const mergedGamification: Gamification = {
      xp: Math.max(localGamification.xp || 0, cloud.gamification?.xp || 0),
      streak: Math.max(localGamification.streak || 0, cloud.gamification?.streak || 0),
      lastActiveDate:
        (localGamification.lastActiveDate > (cloud.gamification?.lastActiveDate || '')
          ? localGamification.lastActiveDate
          : cloud.gamification?.lastActiveDate) || '',
    };

    const gamificationChanged =
      mergedGamification.xp !== localGamification.xp ||
      mergedGamification.streak !== localGamification.streak ||
      mergedGamification.lastActiveDate !== localGamification.lastActiveDate;

    // 4. Update local state and storage if changed
    if (hasLocalChanges) {
      await setLocal('user_states', mergedStates);
      store.dispatch({ type: 'REPLACE_USER_STATES', userStates: mergedStates });
    }

    if (gamificationChanged) {
      await saveGamification(mergedGamification);
      store.dispatch({ type: 'SET_GAMIFICATION', gamification: mergedGamification });
    }

    // 4b. Auto-download missing topics from cloud user states or downloaded topics list
    const candidateTopicIds = new Set<string>();
    for (const key of Object.keys(cloud.userStates)) {
      const sep = key.indexOf(':');
      if (sep > 0) candidateTopicIds.add(key.substring(0, sep));
    }
    if (cloud.downloadedTopics) {
      for (const tid of cloud.downloadedTopics) candidateTopicIds.add(tid);
    }
    const autoDownloadedCount = await autoDownloadMissingTopics(candidateTopicIds);

    if (autoDownloadedCount > 0) {
      const finalStates = await getUserStates();
      store.dispatch({ type: 'REPLACE_USER_STATES', userStates: finalStates });
    }

    if (hasLocalChanges || gamificationChanged || autoDownloadedCount > 0) {
      store.dispatch({ type: 'DATA_CHANGED' });
    }

    // 5. Push full merged state back to cloud
    const allLocalTopics = await getTopics();
    const pushResult = await pushCloudData(token, {
      userStates: mergedStates,
      gamification: mergedGamification,
      downloadedTopics: Object.keys(allLocalTopics),
    });

    const now = Date.now();
    await saveLastSyncedAt(now);
    store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false, lastSyncedAt: now });

    return {
      success: true,
      syncedCount: pushResult.syncedCount,
      autoDownloadedCount,
    };
  } catch (err) {
    store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false });
    const msg = err instanceof Error ? err.message : 'خطا در همگام‌سازی ابری.';
    return { success: false, syncedCount: 0, error: msg };
  }
}

export const BATCH_SIZE_THRESHOLD = 2;
export const BATCH_TIMEOUT_MS = 60_000;

let pushDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let pendingQuestionCount = 0;

async function executeSyncPush(): Promise<void> {
  if (pushDebounceTimer !== undefined) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = undefined;
  }
  pendingQuestionCount = 0;

  const s = store.getState();
  if (!s.authToken) return;

  try {
    const pushResult = await pushCloudData(s.authToken, {
      userStates: s.userStates,
      gamification: s.gamification,
      downloadedTopics: Object.keys(s.topics),
    });
    if (pushResult && pushResult.success) {
      const now = Date.now();
      await saveLastSyncedAt(now);
      store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false, lastSyncedAt: now });
    }
  } catch {
    // Silent failure in background auto-sync; manual sync will retry
  }
}

/**
 * Immediately flushes any queued unsynced changes to the cloud.
 * Useful when closing the extension or when tab visibility changes.
 */
export function flushPendingSync(): void {
  if (pendingQuestionCount > 0 || pushDebounceTimer !== undefined) {
    void executeSyncPush();
  }
}

/**
 * Triggers cloud sync using a batching strategy:
 * - Immediately syncs if at least 2 questions are answered.
 * - Otherwise waits up to 60 seconds before syncing single answers or changes.
 */
export function triggerDebouncedCloudSync(isQuestionAnswer = false): void {
  const token = store.getState()?.authToken;
  if (!token) return;

  if (isQuestionAnswer) {
    pendingQuestionCount++;
  }

  // اگر به آستانه ۲ سوال رسید، بلافاصله ارسال کن
  if (pendingQuestionCount >= BATCH_SIZE_THRESHOLD) {
    void executeSyncPush();
    return;
  }

  // اگر کمتر از ۲ سوال بود و تایمر هنوز فعال نیست، یک تایمر ۶۰ ثانیه‌ای راه بینداز
  if (pushDebounceTimer === undefined) {
    pushDebounceTimer = setTimeout(() => {
      void executeSyncPush();
    }, BATCH_TIMEOUT_MS);
  }
}

export function _resetSyncQueueForTesting(): void {
  if (pushDebounceTimer !== undefined) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = undefined;
  }
  pendingQuestionCount = 0;
}

