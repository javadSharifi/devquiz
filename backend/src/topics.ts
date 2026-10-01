/* ============================================================
 * backend/src/topics.ts
 * Serves topic JSON files and catalog from Cloudflare Edge.
 * Replaces external GitHub Gist dependency completely.
 * ============================================================ */

import catalogData from '../data/catalog.json';
import gitData from '../data/git.json';
import jsData from '../data/javascript.json';
import tsData from '../data/typescript.json';
import reactData from '../data/react.json';
import nextData from '../data/nextjs.json';
import htmlData from '../data/html.json';
import cssData from '../data/css.json';
import phpData from '../data/php.json';
import csData from '../data/cs_fundamentals.json';
import devtoolsData from '../data/devtools_web.json';
import restApiData from '../data/rest_api.json';
import seoData from '../data/seo.json';

const TOPIC_STORE: Record<string, unknown> = {
  git: gitData,
  javascript: jsData,
  typescript: tsData,
  react: reactData,
  nextjs: nextData,
  html: htmlData,
  css: cssData,
  php: phpData,
  cs_fundamentals: csData,
  devtools_web: devtoolsData,
  rest_api: restApiData,
  seo: seoData,
};

export function getCatalog(baseUrl: string): { topics: unknown[] } {
  const topics = (catalogData.topics as Array<Record<string, unknown>>).map((t) => ({
    ...t,
    downloadUrl: `${baseUrl}/api/topics/${t.id}`,
  }));
  return { topics };
}

export function getTopicById(id: string): unknown | null {
  return TOPIC_STORE[id] ?? null;
}
