import { h } from '../../components/hyperscript.js';
import { button } from '../../components/button.js';
import { toast } from '../../components/toast.js';
import { store } from '../../state.js';
import { getCustomQuestions, importCustomQuestions, setLocal } from '../../storage.js';
import { faNum, isQuestionState } from '../../types.js';
import type { Gamification, QuestionState } from '../../types.js';

type ImportedUserStates = Record<string, { state: QuestionState; updatedAt: number }>;

export function isValidUserStates(x: unknown): x is ImportedUserStates {
  if (typeof x !== 'object' || x === null) return false;
  for (const v of Object.values(x as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) return false;
    const r = v as Record<string, unknown>;
    if (!isQuestionState(r.state) || typeof r.updatedAt !== 'number') return false;
  }
  return true;
}

export function isValidGamification(x: unknown): x is Gamification {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.streak === 'number' && typeof r.xp === 'number' && typeof r.lastActiveDate === 'string';
}

export interface BackupPayload {
  customQuestions: ReturnType<typeof store.getState>['customQuestions'];
  userStates: ReturnType<typeof store.getState>['userStates'];
  gamification: ReturnType<typeof store.getState>['gamification'];
}

export function buildBackupPayload(): BackupPayload {
  const state = store.getState();
  return {
    customQuestions: state.customQuestions,
    userStates: state.userStates,
    gamification: state.gamification,
  };
}

export function exportCustomQuestions(): void {
  const data = JSON.stringify(buildBackupPayload(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url });
  a.download = `devquiz-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('فایل پشتیبان ذخیره شد', { kind: 'success', duration: 2500 });
}

export async function importBackupFromFile(file: File): Promise<void> {
  const reader = new FileReader();
  const text = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('خواندن فایل ممکن نشد.'));
    reader.readAsText(file);
  });
  const raw: unknown = JSON.parse(text);

  if (Array.isArray(raw)) {
    const added = await importCustomQuestions(raw);
    const cq = await getCustomQuestions();
    store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: cq });
    toast(`${faNum(added)} سؤال وارد شد`, { kind: 'success' });
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.customQuestions) {
      await importCustomQuestions(obj.customQuestions);
      const cq = await getCustomQuestions();
      store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: cq });
    }
    if (obj.userStates) {
      if (!isValidUserStates(obj.userStates)) {
        throw new Error('ساختار userStates در فایل نامعتبر است.');
      }
      await setLocal('user_states', obj.userStates);
      store.dispatch({ type: 'REPLACE_USER_STATES', userStates: obj.userStates });
    }
    if (obj.gamification) {
      if (!isValidGamification(obj.gamification)) {
        throw new Error('ساختار gamification در فایل نامعتبر است.');
      }
      await setLocal('gamification', obj.gamification);
      store.dispatch({ type: 'SET_GAMIFICATION', gamification: obj.gamification });
    }
    toast('اطلاعات با موفقیت بازیابی شد', { kind: 'success' });
  }
  store.dispatch({ type: 'DATA_CHANGED' });
}

export function renderBackupSection(): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h3', { className: 'section-title' }, 'سوال‌های من'));
  const fileInput = h('input', { type: 'file', className: 'sr-only', id: 'import-file' });
  fileInput.setAttribute('accept', 'application/json,.json');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void (async () => {
      try {
        await importBackupFromFile(file);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'فایل نامعتبر است.', { kind: 'error' });
      } finally {
        fileInput.value = '';
      }
    })();
  });
  frag.appendChild(
    h(
      'div',
      { className: 'settings-actions' },
      button('📤 خروجی سوال‌های من', () => exportCustomQuestions(), { variant: 'ghost' }),
      button('📥 ورودی', () => fileInput.click(), { variant: 'ghost' }),
      fileInput,
    ),
  );
  return frag;
}
