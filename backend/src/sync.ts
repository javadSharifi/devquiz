/* ============================================================
 * backend/src/sync.ts
 * Cloudflare D1 Sync Service for user states and gamification.
 * Supports offline-first client architecture with conflict resolution.
 * ============================================================ */

export interface SyncPayload {
  userStates?: Record<string, { state: string; updatedAt: number }>;
  gamification?: {
    streak: number;
    xp: number;
    lastActiveDate: string;
  };
}

export async function getUserCloudData(db: D1Database, userId: string): Promise<{
  userStates: Record<string, { state: string; updatedAt: number }>;
  gamification: { streak: number; xp: number; lastActiveDate: string };
}> {
  // 1. Fetch user states
  const statesResult = await db
    .prepare('SELECT topic_id, question_id, state, updated_at FROM user_states WHERE user_id = ?')
    .bind(userId)
    .all<{ topic_id: string; question_id: string; state: string; updated_at: number }>();

  const userStates: Record<string, { state: string; updatedAt: number }> = {};
  if (statesResult.results) {
    for (const row of statesResult.results) {
      userStates[`${row.topic_id}:${row.question_id}`] = {
        state: row.state,
        updatedAt: row.updated_at,
      };
    }
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

  return { userStates, gamification };
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

  return { success: true, syncedCount };
}
