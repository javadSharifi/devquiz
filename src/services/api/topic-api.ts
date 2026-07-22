/* ============================================================
 * DevQuiz — services/api/topic-api.ts
 * The ONLY module allowed to call fetch() for topic/catalog data.
 * - 10s AbortController timeout on every request.
 * - cache: "no-cache" to avoid stale gist content.
 * - Runtime validation via a type guard; rejects with a Persian,
 *   user-presentable Error on any failure — malformed data is
 *   NEVER returned to the caller.
 * ============================================================ */

import { isTopicCatalog, type TopicCatalog } from '../../types.js';

/** Master catalog URL (use exactly — see build spec §8). */
export const CATALOG_URL =
  'https://gist.githubusercontent.com/javadSharifi/b54997f0fdbdf2b1d34f69be116cedfb/raw/catalog.json';

/**
 * Fetch JSON with a 10s AbortController timeout and mandatory
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
    const bust = url.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
    const res = await fetch(`${url}${bust}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`خطای شبکه (${res.status})`);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error('پاسخ سرور JSON معتبر نیست.');
    }
    if (!guard(data)) throw new Error('ساختار داده دریافتی معتبر نیست.');
    return data;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('اتصال بیش از حد طول کشید (۱۰ ثانیه).');
    }
    throw e instanceof Error ? e : new Error('خطای ناشناخته در دریافت داده.');
  } finally {
    clearTimeout(timer);
  }
}

export function fetchCatalog(): Promise<TopicCatalog> {
  return fetchValidatedJson(CATALOG_URL, isTopicCatalog);
}
