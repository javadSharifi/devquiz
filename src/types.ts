/* ============================================================
 * DevQuiz — types.ts
 * Domain models, typed Actions (discriminated union) and
 * runtime type guards. EVERY fetched/imported JSON payload is
 * validated with these guards before it is persisted.
 * ============================================================ */

export type QuestionLevel = 'junior' | 'mid' | 'senior';
export type QuestionState = 'unseen' | 'know' | 'want_to_learn' | 'skip';
export type Tab = 'game' | 'all-games' | 'review' | 'add' | 'settings';
export type FontSize = 'small' | 'medium' | 'large' | 'extra';
export type Theme = 'dark' | 'light';

export interface Question {
  id: string;
  question: string;
  answer: string;
  isCustom?: boolean;
}

export interface Category {
  id: string;
  title: string;
  level: QuestionLevel;
  icon: string;
  questions: Question[];
}

export interface Topic {
  meta: { version: string; topic: string; title: string; lang: string; icon?: string };
  categories: Category[];
}

export interface CustomQuestion extends Question {
  topicId: string;
  categoryId: string;
  isCustom: true;
  /** Title used when the custom question created a brand-new category. */
  categoryTitle?: string;
  /** Level for the brand-new category this question created. */
  categoryLevel?: QuestionLevel;
}

export interface UserQuestionState {
  state: QuestionState;
  updatedAt: number;
}

export interface TopicCatalogItem {
  id: string;
  title: string;
  description: string;
  version: string;
  downloadUrl: string;
  icon?: string;
}

export interface TopicCatalog {
  topics: TopicCatalogItem[];
}

/** Gamification data persisted in chrome.storage.local. */
export interface Gamification {
  /** Consecutive-day streak. */
  streak: number;
  /** Lifetime XP. */
  xp: number;
  /** Local date string (YYYY-MM-DD) of the last day with >= 1 answer. */
  lastActiveDate: string;
}

/** Navigation session persisted so the user resumes where they left off. */
export interface SessionSnapshot {
  activeTab: Tab;
  activeTopicId: string;
  selectedLevel: QuestionLevel | null;
  selectedCategoryId: string | null;
  currentQuestionIndex: number;
  queue: string[];
  sessionXp: number;
  sessionAnswered: number;
  savedAt: number;
}

/* ------------------------------------------------------------
 * Typed actions — a discriminated union; dispatch() accepts
 * ONLY these shapes, so there is no `any` anywhere in the
 * state layer.
 * ------------------------------------------------------------ */
export type Action =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET_ACTIVE_TOPIC'; topicId: string }
  | { type: 'SELECT_LEVEL'; level: QuestionLevel | null }
  | { type: 'SELECT_CATEGORY'; categoryId: string | null; queue: string[] }
  | { type: 'FLIP_CARD'; flipped: boolean }
  | {
      type: 'ANSWER_CARD';
      questionKey: string;
      state: QuestionState;
      nextIndex: number;
      queue: string[];
      xpGained: number;
      incrementAnswer: number;
    }
  | {
      type: 'RESTORE';
      snapshot: Partial<SessionSnapshot> & { isFlipped?: boolean };
    }
  | { type: 'SET_QUEUE'; queue: string[]; index: number }
  | { type: 'SET_RANDOM_QUESTION'; questionId: string | null }
  | { type: 'SESSION_RESET' }
  | { type: 'DATA_CHANGED' }
  | { type: 'SET_CATALOG'; catalog: TopicCatalogItem[] }
  | { type: 'SET_RECENT_TOPICS'; topicIds: string[] }
  | { type: 'HYDRATE'; payload: {
      topics: Record<string, Topic>;
      userStates: Record<string, UserQuestionState>;
      customQuestions: CustomQuestion[];
      downloadedVersions: Record<string, string>;
      gamification: Gamification;
      recentTopics?: string[];
    }}
  | { type: 'SET_USER_STATE'; key: string; value: UserQuestionState | null }
  | { type: 'SET_GAMIFICATION'; gamification: Gamification }
  | { type: 'ADD_CUSTOM_QUESTION'; question: CustomQuestion }
  | { type: 'REPLACE_CUSTOM_QUESTIONS'; questions: CustomQuestion[] }
  | { type: 'REPLACE_TOPICS'; topics: Record<string, Topic> }
  | { type: 'REPLACE_DOWNLOADED_VERSIONS'; versions: Record<string, string> }
  | { type: 'REPLACE_USER_STATES'; userStates: Record<string, UserQuestionState> }
  | { type: 'SET_FONT_SIZE'; fontSize: FontSize }
  | { type: 'SET_THEME'; theme: Theme };

/* ------------------------------------------------------------
 * Runtime type guards
 * ------------------------------------------------------------ */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}

export function isQuestionLevel(x: unknown): x is QuestionLevel {
  return x === 'junior' || x === 'mid' || x === 'senior';
}

export function isTheme(x: unknown): x is Theme {
  return x === 'dark' || x === 'light';
}

export function isQuestionState(x: unknown): x is QuestionState {
  return x === 'unseen' || x === 'know' || x === 'want_to_learn' || x === 'skip';
}

export function isQuestion(x: unknown): x is Question {
  return (
    isRecord(x) &&
    isNonEmptyString(x['id']) &&
    typeof x['question'] === 'string' &&
    typeof x['answer'] === 'string'
  );
}

export function isCategory(x: unknown): x is Category {
  return (
    isRecord(x) &&
    isNonEmptyString(x['id']) &&
    typeof x['title'] === 'string' &&
    isQuestionLevel(x['level']) &&
    typeof x['icon'] === 'string' &&
    Array.isArray(x['questions']) &&
    (x['questions'] as unknown[]).every(isQuestion)
  );
}

export function isTopic(x: unknown): x is Topic {
  if (!isRecord(x)) return false;
  const meta = x['meta'];
  return (
    isRecord(meta) &&
    isNonEmptyString(meta['version']) &&
    isNonEmptyString(meta['topic']) &&
    typeof meta['title'] === 'string' &&
    typeof meta['lang'] === 'string' &&
    Array.isArray(x['categories']) &&
    (x['categories'] as unknown[]).every(isCategory)
  );
}

export function isTopicCatalogItem(x: unknown): x is TopicCatalogItem {
  return (
    isRecord(x) &&
    isNonEmptyString(x['id']) &&
    typeof x['title'] === 'string' &&
    typeof x['description'] === 'string' &&
    isNonEmptyString(x['version']) &&
    isNonEmptyString(x['downloadUrl']) &&
    /^https:\/\/gist\.githubusercontent\.com\//.test(x['downloadUrl'] as string) &&
    (typeof x['icon'] === 'undefined' || typeof x['icon'] === 'string')
  );
}

export function isTopicCatalog(x: unknown): x is TopicCatalog {
  return (
    isRecord(x) &&
    Array.isArray(x['topics']) &&
    (x['topics'] as unknown[]).every(isTopicCatalogItem)
  );
}

export function isCustomQuestion(x: unknown): x is CustomQuestion {
  return (
    isQuestion(x) &&
    isRecord(x) &&
    isNonEmptyString((x as Record<string, unknown>)['topicId']) &&
    isNonEmptyString((x as Record<string, unknown>)['categoryId']) &&
    (x as Record<string, unknown>)['isCustom'] === true
  );
}

export function isCustomQuestionArray(x: unknown): x is CustomQuestion[] {
  return Array.isArray(x) && x.every(isCustomQuestion);
}

/* ------------------------------------------------------------
 * Small shared helpers (pure, no DOM / no chrome APIs)
 * ------------------------------------------------------------ */

const faFormatter = new Intl.NumberFormat('fa');

/** Format any number with Persian digits (۰-۹). */
export function faNum(n: number): string {
  return faFormatter.format(n);
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Map ASCII digits inside an arbitrary string (e.g. "1.2.0") to Persian digits. */
export function faDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** Composite user_states key — ALWAYS `${topicId}:${questionId}`. */
export function stateKey(topicId: string, questionId: string): string {
  return `${topicId}:${questionId}`;
}

/** Local YYYY-MM-DD (used for streak day boundaries). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compare two version strings, semver-ish with graceful string
 * fallback. Returns >0 when a is newer than b.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; });
  const pb = b.split('.').map((s) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; });
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i];
    const nb = pb[i];
    const va = na !== undefined ? na : 0;
    const vb = nb !== undefined ? nb : 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}
