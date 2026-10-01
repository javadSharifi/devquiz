/* ============================================================
 * DevQuiz — services/data/sync-service.ts
 * Bidirectional offline-first Cloudflare D1 Synchronization.
 * Resolves conflicts using timestamp-based Last-Write-Wins (LWW).
 * ============================================================ */

import { store } from '../../state.js';
import type { Gamification, QuestionState, UserQuestionState } from '../../types.js';
import { isQuestionState } from '../../types.js';
import {
  pullCloudData,
  pushCloudData,
  saveLastSyncedAt,
} from '../api/auth-api.js';
import { setLocal } from '../storage/chrome-storage.js';
import { saveGamification } from './gamification.js';

let pushDebounceTimer: ReturnType<typeof setTimeout> | undefined;

export async function performFullSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
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

    if (hasLocalChanges || gamificationChanged) {
      store.dispatch({ type: 'DATA_CHANGED' });
    }

    // 5. Push full merged state back to cloud
    const pushResult = await pushCloudData(token, {
      userStates: mergedStates,
      gamification: mergedGamification,
    });

    const now = Date.now();
    await saveLastSyncedAt(now);
    store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false, lastSyncedAt: now });

    return { success: true, syncedCount: pushResult.syncedCount };
  } catch (err) {
    store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false });
    const msg = err instanceof Error ? err.message : 'خطا در همگام‌سازی ابری.';
    return { success: false, syncedCount: 0, error: msg };
  }
}

export function triggerDebouncedCloudSync(): void {
  const token = store.getState().authToken;
  if (!token) return;

  if (pushDebounceTimer !== undefined) {
    clearTimeout(pushDebounceTimer);
  }

  pushDebounceTimer = setTimeout(() => {
    const s = store.getState();
    if (!s.authToken) return;
    void pushCloudData(s.authToken, {
      userStates: s.userStates,
      gamification: s.gamification,
    })
      .then(async () => {
        const now = Date.now();
        await saveLastSyncedAt(now);
        store.dispatch({ type: 'SET_SYNC_STATUS', isSyncing: false, lastSyncedAt: now });
      })
      .catch(() => {
        // Silent failure in background auto-sync; manual sync will retry
      });
  }, 4000);
}
