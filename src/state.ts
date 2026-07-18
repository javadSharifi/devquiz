import { saveSession } from './storage.js';
import type {
  Action,
  CustomQuestion,
  FontSize,
  Gamification,
  QuestionLevel,
  SessionSnapshot,
  Tab,
  Theme,
  Topic,
  TopicCatalogItem,
  UserQuestionState,
} from './types.js';

export interface AppState {
  activeTab: Tab;
  activeTopicId: string;
  selectedLevel: QuestionLevel | null;
  selectedCategoryId: string | null;
  queue: string[];
  currentQuestionIndex: number;
  isFlipped: boolean;
  sessionXp: number;
  sessionAnswered: number;
  randomQuestionId: string | null;
  dataRevision: number;
  topics: Record<string, Topic>;
  userStates: Record<string, UserQuestionState>;
  customQuestions: CustomQuestion[];
  downloadedVersions: Record<string, string>;
  gamification: Gamification;
  recentTopics: string[];
  catalog: TopicCatalogItem[];
  fontSize: FontSize;
  theme: Theme;
}

const initialState: AppState = {
  activeTab: 'game',
  activeTopicId: '',
  selectedLevel: null,
  selectedCategoryId: null,
  queue: [],
  currentQuestionIndex: 0,
  isFlipped: false,
  sessionXp: 0,
  sessionAnswered: 0,
  randomQuestionId: null,
  dataRevision: 0,
  topics: {},
  userStates: {},
  customQuestions: [],
  downloadedVersions: {},
  gamification: { streak: 0, xp: 0, lastActiveDate: '' },
  recentTopics: [],
  catalog: [],
  fontSize: 'medium' as FontSize,
  theme: 'dark' as Theme,
};

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, isFlipped: false, randomQuestionId: null };
    case 'SET_ACTIVE_TOPIC': {
      const next: string[] = action.topicId
        ? [action.topicId, ...state.recentTopics.filter((id) => id !== action.topicId)].slice(0, 8)
        : state.recentTopics;
      return {
        ...state,
        activeTopicId: action.topicId,
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        currentQuestionIndex: 0,
        isFlipped: false,
        recentTopics: next,
      };
    }
    case 'SELECT_LEVEL':
      return {
        ...state,
        selectedLevel: action.level,
        selectedCategoryId: null,
        queue: [],
        currentQuestionIndex: 0,
        isFlipped: false,
      };
    case 'SELECT_CATEGORY':
      return {
        ...state,
        selectedCategoryId: action.categoryId,
        queue: action.queue,
        currentQuestionIndex: 0,
        isFlipped: false,
        sessionXp: action.categoryId === null ? state.sessionXp : 0,
        sessionAnswered: action.categoryId === null ? state.sessionAnswered : 0,
      };
    case 'FLIP_CARD':
      return { ...state, isFlipped: action.flipped };
    case 'ANSWER_CARD':
      return {
        ...state,
        queue: action.queue,
        currentQuestionIndex: action.nextIndex,
        isFlipped: false,
        sessionXp: state.sessionXp + action.xpGained,
        sessionAnswered: state.sessionAnswered + action.incrementAnswer,
      };
    case 'SET_QUEUE':
      return { ...state, queue: action.queue, currentQuestionIndex: action.index, isFlipped: false };
    case 'SET_RANDOM_QUESTION':
      return { ...state, randomQuestionId: action.questionId, isFlipped: false };
    case 'RESTORE':
      return { ...state, ...action.snapshot };
    case 'SESSION_RESET':
      return {
        ...state,
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        currentQuestionIndex: 0,
        isFlipped: false,
        sessionXp: 0,
        sessionAnswered: 0,
      };
    case 'DATA_CHANGED':
      return { ...state, dataRevision: state.dataRevision + 1 };
    case 'SET_CATALOG':
      return { ...state, catalog: action.catalog };
    case 'SET_RECENT_TOPICS':
      return { ...state, recentTopics: action.topicIds };
    case 'HYDRATE':
      return { ...state, ...action.payload, recentTopics: action.payload.recentTopics ?? state.recentTopics };
    case 'SET_USER_STATE': {
      const next = { ...state.userStates };
      if (action.value === null) delete next[action.key];
      else next[action.key] = action.value;
      return { ...state, userStates: next };
    }
    case 'SET_GAMIFICATION':
      return { ...state, gamification: action.gamification };
    case 'ADD_CUSTOM_QUESTION':
      return { ...state, customQuestions: [...state.customQuestions, action.question] };
    case 'REPLACE_CUSTOM_QUESTIONS':
      return { ...state, customQuestions: action.questions };
    case 'REPLACE_TOPICS': {
      const hasActive = action.topics[state.activeTopicId] !== undefined;
      if (hasActive) return { ...state, topics: action.topics };
      const keys = Object.keys(action.topics);
      const firstId = keys[0] ?? '';
      return {
        ...state,
        topics: action.topics,
        activeTopicId: firstId,
        selectedLevel: null,
        selectedCategoryId: null,
        queue: [],
        currentQuestionIndex: 0,
        isFlipped: false,
        sessionXp: 0,
        sessionAnswered: 0,
      };
    }
    case 'REPLACE_DOWNLOADED_VERSIONS':
      return { ...state, downloadedVersions: action.versions };
    case 'REPLACE_USER_STATES':
      return { ...state, userStates: action.userStates };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.fontSize };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
  }
}

type Listener = (state: AppState, prev: AppState) => void;
type ActionHandler = (action: Action) => void;

export class Store {
  #state: AppState = initialState;
  #listeners = new Set<Listener>();
  #actionHandlers = new Set<ActionHandler>();
  #persistTimer: number | undefined;

  getState(): Readonly<AppState> {
    return this.#state;
  }

  dispatch(action: Action): void {
    const prev = this.#state;
    this.#state = reduce(prev, action);
    if (this.#state === prev) return;
    for (const l of this.#listeners) l(this.#state, prev);
    for (const h of this.#actionHandlers) h(action);
    this.#schedulePersist();
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  onAction(handler: ActionHandler): () => void {
    this.#actionHandlers.add(handler);
    return () => this.#actionHandlers.delete(handler);
  }

  #schedulePersist(): void {
    if (this.#persistTimer !== undefined) clearTimeout(this.#persistTimer);
    this.#persistTimer = setTimeout(() => {
      const s = this.#state;
      const snapshot: SessionSnapshot = {
        activeTab: s.activeTab,
        activeTopicId: s.activeTopicId,
        selectedLevel: s.selectedLevel,
        selectedCategoryId: s.selectedCategoryId,
        currentQuestionIndex: s.currentQuestionIndex,
        queue: s.queue,
        sessionXp: s.sessionXp,
        sessionAnswered: s.sessionAnswered,
        savedAt: Date.now(),
      };
      void saveSession(snapshot).catch(() => {});
    }, 300) as unknown as number;
  }

  flushPersist(): void {
    if (this.#persistTimer !== undefined) {
      clearTimeout(this.#persistTimer);
      const s = this.#state;
      void saveSession({
        activeTab: s.activeTab,
        activeTopicId: s.activeTopicId,
        selectedLevel: s.selectedLevel,
        selectedCategoryId: s.selectedCategoryId,
        currentQuestionIndex: s.currentQuestionIndex,
        queue: s.queue,
        sessionXp: s.sessionXp,
        sessionAnswered: s.sessionAnswered,
        savedAt: Date.now(),
      });
    }
  }
}

export const store = new Store();
