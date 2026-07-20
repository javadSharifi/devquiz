/* ============================================================
 * DevQuiz — services/data/user-states.ts
 * User question state CRUD. Keys are composite
 * `${topicId}:${questionId}` (see `stateKey` in types.ts).
 * ============================================================ */

import { type UserQuestionState } from '../../types.js';
import { getLocal, locked, setLocal } from '../storage/chrome-storage.js';

export function getUserStates(): Promise<Record<string, UserQuestionState>> {
  return getLocal<Record<string, UserQuestionState>>('user_states', {});
}

export async function setUserStateEntry(
  key: string,
  value: UserQuestionState | null,
): Promise<void> {
  return locked(async () => {
    const states = await getUserStates();
    if (value === null) delete states[key];
    else states[key] = value;
    await setLocal('user_states', states);
  });
}
