/* ============================================================
 * DevQuiz — services/data/topics.ts
 * Topic download, persistence, and per-topic user-state cleanup.
 * Gist data strictly overwrites the stored topic; custom questions
 * and surviving user_states are untouched.
 * ============================================================ */

import {
  type Topic,
  type TopicCatalogItem,
  isTopic,
} from '../../types.js';
import { fetchValidatedJson } from '../api/topic-api.js';
import { getLocal, locked, setLocal } from '../storage/chrome-storage.js';
import { getActiveTopicId, setActiveTopicId } from '../storage/flags.js';
import { getCustomQuestions } from './custom-questions.js';
import { getUserStates } from './user-states.js';

export function getTopics(): Promise<Record<string, Topic>> {
  return getLocal<Record<string, Topic>>('topics', {});
}

export function getDownloadedVersions(): Promise<Record<string, string>> {
  return getLocal<Record<string, string>>('downloaded_versions', {});
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
    await Promise.all([
      setLocal('topics', topics),
      setLocal('downloaded_versions', versions),
    ]);
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
  if (dirty) await setLocal('user_states', states);
}

/** Reset every state entry belonging to one topic. */
export async function resetTopicProgress(topicId: string): Promise<void> {
  return locked(async () => {
    const states = await getUserStates();
    const prefix = `${topicId}:`;
    for (const key of Object.keys(states)) {
      if (key.startsWith(prefix)) delete states[key];
    }
    await setLocal('user_states', states);
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
    await Promise.all([
      setLocal('topics', topics),
      setLocal('downloaded_versions', versions),
      setLocal('user_states', states),
    ]);
    const activeId = await getActiveTopicId();
    if (activeId === topicId) {
      await setActiveTopicId('');
    }
  });
}
