/* ============================================================
 * DevQuiz — services/storage/migrations.ts
 * Schema migrations. Run once per popup/onboarding boot.
 * ============================================================ */

import {
  type CustomQuestion,
  type Topic,
  type UserQuestionState,
} from '../../types.js';
import { getLocal } from './chrome-storage.js';

const SCHEMA_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const current = await getLocal<number>('schema_version', 0);
  if (current >= SCHEMA_VERSION) return;
  // v0 → v1: ensure all containers exist with the right shape.
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
  await chrome.storage.local.set({
    topics,
    user_states: states,
    custom_questions: custom,
    downloaded_versions: versions,
    schema_version: SCHEMA_VERSION,
  });
}
