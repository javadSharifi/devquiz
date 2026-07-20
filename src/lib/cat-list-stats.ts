/* ============================================================
 * src/lib/cat-list-stats.ts
 * Pure helpers for the category-question list (game/cat-list).
 * No DOM, no chrome, no store reads — fully unit-testable.
 * ============================================================ */

import { stateKey } from '../types.js';
import type { Question, QuestionState, UserQuestionState } from '../types.js';

/** CSS variable per question state. Mirrors styles.css `--junior`/`--mid`/`--danger`. */
export const STATE_COLORS: Record<QuestionState, string> = {
  know: 'var(--junior)',
  want_to_learn: 'var(--mid)',
  skip: 'var(--danger)',
  unseen: 'var(--danger)',
};

/**
 * Count questions in `know` or `want_to_learn` within a category,
 * using the provided userStates map. Unseen/skip are NOT counted.
 */
export function computeKnownCount(
  questions: readonly Question[],
  userStates: Record<string, UserQuestionState>,
  activeTopicId: string,
): number {
  let n = 0;
  for (const q of questions) {
    const s = userStates[stateKey(activeTopicId, q.id)]?.state ?? 'unseen';
    if (s === 'know' || s === 'want_to_learn') n++;
  }
  return n;
}

/**
 * Format the count text + bar width for the category list view.
 * `total === 0` → `widthPct = 0` (no NaN, no divide-by-zero).
 */
export interface CategoryProgress {
  /** Persinized "X از Y پاسخ" string. */
  text: string;
  /** CSS width value like "67%". */
  widthPct: number;
}

export function computeProgress(
  knownCount: number,
  total: number,
  formatText: (known: number, total: number) => string,
): CategoryProgress {
  const widthPct = total > 0 ? Math.round((knownCount / total) * 100) : 0;
  return { text: formatText(knownCount, total), widthPct };
}
