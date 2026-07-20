/* ============================================================
 * DevQuiz — services/data/custom-questions.ts
 * User-authored questions stored separately from gist topics.
 * ============================================================ */

import {
  type CustomQuestion,
  isCustomQuestionArray,
} from '../../types.js';
import { getLocal, locked, setLocal } from '../storage/chrome-storage.js';

export function getCustomQuestions(): Promise<CustomQuestion[]> {
  return getLocal<CustomQuestion[]>('custom_questions', []);
}

export async function addCustomQuestion(q: CustomQuestion): Promise<void> {
  return locked(async () => {
    const all = await getCustomQuestions();
    all.push(q);
    await setLocal('custom_questions', all);
  });
}

export async function importCustomQuestions(raw: unknown): Promise<number> {
  if (!isCustomQuestionArray(raw)) {
    throw new Error('فایل انتخاب‌شده ساختار معتبر «سوال‌های من» را ندارد.');
  }
  return locked(async () => {
    const existing = await getCustomQuestions();
    const seen = new Set(existing.map((q) => q.id));
    let added = 0;
    for (const q of raw) {
      if (!seen.has(q.id)) {
        existing.push(q);
        seen.add(q.id);
        added++;
      }
    }
    await setLocal('custom_questions', existing);
    return added;
  });
}
