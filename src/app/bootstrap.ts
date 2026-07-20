/* ============================================================
 * DevQuiz — app/bootstrap.ts
 * Application init. Migrations → parallel reads → HYDRATE →
 * resolve activeTopicId → restore session → mount header/nav/
 * main → bind keyboard → kick off background catalog fetch →
 * install store subscriptions → wire visibilitychange flush.
 * ============================================================ */

import { store } from '../state.js';
import {
  fetchCatalog,
  getActiveTopicId,
  getCustomQuestions,
  getDownloadedVersions,
  getFontSize,
  getGamification,
  getRecentTopics,
  getSession,
  getTheme,
  getTopics,
  getUserStates,
  runMigrations,
  setActiveTopicId,
} from '../storage.js';
import { errorCard, skeleton, skeletonList, toast } from '../ui.js';
import { findQuestion } from '../lib/topic-utils.js';
import { applyFontSize, applyTheme } from './theme.js';
import { initHeader, renderHeader } from './header.js';
import { renderMain, renderNav, type AppShell } from './router.js';
import { bindKeyboard } from './keyboard.js';
import { installSubscriptions } from './subscriptions.js';

export async function bootstrap(shell: AppShell): Promise<void> {
  try {
    await runMigrations();
    const [topics, userStates, customQuestions, downloadedVersions, gamification, activeTopic, session, recentTopics] = await Promise.all([
      getTopics(),
      getUserStates(),
      getCustomQuestions(),
      getDownloadedVersions(),
      getGamification(),
      getActiveTopicId(),
      getSession(),
      getRecentTopics(),
    ]);

    store.dispatch({ type: 'HYDRATE', payload: { topics, userStates, customQuestions, downloadedVersions, gamification, recentTopics } });

    const topicIds = Object.keys(topics);
    let resolvedTopic = activeTopic && topics[activeTopic] ? activeTopic : (topicIds[0] ?? '');
    if (resolvedTopic && resolvedTopic !== activeTopic) {
      void setActiveTopicId(resolvedTopic);
    }
    store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: resolvedTopic });

    const fontSize = await getFontSize();
    store.dispatch({ type: 'SET_FONT_SIZE', fontSize });
    applyFontSize(fontSize);

    const theme = await getTheme();
    store.dispatch({ type: 'SET_THEME', theme });
    applyTheme(theme);

    if (session && session.activeTopicId && topics[session.activeTopicId]) {
      const validQueue = session.queue.filter((id) => findQuestion(session.activeTopicId, id) !== null);
      store.dispatch({
        type: 'RESTORE',
        snapshot: {
          activeTab: session.activeTab,
          activeTopicId: session.activeTopicId,
          selectedLevel: session.selectedLevel,
          selectedCategoryId: session.selectedCategoryId,
          currentQuestionIndex: Math.min(session.currentQuestionIndex, Math.max(0, validQueue.length - 1)),
          queue: validQueue,
          sessionXp: session.sessionXp,
          sessionAnswered: session.sessionAnswered,
        },
      });
      if (session.selectedCategoryId) {
        toast('ادامه از جایی که بودی 👋', { duration: 2200, kind: 'info' });
      }
    }
  } catch {
    shell.mainEl.replaceChildren(
      errorCard('خواندن داده‌های ذخیره‌شده ممکن نشد.', () => window.location.reload()),
    );
    return;
  }

  initHeader(shell);
  renderHeader();
  renderNav(shell);
  renderMain(store.getState(), shell);
  bindKeyboard(shell);
  void fetchCatalog().then((c) => store.dispatch({ type: 'SET_CATALOG', catalog: c.topics })).catch(() => {});

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flushPersist();
  });

  installSubscriptions(shell);
}
