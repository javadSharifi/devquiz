/* ============================================================
 * DevQuiz — services/data/gamification.ts
 * Streak / XP persistence. `recordAnswer` is the only place the
 * daily streak advances.
 * ============================================================ */

import {
  type Gamification,
  localDateString,
} from '../../types.js';
import { getLocal, locked, setLocal } from '../storage/chrome-storage.js';

const DEFAULT_GAMIFICATION: Gamification = {
  streak: 0,
  xp: 0,
  lastActiveDate: '',
};

export function getGamification(): Promise<Gamification> {
  return getLocal<Gamification>('gamification', { ...DEFAULT_GAMIFICATION });
}

export function saveGamification(g: Gamification): Promise<void> {
  return setLocal('gamification', g);
}

/**
 * Called on every answered card. Adds XP and advances the
 * daily streak at most once per local day.
 * Returns the updated gamification object.
 */
export async function recordAnswer(xpDelta: number): Promise<Gamification> {
  return locked(async () => {
    const g = await getGamification();
    const today = localDateString();
    if (g.lastActiveDate !== today) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = localDateString(d);
      g.streak = g.lastActiveDate === yesterday ? g.streak + 1 : 1;
      g.lastActiveDate = today;
    }
    g.xp = Math.max(0, g.xp + xpDelta);
    await saveGamification(g);
    return g;
  });
}

/** Undo support: subtract xp without touching the streak/day. */
export async function revertXp(xpDelta: number): Promise<Gamification> {
  return locked(async () => {
    const g = await getGamification();
    g.xp = Math.max(0, g.xp - xpDelta);
    await saveGamification(g);
    return g;
  });
}
