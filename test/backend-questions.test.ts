import { describe, it, expect } from 'vitest';
import worker, { type Env } from '../backend/src/index.js';
import { signJwt } from '../backend/src/auth.js';

describe('Backend: User custom questions endpoints and sync', () => {
  const secret = 'test-secret';

  function createMockDb() {
    const memoryTable: Record<string, any[]> = {
      users: [],
      user_states: [],
      user_gamification: [],
      user_topics: [],
      user_questions: [],
    };

    const mockDb = {
      prepare: (sql: string) => {
        let boundArgs: any[] = [];
        return {
          bind: (...args: any[]) => {
            boundArgs = args;
            return {
              first: async <T>() => {
                if (sql.includes('SELECT id, email, password_hash')) {
                  const email = boundArgs[0];
                  return (memoryTable.users.find((u) => u.email === email) || null) as T;
                }
                if (sql.includes('SELECT streak, xp, last_active_date')) {
                  const uid = boundArgs[0];
                  return (memoryTable.user_gamification.find((g) => g.user_id === uid) || null) as T;
                }
                return null as T;
              },
              all: async <T>() => {
                if (sql.includes('FROM user_states')) {
                  const uid = boundArgs[0];
                  const results = memoryTable.user_states.filter((s) => s.user_id === uid);
                  return { results } as { results: T[] };
                }
                if (sql.includes('FROM user_questions')) {
                  const uid = boundArgs[0];
                  const results = memoryTable.user_questions.filter((q) => q.user_id === uid);
                  return { results } as { results: T[] };
                }
                return { results: [] } as { results: T[] };
              },
              run: async () => {
                if (sql.includes('INSERT INTO user_questions')) {
                  const [id, user_id, topic_id, category_id, question, answer, category_title, category_level, created_at, updated_at] = boundArgs;
                  const idx = memoryTable.user_questions.findIndex((q) => q.user_id === user_id && q.id === id);
                  const record = {
                    id,
                    user_id,
                    topic_id,
                    category_id,
                    question,
                    answer,
                    category_title,
                    category_level,
                    created_at,
                    updated_at,
                  };
                  if (idx >= 0) {
                    memoryTable.user_questions[idx] = record;
                  } else {
                    memoryTable.user_questions.push(record);
                  }
                  return { success: true };
                }
                return { success: true };
              },
            };
          },
        };
      },
      batch: async (statements: any[]) => {
        for (const st of statements) {
          if (st.run) await st.run();
        }
        return [];
      },
      _table: memoryTable,
    };

    return mockDb as unknown as D1Database & { _table: typeof memoryTable };
  }

  it('rejects POST /api/user/questions when unauthenticated', async () => {
    const db = createMockDb();
    const env: Env = { DB: db, JWT_SECRET: secret };

    const req = new Request('https://api.devquiz.ir/api/user/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'چگونه ایونت لوپ در جاوااسکریپت کار می‌کند؟',
        answer: 'مبتنی بر Call Stack و Task Queue است.',
        topicId: 'javascript',
        categoryId: 'general',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toContain('ورود به سیستم');
  });

  it('validates question and answer length in POST /api/user/questions', async () => {
    const db = createMockDb();
    const env: Env = { DB: db, JWT_SECRET: secret };
    const token = await signJwt({ userId: 'u1', email: 'test@example.com', name: 'کاربر' }, secret);

    // Too short question
    const req1 = new Request('https://api.devquiz.ir/api/user/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: 'کم',
        answer: 'پاسخ کافی و خوب',
        topicId: 'javascript',
        categoryId: 'general',
      }),
    });
    const res1 = await worker.fetch(req1, env);
    expect(res1.status).toBe(400);

    // Too short answer
    const req2 = new Request('https://api.devquiz.ir/api/user/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: 'یک سوال طولانی و معتبر',
        answer: 'نه',
        topicId: 'javascript',
        categoryId: 'general',
      }),
    });
    const res2 = await worker.fetch(req2, env);
    expect(res2.status).toBe(400);
  });

  it('creates and returns custom question in POST /api/user/questions', async () => {
    const db = createMockDb();
    const env: Env = { DB: db, JWT_SECRET: secret };
    const token = await signJwt({ userId: 'u1', email: 'test@example.com', name: 'کاربر' }, secret);

    const qPayload = {
      id: 'custom_101',
      question: 'چگونه هوک useEffect در ری‌اکت کار می‌کند؟',
      answer: 'برای مدیریت ساید‌افکت‌ها بعد از رندر استفاده می‌شود.',
      topicId: 'react',
      categoryId: 'hooks',
      categoryTitle: 'هوک‌ها',
      categoryLevel: 'junior',
    };

    const req = new Request('https://api.devquiz.ir/api/user/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(qPayload),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.question.id).toBe('custom_101');
    expect(data.question.topicId).toBe('react');

    // Verify stored in DB
    const memory = (db as any)._table.user_questions;
    expect(memory).toHaveLength(1);
    expect(memory[0].user_id).toBe('u1');
    expect(memory[0].id).toBe('custom_101');
    expect(memory[0].question).toBe(qPayload.question);
  });

  it('retrieves user custom questions in GET /api/user/questions', async () => {
    const db = createMockDb();
    const env: Env = { DB: db, JWT_SECRET: secret };
    const token = await signJwt({ userId: 'u1', email: 'test@example.com', name: 'کاربر' }, secret);

    // Insert mock questions
    (db as any)._table.user_questions.push(
      {
        id: 'cq_1',
        user_id: 'u1',
        topic_id: 'react',
        category_id: 'hooks',
        question: 'سوال ۱',
        answer: 'جواب ۱',
        category_title: null,
        category_level: null,
        created_at: 1000,
        updated_at: 1000,
      },
      {
        id: 'cq_other_user',
        user_id: 'u2',
        topic_id: 'react',
        category_id: 'hooks',
        question: 'سوال کاربر دیگر',
        answer: 'جواب کاربر دیگر',
        category_title: null,
        category_level: null,
        created_at: 1000,
        updated_at: 1000,
      },
    );

    const req = new Request('https://api.devquiz.ir/api/user/questions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].id).toBe('cq_1');
    expect(data.questions[0].topicId).toBe('react');
  });

  it('GET /api/user/sync includes custom questions in cloud response', async () => {
    const db = createMockDb();
    const env: Env = { DB: db, JWT_SECRET: secret };
    const token = await signJwt({ userId: 'u1', email: 'test@example.com', name: 'کاربر' }, secret);

    (db as any)._table.user_questions.push({
      id: 'sync_q1',
      user_id: 'u1',
      topic_id: 'git',
      category_id: 'branching',
      question: 'rebase چیست؟',
      answer: 'انتقال کامیت‌ها روی یک بیس جدید.',
      category_title: 'شاخه‌ها',
      category_level: 'mid',
      created_at: 500,
      updated_at: 500,
    });

    const req = new Request('https://api.devquiz.ir/api/user/sync', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.customQuestions).toBeDefined();
    expect(data.customQuestions).toHaveLength(1);
    expect(data.customQuestions[0].id).toBe('sync_q1');
    expect(data.customQuestions[0].topicId).toBe('git');
  });
});
