/* ============================================================
 * DevQuiz — services/data/session.ts
 * Session snapshot persistence (popup closes on outside-click).
 * ============================================================ */

import { type SessionSnapshot } from '../../types.js';
import { getLocal, removeLocal, setLocal } from '../storage/chrome-storage.js';

export function getSession(): Promise<SessionSnapshot | null> {
  return getLocal<SessionSnapshot | null>('session', null);
}

export function saveSession(s: SessionSnapshot): Promise<void> {
  return setLocal('session', s);
}

export function clearSession(): Promise<void> {
  return removeLocal('session');
}
