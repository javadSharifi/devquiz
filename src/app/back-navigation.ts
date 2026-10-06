/* ============================================================
 * DevQuiz — app/back-navigation.ts
 * Manages back button navigation for both mobile hardware /
 * browser gesture back button and on-screen back buttons.
 *
 * Capabilities:
 *  - Hierarchical step-by-step backward navigation:
 *      Modal overlay → Flashcard screen → Category list / All-topic-questions →
 *      Categories grid → Level picker → Tab history → Root
 *  - Double-tap back to exit at root with Persian toast reminder
 *  - Safe across web (mobile/desktop) and extension popups
 * ============================================================ */

import { store } from '../state.js';
import type { AppState } from '../state.js';
import type { Tab } from '../types.js';
import { toast } from '../ui.js';
import { clearRandomSeen } from '../features/review.js';

export const EXIT_REMINDER_TIMEOUT_MS = 2000;

let lastBackPressTime = 0;
let isBackHandlingActive = false;
let tabHistory: Tab[] = ['game'];
let unregisterPopstate: (() => void) | null = null;

export function getLastBackPressTime(): number {
  return lastBackPressTime;
}

export function setLastBackPressTime(time: number): void {
  lastBackPressTime = time;
}

export function getTabHistory(): Tab[] {
  return [...tabHistory];
}

export function resetTabHistory(initialTab: Tab = 'game'): void {
  tabHistory = [initialTab];
}

export function recordTabChange(newTab: Tab): void {
  if (isBackHandlingActive) return;
  const current = tabHistory[tabHistory.length - 1];
  if (current !== newTab) {
    tabHistory.push(newTab);
    if (tabHistory.length > 12) {
      tabHistory.shift();
    }
  }
}

function findModalOverlay(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (typeof document.querySelector === 'function') {
    return document.querySelector('.overlay');
  }
  if (document.body && Array.isArray((document.body as any).childNodes)) {
    return (document.body as any).childNodes.find((c: any) => c.className?.includes('overlay')) ?? null;
  }
  return null;
}

/**
 * Checks if the application can navigate backwards to an inner level or previous screen.
 * Returns false when the user is at the root screen with nothing to back out of.
 */
export function canNavigateBack(state: AppState): boolean {
  // 1. Any active modal dialog
  if (findModalOverlay() !== null) {
    return true;
  }

  // 2. Review tab with random question flashcard active
  if (state.activeTab === 'review' && state.randomQuestionId !== null) {
    return true;
  }

  // 3. Game tab sub-levels
  if (state.activeTab === 'game') {
    // Playing flashcards
    const isPlayingCards =
      state.selectedCategoryId !== null &&
      (state.queue.length > 0 || state.sessionAnswered > 0);
    if (isPlayingCards) return true;

    // Viewing category question list or all-topic questions
    if (state.selectedCategoryId !== null) return true;

    // Viewing categories with a level filter selected
    if (state.selectedLevel !== null) return true;
  }

  // 4. Tab history (if we came from another tab)
  if (tabHistory.length > 1) {
    return true;
  }

  // 5. Non-game tabs without history can still return to default game tab
  if (state.activeTab !== 'game') {
    return true;
  }

  return false;
}

/**
 * Executes a step-by-step backward navigation action.
 * Returns true if an action was performed, false if already at root.
 */
export function handleBackAction(state: AppState): boolean {
  // 1. Close open modal overlay
  const overlay = findModalOverlay();
  if (overlay) {
    let cancelBtn: HTMLElement | null = null;
    if (typeof overlay.querySelector === 'function') {
      cancelBtn = overlay.querySelector('.modal__actions button');
    }
    if (!cancelBtn) {
      const findChild = (node: any, predicate: (n: any) => boolean): any => {
        if (!node || !Array.isArray(node.childNodes)) return null;
        for (const child of node.childNodes) {
          if (predicate(child)) return child;
          const found = findChild(child, predicate);
          if (found) return found;
        }
        return null;
      };
      const actions = findChild(overlay, (n: any) => n.className?.includes('modal__actions'));
      if (actions && Array.isArray(actions.childNodes)) {
        cancelBtn = actions.childNodes[0] ?? null;
      }
    }
    if (cancelBtn) {
      if (typeof cancelBtn.click === 'function') {
        cancelBtn.click();
      } else if (typeof (cancelBtn as any).dispatch === 'function') {
        (cancelBtn as any).dispatch('click', { target: cancelBtn });
      }
    } else {
      overlay.remove();
    }
    return true;
  }

  // 2. Close random question in Review tab
  if (state.activeTab === 'review' && state.randomQuestionId !== null) {
    clearRandomSeen();
    store.dispatch({ type: 'SET_RANDOM_QUESTION', questionId: null });
    return true;
  }

  // 3. Game tab sub-levels
  if (state.activeTab === 'game') {
    // 3a. Exit flashcards back to category question list
    const isPlayingCards =
      state.selectedCategoryId !== null &&
      (state.queue.length > 0 || state.sessionAnswered > 0);
    if (isPlayingCards) {
      store.dispatch({
        type: 'SELECT_CATEGORY',
        categoryId: state.selectedCategoryId,
        queue: [],
      });
      return true;
    }

    // 3b. Exit category question list back to categories grid
    if (state.selectedCategoryId !== null) {
      store.dispatch({
        type: 'SELECT_CATEGORY',
        categoryId: null,
        queue: [],
      });
      return true;
    }

    // 3c. Exit categories grid back to level picker
    if (state.selectedLevel !== null) {
      store.dispatch({
        type: 'SELECT_LEVEL',
        level: null,
      });
      return true;
    }
  }

  // 4. Tab history backward navigation
  if (tabHistory.length > 1) {
    isBackHandlingActive = true;
    try {
      tabHistory.pop();
      const prevTab = tabHistory[tabHistory.length - 1];
      if (prevTab && prevTab !== state.activeTab) {
        store.dispatch({ type: 'SET_TAB', tab: prevTab });
        return true;
      }
    } finally {
      isBackHandlingActive = false;
    }
  }

  // 5. Default return to game tab if on another tab
  if (state.activeTab !== 'game') {
    isBackHandlingActive = true;
    try {
      store.dispatch({ type: 'SET_TAB', tab: 'game' });
      tabHistory = ['game'];
      return true;
    } finally {
      isBackHandlingActive = false;
    }
  }

  return false;
}

/**
 * Triggered by on-screen back buttons or keyboard shortcuts.
 */
export function triggerAppBack(fallback?: () => void): void {
  const state = store.getState();
  if (canNavigateBack(state)) {
    handleBackAction(state);
  } else if (fallback) {
    fallback();
  }
}

/**
 * Initializes mobile browser back button listener and history guard state.
 */
export function initBackNavigation(): () => void {
  if (unregisterPopstate) {
    unregisterPopstate();
    unregisterPopstate = null;
  }

  if (typeof window === 'undefined' || !window.history) {
    return () => {};
  }

  // Seed history guard state so the first back press at root is captured
  try {
    if (!window.history.state || !window.history.state.__devquiz) {
      window.history.replaceState({ __devquiz: true, depth: 1 }, '');
      window.history.pushState({ __devquiz: true, depth: 2 }, '');
    }
  } catch {
    // Non-fatal if history API is restricted
  }

  const onPopState = (): void => {
    const state = store.getState();
    const canBack = canNavigateBack(state);

    if (canBack) {
      // Step back one level in the app hierarchy
      handleBackAction(state);
      // Re-arm history buffer so next back press triggers popstate again
      try {
        window.history.pushState({ __devquiz: true, depth: 2 }, '');
      } catch {}
    } else {
      // User is at root of application
      const now = Date.now();
      if (now - lastBackPressTime < EXIT_REMINDER_TIMEOUT_MS) {
        // Second back press within 2 seconds: Allow exit!
        lastBackPressTime = 0;
        try {
          window.history.back();
        } catch {}
      } else {
        // First back press at root: Show reminder toast and trap exit
        lastBackPressTime = now;
        toast('برای خروج، دوباره دکمه بازگشت را بزنید', { kind: 'info', duration: EXIT_REMINDER_TIMEOUT_MS });
        try {
          window.history.pushState({ __devquiz: true, depth: 2 }, '');
        } catch {}
      }
    }
  };

  window.addEventListener('popstate', onPopState);

  // Subscribe to tab changes to maintain tab history
  const unsubscribeStore = store.subscribe((next, prev) => {
    if (next.activeTab !== prev.activeTab) {
      recordTabChange(next.activeTab);
    }
  });

  const cleanup = (): void => {
    window.removeEventListener('popstate', onPopState);
    unsubscribeStore();
  };

  unregisterPopstate = cleanup;
  return cleanup;
}
