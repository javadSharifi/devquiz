/* ============================================================
 * DevQuiz — app/subscriptions.ts
 * store.subscribe smart-diff for cheap re-renders + store.onAction
 * for storage mirroring. Exact diff logic from pre-refactor popup.ts
 * is preserved byte-for-byte; only the call sites were rewired.
 * ============================================================ */

import { store } from '../state.js';
import {
  addCustomQuestion,
  saveGamification,
  saveRecentTopics,
  setActiveTopicId,
  setFontSize,
  setTheme,
  setUserStateEntry,
} from '../storage.js';
import { applyFlip } from '../components/flashcard.js';
import { renderMain, renderNav, patchGameCard, type AppShell } from './router.js';
import { updateHeaderStats } from './header.js';
import { applyFontSize, applyTheme } from './theme.js';
import { platform } from '../platform/index.js';

export function installSubscriptions(shell: AppShell): void {
  store.subscribe((state, prev) => {
    if (state.fontSize !== prev.fontSize && state.activeTab === 'settings') {
      renderMain(state, shell);
      return;
    }
    if (state.theme !== prev.theme && state.activeTab === 'settings') {
      renderMain(state, shell);
      return;
    }
    if (state.activeTab !== prev.activeTab) {
      renderNav(shell);
      if (state.activeTab === 'settings') {
        void platform.action.setBadgeText({ text: '' });
      }
      renderMain(state, shell);
      return;
    }
    if (state.gamification !== prev.gamification) {
      updateHeaderStats();
    }
    if (
      state.activeTopicId !== prev.activeTopicId ||
      state.selectedLevel !== prev.selectedLevel ||
      state.selectedCategoryId !== prev.selectedCategoryId ||
      state.dataRevision !== prev.dataRevision ||
      state.topics !== prev.topics ||
      (state.catalog !== prev.catalog && (Object.keys(state.topics).length > 0 || state.activeTab !== 'game'))
    ) {
      renderMain(state, shell);
      return;
    }
    if (
      state.activeTab === 'game' &&
      prev.activeTab === 'game' &&
      state.selectedCategoryId !== null &&
      prev.selectedCategoryId !== null &&
      state.selectedCategoryId === prev.selectedCategoryId &&
      (state.currentQuestionIndex !== prev.currentQuestionIndex || state.queue !== prev.queue)
    ) {
      if (!patchGameCard(state)) {
        renderMain(state, shell);
      }
      return;
    }
    if (
      state.randomQuestionId !== prev.randomQuestionId ||
      state.currentQuestionIndex !== prev.currentQuestionIndex ||
      state.queue !== prev.queue
    ) {
      renderMain(state, shell);
      return;
    }
    if (state.isFlipped !== prev.isFlipped) {
      applyFlip(state.isFlipped, shell.mainEl, shell.liveRegion);
      return;
    }
  });

  store.onAction((action) => {
    switch (action.type) {
      case 'SET_USER_STATE':
        void setUserStateEntry(action.key, action.value);
        break;
      case 'SET_GAMIFICATION':
        void saveGamification(action.gamification);
        break;
      case 'ADD_CUSTOM_QUESTION':
        void addCustomQuestion(action.question);
        break;
      case 'SET_ACTIVE_TOPIC':
        void setActiveTopicId(action.topicId);
        void saveRecentTopics(store.getState().recentTopics);
        break;
      case 'SET_FONT_SIZE':
        void setFontSize(action.fontSize);
        applyFontSize(action.fontSize);
        break;
      case 'SET_THEME':
        void setTheme(action.theme);
        applyTheme(action.theme);
        break;
    }
  });
}
