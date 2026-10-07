import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../src/state.js';
import { performFullSync } from '../src/services/data/sync-service.js';
import * as authApi from '../src/services/api/auth-api.js';
import { getCustomQuestions, addCustomQuestion } from '../src/services/data/custom-questions.js';
import { setLocal } from '../src/services/storage/chrome-storage.js';
import type { CustomQuestion } from '../src/types.js';

describe('Custom questions client-side storage, sync and server integration', () => {
  const sampleLocalQ: CustomQuestion = {
    id: 'local_q1',
    question: 'سوال محلی تستی چیست؟',
    answer: 'یک پاسخ کامل و تشریحی',
    topicId: 'javascript',
    categoryId: 'basics',
    isCustom: true,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sampleCloudQ: CustomQuestion = {
    id: 'cloud_q1',
    question: 'سوال ابری از دستگاه دیگر چیست؟',
    answer: 'پاسخ ذخیره‌شده روی سرور ابری',
    topicId: 'react',
    categoryId: 'state',
    categoryTitle: 'مدیریت وضعیت',
    categoryLevel: 'mid',
    isCustom: true,
    createdAt: 2000,
    updatedAt: 2000,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    await setLocal('custom_questions', []);
    await setLocal('user_states', {});
    await setLocal('topics', {});

    store.dispatch({
      type: 'SET_AUTH',
      user: { id: 'user-456', email: 'user@example.com', name: 'مهدی' },
      token: 'valid-jwt-token',
    });
    store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: [] });
    store.dispatch({ type: 'REPLACE_USER_STATES', userStates: {} });
  });

  it('addCustomQuestion stores question and is idempotent on identical ID', async () => {
    await addCustomQuestion(sampleLocalQ);
    let all = await getCustomQuestions();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('local_q1');

    // Calling again updates without duplicating
    const updated = { ...sampleLocalQ, answer: 'پاسخ ویرایش‌شده' };
    await addCustomQuestion(updated);
    all = await getCustomQuestions();
    expect(all).toHaveLength(1);
    expect(all[0].answer).toBe('پاسخ ویرایش‌شده');
  });

  it('performFullSync merges cloud custom questions and pushes local ones', async () => {
    // Local has sampleLocalQ
    await addCustomQuestion(sampleLocalQ);
    store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: [sampleLocalQ] });

    // Cloud has sampleCloudQ
    vi.spyOn(authApi, 'pullCloudData').mockResolvedValue({
      userStates: {},
      gamification: { streak: 0, xp: 0, lastActiveDate: '' },
      downloadedTopics: [],
      customQuestions: [sampleCloudQ],
    });

    const pushSpy = vi.spyOn(authApi, 'pushCloudData').mockResolvedValue({
      success: true,
      syncedCount: 1,
    });

    const res = await performFullSync();
    expect(res.success).toBe(true);

    // After sync: local state should contain both questions!
    const updatedCustom = await getCustomQuestions();
    expect(updatedCustom).toHaveLength(2);
    const ids = updatedCustom.map((q) => q.id);
    expect(ids).toContain('local_q1');
    expect(ids).toContain('cloud_q1');

    // Store state also updated
    expect(store.getState().customQuestions).toHaveLength(2);

    // Pushed payload contains both questions
    expect(pushSpy).toHaveBeenCalledWith(
      'valid-jwt-token',
      expect.objectContaining({
        customQuestions: expect.arrayContaining([
          expect.objectContaining({ id: 'local_q1' }),
          expect.objectContaining({ id: 'cloud_q1' }),
        ]),
      }),
    );
  });

  it('addCustomQuestionApi successfully pushes to server endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, question: sampleLocalQ }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await authApi.addCustomQuestionApi('valid-jwt-token', sampleLocalQ);
    expect(result.success).toBe(true);
    expect(result.question.id).toBe(sampleLocalQ.id);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/user/questions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-jwt-token',
        }),
        body: JSON.stringify(sampleLocalQ),
      }),
    );
  });
});
