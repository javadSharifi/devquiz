/* ============================================================
 * backend/src/sync.ts
 * Cloudflare D1 Sync Service for user states and gamification.
 * Supports offline-first client architecture with conflict resolution.
 * ============================================================ */

export interface CloudCustomQuestion {
  id: string;
  topicId: string;
  categoryId: string;
  question: string;
  answer: string;
  categoryTitle?: string;
  categoryLevel?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface SyncPayload {
  userStates?: Record<string, { state: string; updatedAt: number }>;
  gamification?: {
    streak: number;
    xp: number;
    lastActiveDate: string;
  };
  downloadedTopics?: string[];
  customQuestions?: CloudCustomQuestion[];
}

export async function getUserCloudData(db: D1Database, userId: string): Promise<{
  userStates: Record<string, { state: string; updatedAt: number }>;
  gamification: { streak: number; xp: number; lastActiveDate: string };
  downloadedTopics: string[];
  customQuestions: CloudCustomQuestion[];
}> {
  // 1. Fetch user states
  const statesResult = await db
    .prepare('SELECT topic_id, question_id, state, updated_at FROM user_states WHERE user_id = ?')
    .bind(userId)
    .all<{ topic_id: string; question_id: string; state: string; updated_at: number }>();

  const userStates: Record<string, { state: string; updatedAt: number }> = {};
  const topicSet = new Set<string>();

  if (statesResult.results) {
    for (const row of statesResult.results) {
      userStates[`${row.topic_id}:${row.question_id}`] = {
        state: row.state,
        updatedAt: row.updated_at,
      };
      topicSet.add(row.topic_id);
    }
  }

  // Also query user_topics if available
  try {
    const topicsResult = await db
      .prepare('SELECT topic_id FROM user_topics WHERE user_id = ?')
      .bind(userId)
      .all<{ topic_id: string }>();
    if (topicsResult.results) {
      for (const row of topicsResult.results) {
        topicSet.add(row.topic_id);
      }
    }
  } catch {
    // If user_topics table doesn't exist yet, topicSet still has all played topics
  }

  // 2. Fetch gamification
  const gamificationRow = await db
    .prepare('SELECT streak, xp, last_active_date FROM user_gamification WHERE user_id = ?')
    .bind(userId)
    .first<{ streak: number; xp: number; last_active_date: string }>();

  const gamification = gamificationRow
    ? {
        streak: gamificationRow.streak,
        xp: gamificationRow.xp,
        lastActiveDate: gamificationRow.last_active_date,
      }
    : { streak: 0, xp: 0, lastActiveDate: '' };

  // 3. Fetch custom questions
  const customQuestions: CloudCustomQuestion[] = [];
  try {
    const qResult = await db
      .prepare(
        'SELECT id, topic_id, category_id, question, answer, category_title, category_level, created_at, updated_at FROM user_questions WHERE user_id = ? ORDER BY created_at ASC',
      )
      .bind(userId)
      .all<{
        id: string;
        topic_id: string;
        category_id: string;
        question: string;
        answer: string;
        category_title: string | null;
        category_level: string | null;
        created_at: number;
        updated_at: number;
      }>();

    if (qResult.results) {
      for (const r of qResult.results) {
        customQuestions.push({
          id: r.id,
          topicId: r.topic_id,
          categoryId: r.category_id,
          question: r.question,
          answer: r.answer,
          categoryTitle: r.category_title ?? undefined,
          categoryLevel: r.category_level ?? undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }
    }
  } catch {
    // If user_questions table doesn't exist yet, safe fallback
  }

  return { userStates, gamification, downloadedTopics: Array.from(topicSet), customQuestions };
}

export async function saveUserCloudData(
  db: D1Database,
  userId: string,
  payload: SyncPayload,
): Promise<{ success: boolean; syncedCount: number }> {
  let syncedCount = 0;

  // 1. Upsert user states in a batch
  if (payload.userStates) {
    const entries = Object.entries(payload.userStates);
    if (entries.length > 0) {
      // Chunk batches by 50 to stay well under D1 limits
      const chunkSize = 50;
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        const statements: D1PreparedStatement[] = [];

        for (const [key, val] of chunk) {
          const sep = key.indexOf(':');
          if (sep <= 0) continue;
          const topicId = key.substring(0, sep);
          const questionId = key.substring(sep + 1);

          statements.push(
            db
              .prepare(
                `INSERT INTO user_states (user_id, topic_id, question_id, state, updated_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, topic_id, question_id) DO UPDATE SET
                   state = excluded.state,
                   updated_at = excluded.updated_at
                 WHERE excluded.updated_at >= user_states.updated_at`,
              )
              .bind(userId, topicId, questionId, val.state, val.updatedAt),
          );
        }

        if (statements.length > 0) {
          await db.batch(statements);
          syncedCount += statements.length;
        }
      }
    }
  }

  // 2. Upsert gamification
  if (payload.gamification) {
    const g = payload.gamification;
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO user_gamification (user_id, streak, xp, last_active_date, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           streak = MAX(user_gamification.streak, excluded.streak),
           xp = MAX(user_gamification.xp, excluded.xp),
           last_active_date = CASE WHEN excluded.last_active_date != '' THEN excluded.last_active_date ELSE user_gamification.last_active_date END,
           updated_at = excluded.updated_at`,
      )
      .bind(userId, g.streak, g.xp, g.lastActiveDate, now)
      .run();
  }

  // 3. Upsert downloaded topics
  if (payload.downloadedTopics && payload.downloadedTopics.length > 0) {
    try {
      const now = Date.now();
      const topicStatements = payload.downloadedTopics.map((topicId) =>
        db
          .prepare(
            `INSERT INTO user_topics (user_id, topic_id, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, topic_id) DO UPDATE SET updated_at = excluded.updated_at`,
          )
          .bind(userId, topicId, now),
      );
      await db.batch(topicStatements);
    } catch {
      // Table might not exist yet; safe fallback
    }
  }

  // 4. Upsert custom questions
  if (payload.customQuestions && payload.customQuestions.length > 0) {
    try {
      const now = Date.now();
      const chunkSize = 50;
      for (let i = 0; i < payload.customQuestions.length; i += chunkSize) {
        const chunk = payload.customQuestions.slice(i, i + chunkSize);
        const statements = chunk.map((q) =>
          db
            .prepare(
              `INSERT INTO user_questions (id, user_id, topic_id, category_id, question, answer, category_title, category_level, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, id) DO UPDATE SET
                 topic_id = excluded.topic_id,
                 category_id = excluded.category_id,
                 question = excluded.question,
                 answer = excluded.answer,
                 category_title = excluded.category_title,
                 category_level = excluded.category_level,
                 updated_at = excluded.updated_at
               WHERE excluded.updated_at >= user_questions.updated_at`,
            )
            .bind(
              q.id,
              userId,
              q.topicId,
              q.categoryId,
              q.question,
              q.answer,
              q.categoryTitle || null,
              q.categoryLevel || null,
              q.createdAt || now,
              q.updatedAt || now,
            ),
        );
        if (statements.length > 0) {
          await db.batch(statements);
        }
      }
    } catch (e) {
      console.error('Failed to sync custom questions:', e);
    }
  }

  return { success: true, syncedCount };
}

export async function saveSingleCustomQuestion(
  db: D1Database,
  userId: string,
  q: CloudCustomQuestion,
): Promise<CloudCustomQuestion> {
  const now = Date.now();
  const createdAt = q.createdAt || now;
  const updatedAt = q.updatedAt || now;

  await db
    .prepare(
      `INSERT INTO user_questions (id, user_id, topic_id, category_id, question, answer, category_title, category_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         topic_id = excluded.topic_id,
         category_id = excluded.category_id,
         question = excluded.question,
         answer = excluded.answer,
         category_title = excluded.category_title,
         category_level = excluded.category_level,
         updated_at = excluded.updated_at`,
    )
    .bind(
      q.id,
      userId,
      q.topicId,
      q.categoryId,
      q.question,
      q.answer,
      q.categoryTitle || null,
      q.categoryLevel || null,
      createdAt,
      updatedAt,
    )
    .run();

  return {
    ...q,
    createdAt,
    updatedAt,
  };
}

export async function getUserCustomQuestions(
  db: D1Database,
  userId: string,
): Promise<CloudCustomQuestion[]> {
  const result = await db
    .prepare(
      'SELECT id, topic_id, category_id, question, answer, category_title, category_level, created_at, updated_at FROM user_questions WHERE user_id = ? ORDER BY created_at ASC',
    )
    .bind(userId)
    .all<{
      id: string;
      topic_id: string;
      category_id: string;
      question: string;
      answer: string;
      category_title: string | null;
      category_level: string | null;
      created_at: number;
      updated_at: number;
    }>();

  if (!result.results) return [];
  return result.results.map((r) => ({
    id: r.id,
    topicId: r.topic_id,
    categoryId: r.category_id,
    question: r.question,
    answer: r.answer,
    categoryTitle: r.category_title ?? undefined,
    categoryLevel: r.category_level ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

