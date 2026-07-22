/* ============================================================
 * DevQuiz — services/storage/migrations.ts
 * Schema migrations. Run once per popup/onboarding boot.
 * ============================================================ */

import {
  type CustomQuestion,
  type Topic,
  type UserQuestionState,
} from '../../types.js';
import { getLocal, setLocal } from './chrome-storage.js';

const SCHEMA_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const current = await getLocal<number>('schema_version', 0);
  if (current >= SCHEMA_VERSION) return;
  const topics = await getLocal<Record<string, Topic>>('topics', {});
  const states = await getLocal<Record<string, UserQuestionState>>(
    'user_states',
    {},
  );
  const custom = await getLocal<CustomQuestion[]>('custom_questions', []);
  const versions = await getLocal<Record<string, string>>(
    'downloaded_versions',
    {},
  );
  await Promise.all([
    setLocal('topics', topics),
    setLocal('user_states', states),
    setLocal('custom_questions', custom),
    setLocal('downloaded_versions', versions),
    setLocal('schema_version', SCHEMA_VERSION),
  ]);
}
