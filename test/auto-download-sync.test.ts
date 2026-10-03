import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../src/state.js';
import { performFullSync } from '../src/services/data/sync-service.js';
import * as authApi from '../src/services/api/auth-api.js';
import * as topicApi from '../src/services/api/topic-api.js';
import { setLocal } from '../src/services/storage/chrome-storage.js';
import type { Topic, TopicCatalog } from '../src/types.js';

describe('Auto-download missing topics during cloud sync', () => {
  const dummyHtmlTopic: Topic = {
    meta: {
      version: '1.0.0',
      topic: 'html',
      title: 'HTML5 & Semantics',
      lang: 'fa',
    },
    categories: [
      {
        id: 'semantics',
        title: 'معماری و تگ‌های معنایی',
        level: 'junior',
        icon: '🌐',
        questions: [
          { id: 'q_html_1', question: 'تگ main چیست؟', answer: 'محتوای اصلی سند' },
          { id: 'q_html_2', question: 'تگ article چیست؟', answer: 'محتوای مستقل و قابل بازنشر' },
        ],
      },
    ],
  };

  const dummyCatalog: TopicCatalog = {
    topics: [
      {
        id: 'html',
        title: 'HTML5 & Semantics',
        description: 'مفاهیم پایه وب',
        version: '1.0.0',
        downloadUrl: 'https://api.devquiz.ir/api/topics/html',
      },
      {
        id: 'css',
        title: 'CSS3',
        description: 'استایل‌دهی',
        version: '1.0.0',
        downloadUrl: 'https://api.devquiz.ir/api/topics/css',
      },
    ],
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Reset local storage
    await setLocal('topics', {});
    await setLocal('downloaded_versions', {});
    await setLocal('user_states', {});

    // Set authenticated store state
    store.dispatch({
      type: 'SET_AUTH',
      user: { id: 'user-123', email: 'test@example.com', name: 'تستر' },
      token: 'jwt-valid-token',
    });
    store.dispatch({ type: 'REPLACE_TOPICS', topics: {} });
    store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions: {} });
    store.dispatch({ type: 'REPLACE_USER_STATES', userStates: {} });
    store.dispatch({ type: 'SET_CATALOG', catalog: dummyCatalog.topics });
    store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: '' });
  });

  it('automatically downloads missing topic when cloud has userStates for it', async () => {
    // Cloud has user states for 'html'
    vi.spyOn(authApi, 'pullCloudData').mockResolvedValue({
      userStates: {
        'html:q_html_1': { state: 'want_to_learn', updatedAt: 1000 },
        'html:q_html_2': { state: 'know', updatedAt: 2000 },
      },
      gamification: { streak: 1, xp: 20, lastActiveDate: '2026-10-03' },
      downloadedTopics: ['html'],
    });

    const pushSpy = vi.spyOn(authApi, 'pushCloudData').mockResolvedValue({
      success: true,
      syncedCount: 2,
    });

    // Mock network fetch for topic json
    vi.spyOn(topicApi, 'fetchValidatedJson').mockResolvedValue(dummyHtmlTopic);

    // Initial state: topics is empty
    expect(store.getState().topics['html']).toBeUndefined();

    // Perform sync
    const res = await performFullSync();

    expect(res.success).toBe(true);
    expect(res.autoDownloadedCount).toBe(1);

    // After sync: html topic is now in state and local storage!
    const updatedState = store.getState();
    expect(updatedState.topics['html']).toBeDefined();
    expect(updatedState.topics['html']?.meta.title).toBe('HTML5 & Semantics');
    expect(updatedState.downloadedVersions['html']).toBe('1.0.0');

    // User states for html were preserved and loaded
    expect(updatedState.userStates['html:q_html_1']?.state).toBe('want_to_learn');
    expect(updatedState.userStates['html:q_html_2']?.state).toBe('know');

    // activeTopicId is automatically set because none was active
    expect(updatedState.activeTopicId).toBe('html');

    // Pushed payload includes downloadedTopics
    expect(pushSpy).toHaveBeenCalledWith(
      'jwt-valid-token',
      expect.objectContaining({
        downloadedTopics: expect.arrayContaining(['html']),
      }),
    );
  });

  it('automatically downloads missing topic from downloadedTopics even without prior answers', async () => {
    // Cloud has downloadedTopics: ['html'], but userStates is empty
    vi.spyOn(authApi, 'pullCloudData').mockResolvedValue({
      userStates: {},
      gamification: { streak: 0, xp: 0, lastActiveDate: '' },
      downloadedTopics: ['html'],
    });

    vi.spyOn(authApi, 'pushCloudData').mockResolvedValue({
      success: true,
      syncedCount: 0,
    });

    vi.spyOn(topicApi, 'fetchValidatedJson').mockResolvedValue(dummyHtmlTopic);

    const res = await performFullSync();

    expect(res.success).toBe(true);
    expect(res.autoDownloadedCount).toBe(1);
    expect(store.getState().topics['html']).toBeDefined();
  });

  it('skips auto-download if topic is already present locally', async () => {
    // Set local topic as already present
    await setLocal('topics', { html: dummyHtmlTopic });
    await setLocal('downloaded_versions', { html: '1.0.0' });
    store.dispatch({ type: 'REPLACE_TOPICS', topics: { html: dummyHtmlTopic } });
    store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions: { html: '1.0.0' } });

    vi.spyOn(authApi, 'pullCloudData').mockResolvedValue({
      userStates: {
        'html:q_html_1': { state: 'know', updatedAt: 1000 },
      },
      gamification: { streak: 1, xp: 10, lastActiveDate: '2026-10-03' },
      downloadedTopics: ['html'],
    });

    const pushSpy = vi.spyOn(authApi, 'pushCloudData').mockResolvedValue({
      success: true,
      syncedCount: 1,
    });

    const fetchJsonSpy = vi.spyOn(topicApi, 'fetchValidatedJson');

    const res = await performFullSync();

    expect(res.success).toBe(true);
    expect(res.autoDownloadedCount).toBe(0);
    expect(fetchJsonSpy).not.toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalled();
  });
});
