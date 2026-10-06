import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

const { fakeStore, toastMock } = vi.hoisted(() => ({
  fakeStore: {
    getState: vi.fn(),
    dispatch: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
  toastMock: vi.fn(),
}));

vi.mock('../src/state.js', () => ({ store: fakeStore }));
vi.mock('../src/ui.js', () => ({
  toast: toastMock,
  h: vi.fn(),
  button: vi.fn(),
  emptyState: vi.fn(),
}));

import {
  canNavigateBack,
  handleBackAction,
  initBackNavigation,
  resetTabHistory,
  recordTabChange,
  getTabHistory,
  setLastBackPressTime,
  EXIT_REMINDER_TIMEOUT_MS,
} from '../src/app/back-navigation.js';

describe('Back Navigation', () => {
  beforeEach(() => {
    resetTabHistory('game');
    setLastBackPressTime(0);
    fakeStore.dispatch.mockClear();
    toastMock.mockClear();
  });

  describe('canNavigateBack()', () => {
    it('returns true when modal overlay is present', () => {
      const overlay = new FakeElement();
      overlay.className = 'overlay';
      dom.body.appendChild(overlay);

      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
      overlay.remove();
    });

    it('returns true when inside game playing flashcards', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: 'cat1',
        queue: ['q1', 'q2'],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
    });

    it('returns true when inside game viewing category question list', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: 'cat1',
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
    });

    it('returns true when viewing categories grid with a selected level', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
    });

    it('returns true in review tab with random question active', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'review',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: 'q123',
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
    });

    it('returns true on non-game tabs', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'settings',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(true);
    });

    it('returns false at root of game tab with no level or category selected', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      expect(canNavigateBack(fakeStore.getState())).toBe(false);
    });
  });

  describe('handleBackAction()', () => {
    it('closes modal overlay when present', () => {
      const overlay = new FakeElement();
      overlay.className = 'overlay';
      let cancelClicked = false;
      const actions = new FakeElement();
      actions.className = 'modal__actions';
      const cancelBtn = new FakeElement();
      cancelBtn.addEventListener('click', () => { cancelClicked = true; });
      actions.appendChild(cancelBtn);
      overlay.appendChild(actions);
      dom.body.appendChild(overlay);

      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(cancelClicked).toBe(true);
      overlay.remove();
    });

    it('steps back from flashcard session to category list (clears queue)', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: 'git-basics',
        queue: ['q1', 'q2'],
        sessionAnswered: 1,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SELECT_CATEGORY',
        categoryId: 'git-basics',
        queue: [],
      });
    });

    it('steps back from category list to categories grid (clears selectedCategoryId)', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: 'git-basics',
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SELECT_CATEGORY',
        categoryId: null,
        queue: [],
      });
    });

    it('steps back from categories grid to level picker (clears selectedLevel)', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SELECT_LEVEL',
        level: null,
      });
    });

    it('steps back from random question in review tab to review list', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'review',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: 'rand1',
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_RANDOM_QUESTION',
        questionId: null,
      });
    });

    it('steps back through tab history to previous tab', () => {
      recordTabChange('search');
      recordTabChange('settings');
      expect(getTabHistory()).toEqual(['game', 'search', 'settings']);

      fakeStore.getState.mockReturnValue({
        activeTab: 'settings',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(true);
      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_TAB',
        tab: 'search',
      });
    });

    it('returns false at root level', () => {
      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      const handled = handleBackAction(fakeStore.getState());
      expect(handled).toBe(false);
    });
  });

  describe('initBackNavigation & popstate handling', () => {
    let mockHistory: { state: any; pushState: any; replaceState: any; back: any };
    let popstateListener: ((e: any) => void) | null = null;

    beforeEach(() => {
      popstateListener = null;
      mockHistory = {
        state: null,
        pushState: vi.fn((st: any) => { mockHistory.state = st; }),
        replaceState: vi.fn((st: any) => { mockHistory.state = st; }),
        back: vi.fn(),
      };

      (globalThis as any).window = {
        history: mockHistory,
        addEventListener: vi.fn((event: string, fn: any) => {
          if (event === 'popstate') popstateListener = fn;
        }),
        removeEventListener: vi.fn(),
      };
    });

    it('initializes guard state in history', () => {
      initBackNavigation();
      expect(mockHistory.replaceState).toHaveBeenCalledWith({ __devquiz: true, depth: 1 }, '');
      expect(mockHistory.pushState).toHaveBeenCalledWith({ __devquiz: true, depth: 2 }, '');
    });

    it('handles backward navigation step on popstate when canNavigateBack is true', () => {
      initBackNavigation();
      expect(popstateListener).toBeDefined();

      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: 'junior',
        selectedCategoryId: 'cat1',
        queue: ['q1'],
        sessionAnswered: 1,
        randomQuestionId: null,
      });

      popstateListener!({});

      expect(fakeStore.dispatch).toHaveBeenCalledWith({
        type: 'SELECT_CATEGORY',
        categoryId: 'cat1',
        queue: [],
      });
      // Re-arms history entry
      expect(mockHistory.pushState).toHaveBeenCalledWith({ __devquiz: true, depth: 2 }, '');
    });

    it('shows toast reminder on first back press at root without exiting', () => {
      initBackNavigation();

      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      popstateListener!({});

      expect(toastMock).toHaveBeenCalledWith(
        'برای خروج، دوباره دکمه بازگشت را بزنید',
        expect.objectContaining({ kind: 'info' }),
      );
      expect(mockHistory.back).not.toHaveBeenCalled();
    });

    it('allows exit when back is pressed twice within timeout at root', () => {
      initBackNavigation();

      fakeStore.getState.mockReturnValue({
        activeTab: 'game',
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        sessionAnswered: 0,
        randomQuestionId: null,
      });

      // First press
      popstateListener!({});
      expect(toastMock).toHaveBeenCalledTimes(1);

      // Second press immediately after
      popstateListener!({});
      expect(mockHistory.back).toHaveBeenCalledTimes(1);
    });
  });
});
