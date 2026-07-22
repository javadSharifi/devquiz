/* ============================================================
 * DevQuiz — storage.ts
 * Compatibility facade. The real implementations live under
 * `src/services/{storage,api,data}/`. Older call sites keep
 * importing from here without modification.
 * ============================================================ */

export { CATALOG_URL, fetchValidatedJson, fetchCatalog } from './services/api/topic-api.js';
export { Mutex } from './services/storage/mutex.js';
export {
  getLocal,
  getSync,
  locked,
  removeLocal,
  setLocal,
  setSync,
} from './services/storage/chrome-storage.js';
export { runMigrations } from './services/storage/migrations.js';
export {
  getActiveTopicId,
  getFontSize,
  getOnboardingDone,
  getRecentTopics,
  getTheme,
  saveRecentTopics,
  setActiveTopicId,
  setFontSize,
  setOnboardingDone,
  setTheme,
} from './services/storage/flags.js';

export {
  getTopics,
  getDownloadedVersions,
  downloadTopic,
  cleanupOrphanStates,
  resetTopicProgress,
  removeTopic,
} from './services/data/topics.js';
export {
  getUserStates,
  setUserStateEntry,
} from './services/data/user-states.js';
export {
  getCustomQuestions,
  addCustomQuestion,
  importCustomQuestions,
} from './services/data/custom-questions.js';
export {
  getGamification,
  saveGamification,
  recordAnswer,
  revertXp,
} from './services/data/gamification.js';
export {
  getSession,
  saveSession,
  clearSession,
} from './services/data/session.js';
