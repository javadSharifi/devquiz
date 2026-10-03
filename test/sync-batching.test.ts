import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../src/state.js';
import {
  triggerDebouncedCloudSync,
  flushPendingSync,
  BATCH_SIZE_THRESHOLD,
  BATCH_TIMEOUT_MS,
  _resetSyncQueueForTesting,
} from '../src/services/data/sync-service.js';
import * as authApi from '../src/services/api/auth-api.js';

describe('Cloudflare Sync Batching & Queue', () => {
  let pushMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    _resetSyncQueueForTesting();

    // Authenticated user in store
    store.dispatch({
      type: 'SET_AUTH',
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
      token: 'valid-test-token',
    });

    pushMock = vi.spyOn(authApi, 'pushCloudData').mockResolvedValue({
      success: true,
      syncedCount: 1,
    });
  });

  afterEach(() => {
    _resetSyncQueueForTesting();
    vi.useRealTimers();
  });

  it('has expected threshold of 2 questions and 60s timeout', () => {
    expect(BATCH_SIZE_THRESHOLD).toBe(2);
    expect(BATCH_TIMEOUT_MS).toBe(60_000);
  });

  it('does not sync immediately on 1 question answer', () => {
    triggerDebouncedCloudSync(true); // 1st question

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('syncs immediately when 2 questions are answered (50% reduction in requests)', () => {
    triggerDebouncedCloudSync(true); // 1st question
    expect(pushMock).not.toHaveBeenCalled();

    triggerDebouncedCloudSync(true); // 2nd question -> hits threshold = 2
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('syncs single question after 60 seconds if 2nd question never arrives', () => {
    triggerDebouncedCloudSync(true); // 1st question
    expect(pushMock).not.toHaveBeenCalled();

    // 59 seconds pass - still waiting
    vi.advanceTimersByTime(59_000);
    expect(pushMock).not.toHaveBeenCalled();

    // 60 seconds pass - timer fires
    vi.advanceTimersByTime(1_000);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('flushes pending queue immediately when flushPendingSync is called (popup close / tab hide)', () => {
    triggerDebouncedCloudSync(true); // 1 question in queue
    expect(pushMock).not.toHaveBeenCalled();

    // User closes popup or tab is hidden
    flushPendingSync();

    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('does not send sync if user is not logged in', () => {
    store.dispatch({ type: 'SET_AUTH', user: null, token: null });

    triggerDebouncedCloudSync(true);
    triggerDebouncedCloudSync(true);

    expect(pushMock).not.toHaveBeenCalled();
  });
});
