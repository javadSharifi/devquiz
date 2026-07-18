/* ============================================================
 * DevQuiz — storage.ts
 * The ONLY module allowed to talk to chrome.storage or fetch().
 * - chrome.storage.local : user_states, topics, custom_questions,
 *   downloaded_versions, session, gamification, schema_version
 * - chrome.storage.sync  : active_topic, onboarding_done (tiny
 *   flags only — far below the 8KB/item sync quota)
 * ============================================================ */

import {
  type CustomQuestion,
  type FontSize,
  type Gamification,
  type SessionSnapshot,
  type Theme,
  type Topic,
  type TopicCatalog,
  type TopicCatalogItem,
  type UserQuestionState,
  isCustomQuestionArray,
  isTheme,
  isTopic,
  isTopicCatalog,
  localDateString,
} from "./types.js";

/** Master catalog URL (use exactly — see build spec §8). */
export const CATALOG_URL =
  "https://gist.githubusercontent.com/javadSharifi/b54997f0fdbdf2b1d34f69be116cedfb/raw/catalog.json";

const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------
 * Lightweight async Mutex for read-modify-write serialization
 * ------------------------------------------------------------ */

class Mutex {
  #queue: (() => void)[] = [];
  #locked = false;

  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = (): void => {
        if (this.#queue.length > 0) {
          const next = this.#queue.shift()!;
          this.#locked = true;
          next();
        } else {
          this.#locked = false;
        }
      };
      if (!this.#locked) {
        this.#locked = true;
        resolve(release);
      } else {
        this.#queue.push(() => {
          resolve(release);
        });
      }
    });
  }
}

const mutex = new Mutex();

async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const release = await mutex.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

/* ------------------------------------------------------------
 * Low-level typed helpers
 * ------------------------------------------------------------ */

async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const res = await chrome.storage.local.get(key);
  const val = res[key] as T | undefined;
  return val === undefined ? fallback : val;
}

async function setLocal(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

async function getSync<T>(key: string, fallback: T): Promise<T> {
  const res = await chrome.storage.sync.get(key);
  const val = res[key] as T | undefined;
  return val === undefined ? fallback : val;
}

async function setSync(key: string, value: unknown): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
}

/* ------------------------------------------------------------
 * Migrations — run once per popup/onboarding boot.
 * ------------------------------------------------------------ */

export async function runMigrations(): Promise<void> {
  const current = await getLocal<number>("schema_version", 0);
  if (current >= SCHEMA_VERSION) return;
  // v0 → v1: ensure all containers exist with the right shape.
  const topics = await getLocal<Record<string, Topic>>("topics", {});
  const states = await getLocal<Record<string, UserQuestionState>>(
    "user_states",
    {},
  );
  const custom = await getLocal<CustomQuestion[]>("custom_questions", []);
  const versions = await getLocal<Record<string, string>>(
    "downloaded_versions",
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

/* ------------------------------------------------------------
 * Topics / catalog
 * ------------------------------------------------------------ */

export function getTopics(): Promise<Record<string, Topic>> {
  return getLocal<Record<string, Topic>>("topics", {});
}

export function getDownloadedVersions(): Promise<Record<string, string>> {
  return getLocal<Record<string, string>>("downloaded_versions", {});
}

/**
 * fetch JSON with a 10s AbortController timeout and mandatory
 * runtime validation. Rejects with a Persian, user-presentable
 * Error message on any failure — malformed data is NEVER saved.
 */
export async function fetchValidatedJson<T>(
  url: string,
  guard: (x: unknown) => x is T,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`خطای شبکه (${res.status})`);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error("پاسخ سرور JSON معتبر نیست.");
    }
    if (!guard(data)) throw new Error("ساختار داده دریافتی معتبر نیست.");
    return data;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("اتصال بیش از حد طول کشید (۱۰ ثانیه).");
    }
    throw e instanceof Error ? e : new Error("خطای ناشناخته در دریافت داده.");
  } finally {
    clearTimeout(timer);
  }
}

export function fetchCatalog(): Promise<TopicCatalog> {
  return fetchValidatedJson(CATALOG_URL, isTopicCatalog);
}

/**
 * Download + validate a topic, persist it, record its version and
 * clean up orphaned user_states left behind by removed questions.
 * Gist data strictly overwrites the stored topic; custom questions
 * and surviving user_states are untouched.
 */
export async function downloadTopic(item: TopicCatalogItem): Promise<Topic> {
  return locked(async () => {
    const topic = await fetchValidatedJson(item.downloadUrl, isTopic);
    const topics = await getTopics();
    topics[item.id] = topic;
    const versions = await getDownloadedVersions();
    versions[item.id] = item.version;
    await chrome.storage.local.set({ topics, downloaded_versions: versions });
    await cleanupOrphanStates(item.id, topic);
    return topic;
  });
}

/**
 * Orphan cleanup: after a topic update, drop user_states entries
 * whose question no longer exists in the new topic version.
 * Custom-question states are preserved (they live outside the gist).
 */
export async function cleanupOrphanStates(
  topicId: string,
  topic: Topic,
): Promise<void> {
  const validIds = new Set<string>();
  for (const cat of topic.categories) {
    for (const q of cat.questions) validIds.add(q.id);
  }
  const custom = await getCustomQuestions();
  for (const cq of custom) {
    if (cq.topicId === topicId) validIds.add(cq.id);
  }
  const states = await getUserStates();
  const prefix = `${topicId}:`;
  let dirty = false;
  for (const key of Object.keys(states)) {
    if (!key.startsWith(prefix)) continue;
    const qid = key.slice(prefix.length);
    if (!validIds.has(qid)) {
      delete states[key];
      dirty = true;
    }
  }
  if (dirty) await setLocal("user_states", states);
}

/* ------------------------------------------------------------
 * User question states — keyed by `${topicId}:${questionId}`
 * ------------------------------------------------------------ */

export function getUserStates(): Promise<Record<string, UserQuestionState>> {
  return getLocal<Record<string, UserQuestionState>>("user_states", {});
}

export async function setUserStateEntry(
  key: string,
  value: UserQuestionState | null,
): Promise<void> {
  return locked(async () => {
    const states = await getUserStates();
    if (value === null) delete states[key];
    else states[key] = value;
    await setLocal("user_states", states);
  });
}

/** Reset every state entry belonging to one topic. */
export async function resetTopicProgress(topicId: string): Promise<void> {
  return locked(async () => {
    const states = await getUserStates();
    const prefix = `${topicId}:`;
    for (const key of Object.keys(states)) {
      if (key.startsWith(prefix)) delete states[key];
    }
    await setLocal("user_states", states);
  });
}

/**
 * Remove a topic entirely: delete topic data, downloaded version,
 * all user states, and clear active topic if it was this one.
 */
export async function removeTopic(topicId: string): Promise<void> {
  return locked(async () => {
    const topics = await getTopics();
    delete topics[topicId];
    const versions = await getDownloadedVersions();
    delete versions[topicId];
    const states = await getUserStates();
    const prefix = `${topicId}:`;
    for (const key of Object.keys(states)) {
      if (key.startsWith(prefix)) delete states[key];
    }
    await chrome.storage.local.set({
      topics,
      downloaded_versions: versions,
      user_states: states,
    });
    const activeId = await getActiveTopicId();
    if (activeId === topicId) {
      await setActiveTopicId("");
    }
  });
}

/* ------------------------------------------------------------
 * Custom questions
 * ------------------------------------------------------------ */

export function getCustomQuestions(): Promise<CustomQuestion[]> {
  return getLocal<CustomQuestion[]>("custom_questions", []);
}

export async function addCustomQuestion(q: CustomQuestion): Promise<void> {
  return locked(async () => {
    const all = await getCustomQuestions();
    all.push(q);
    await setLocal("custom_questions", all);
  });
}

export async function importCustomQuestions(raw: unknown): Promise<number> {
  if (!isCustomQuestionArray(raw)) {
    throw new Error("فایل انتخاب‌شده ساختار معتبر «سوال‌های من» را ندارد.");
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
    await setLocal("custom_questions", existing);
    return added;
  });
}

/* ------------------------------------------------------------
 * Gamification (streak / xp)
 * ------------------------------------------------------------ */

const DEFAULT_GAMIFICATION: Gamification = {
  streak: 0,
  xp: 0,
  lastActiveDate: "",
};

export function getGamification(): Promise<Gamification> {
  return getLocal<Gamification>("gamification", DEFAULT_GAMIFICATION);
}

export function saveGamification(g: Gamification): Promise<void> {
  return setLocal("gamification", g);
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
      const yesterday = localDateString(new Date(Date.now() - 86_400_000));
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

/* ------------------------------------------------------------
 * Session persistence (popup closes on outside-click!)
 * ------------------------------------------------------------ */

export function getSession(): Promise<SessionSnapshot | null> {
  return getLocal<SessionSnapshot | null>("session", null);
}

export function saveSession(s: SessionSnapshot): Promise<void> {
  return setLocal("session", s);
}

export function clearSession(): Promise<void> {
  return chrome.storage.local.remove("session");
}

/* ------------------------------------------------------------
 * Sync flags (lightweight only)
 * ------------------------------------------------------------ */

export function getActiveTopicId(): Promise<string> {
  return getSync<string>("active_topic", "");
}

export function setActiveTopicId(id: string): Promise<void> {
  return setSync("active_topic", id);
}

export function getRecentTopics(): Promise<string[]> {
  return getLocal<string[]>("recent_topics", []);
}

export function saveRecentTopics(ids: string[]): Promise<void> {
  return setLocal("recent_topics", ids);
}

export function getFontSize(): Promise<FontSize> {
  return getLocal<FontSize>("font_size", "medium");
}

export function setFontSize(size: FontSize): Promise<void> {
  return setLocal("font_size", size);
}

export async function getTheme(): Promise<Theme> {
  const raw = await getLocal<unknown>("theme", "dark");
  return isTheme(raw) ? raw : "dark";
}

export function setTheme(theme: Theme): Promise<void> {
  return setLocal("theme", theme);
}

export function getOnboardingDone(): Promise<boolean> {
  return getSync<boolean>("onboarding_done", false);
}

export function setOnboardingDone(v: boolean): Promise<void> {
  return setSync("onboarding_done", v);
}
