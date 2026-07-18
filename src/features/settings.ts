import { store } from '../state.js';
import {
  addCustomQuestion,
  downloadTopic,
  fetchCatalog,
  getCustomQuestions,
  getDownloadedVersions,
  getTopics,
  getUserStates,
  importCustomQuestions,
  removeTopic,
  resetTopicProgress,
  setActiveTopicId,
} from '../storage.js';
import type { CustomQuestion, FontSize, Theme, TopicCatalogItem } from '../types.js';
import type { AppState } from '../state.js';
import { compareVersions, faDigits, faNum } from '../types.js';
import { button, confirmDialog, emptyState, errorCard, h, skeleton, skeletonList, toast } from '../ui.js';

const FONT_LABELS: Record<FontSize, string> = { small: 'sm', medium: 'md', large: 'lg', extra: 'xl' };
const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'extra'];
const THEME_LABELS: Record<Theme, string> = { dark: '🌙 تیره', light: '☀️ روشن' };
const THEMES: Theme[] = ['dark', 'light'];

function segmentedGroup<T extends string>(
  options: readonly T[],
  labels: Record<T, string>,
  active: T,
  onPick: (v: T) => void,
  groupLabel: string,
): HTMLElement {
  const group = h('div', {
    className: 'seg-group',
    attrs: { role: 'radiogroup', 'aria-label': groupLabel },
  });
  for (const opt of options) {
    const isActive = opt === active;
    group.appendChild(
      h(
        'button',
        {
          className: `seg${isActive ? ' seg--active' : ''}`,
          type: 'button',
          attrs: {
            role: 'radio',
            'aria-checked': String(isActive),
            'aria-label': labels[opt],
            tabindex: isActive ? '0' : '-1',
          },
          onClick: () => onPick(opt),
        },
        labels[opt],
      ),
    );
  }
  return group;
}

export function renderSettings(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--settings' });
  wrap.appendChild(h('h2', { className: 'view__title' }, 'تنظیمات'));

  wrap.appendChild(h('h3', { className: 'section-title' }, 'مدیریت بازی‌ها'));
  const topicList = h('div', { className: 'settings-group glass' });
  for (const [id, t] of Object.entries(state.topics)) {
    const active = id === state.activeTopicId;
    topicList.appendChild(
      h(
        'div',
        { className: `settings-row settings-row--static${active ? ' settings-row--active' : ''}` },
        h('span', { className: 'settings-row__radio', attrs: { 'aria-hidden': 'true' } }, active ? '●' : '○'),
        h('span', {
          style: { cursor: 'pointer', flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          onClick: () => {
            void setActiveTopicId(id);
            store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: id });
            store.dispatch({ type: 'SET_TAB', tab: 'settings' });
            toast(`موضوع فعال: ${t.meta.title}`, { duration: 2000 });
          },
        }, t.meta.title || id),
        button('🔄', () => void resetTopicWithConfirm(id, t.meta.title || id), { variant: 'danger', ariaLabel: `ریست ${t.meta.title}`, title: 'ریست پیشرفت این بازی' }),
        button('🗑', () => void deleteTopicWithConfirm(id, t.meta.title || id), { variant: 'danger', ariaLabel: `حذف ${t.meta.title}`, title: 'حذف کامل این بازی' }),
      ),
    );
  }
  wrap.appendChild(topicList);

  const catalogHost = h('div', { className: 'catalog-host' });
  wrap.appendChild(
    button('➕ دریافت موضوعات جدید', () => void loadCatalogInto(catalogHost), {
      variant: 'ghost',
      className: 'btn--wide',
    }),
  );
  wrap.appendChild(catalogHost);

  wrap.appendChild(h('h3', { className: 'section-title' }, 'نمایش'));
  const themeGroup = h('div', { className: 'settings-group glass' });
  themeGroup.appendChild(
    segmentedGroup(THEMES, THEME_LABELS, state.theme, (v) => {
      store.dispatch({ type: 'SET_THEME', theme: v });
    }, 'تم'),
  );
  const fontRow = h('div', { className: 'settings-row settings-row--static', attrs: { 'aria-label': 'اندازه فونت' } },
    h('span', { className: 'settings-row__label' }, 'اندازه فونت'),
    segmentedGroup(FONT_SIZES, FONT_LABELS, state.fontSize, (v) => {
      store.dispatch({ type: 'SET_FONT_SIZE', fontSize: v });
    }, 'اندازه فونت'),
  );
  themeGroup.appendChild(fontRow);
  wrap.appendChild(themeGroup);

  wrap.appendChild(h('h3', { className: 'section-title' }, 'سوال‌های من'));
  const fileInput = h('input', { type: 'file', className: 'sr-only', id: 'import-file' });
  fileInput.setAttribute('accept', 'application/json,.json');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const raw: any = JSON.parse(String(reader.result));

          if (Array.isArray(raw)) {
            const added = await importCustomQuestions(raw);
            const cq = await getCustomQuestions();
            store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: cq });
            toast(`${faNum(added)} سؤال وارد شد`, { kind: 'success' });
          } else if (raw && typeof raw === 'object') {
            if (raw.customQuestions) {
              await importCustomQuestions(raw.customQuestions);
              const cq = await getCustomQuestions();
              store.dispatch({ type: 'REPLACE_CUSTOM_QUESTIONS', questions: cq });
            }
            if (raw.userStates) {
              await chrome.storage.local.set({ user_states: raw.userStates });
              store.dispatch({ type: 'REPLACE_USER_STATES', userStates: raw.userStates });
            }
            if (raw.gamification) {
              await chrome.storage.local.set({ gamification: raw.gamification });
              store.dispatch({ type: 'SET_GAMIFICATION', gamification: raw.gamification });
            }
            toast('اطلاعات با موفقیت بازیابی شد', { kind: 'success' });
          }
          store.dispatch({ type: 'DATA_CHANGED' });
        } catch (e) {
          toast(e instanceof Error ? e.message : 'فایل نامعتبر است.', { kind: 'error' });
        } finally {
          fileInput.value = '';
        }
      })();
    };
    reader.onerror = () => toast('خواندن فایل ممکن نشد.', { kind: 'error' });
    reader.readAsText(file);
  });
  wrap.appendChild(
    h(
      'div',
      { className: 'settings-actions' },
      button('📤 خروجی سوال‌های من', () => exportCustomQuestions(), { variant: 'ghost' }),
      button('📥 ورودی', () => fileInput.click(), { variant: 'ghost' }),
      fileInput,
    ),
  );

  return wrap;
}

async function deleteTopicWithConfirm(id: string, title: string): Promise<void> {
  const ok = await confirmDialog(
    'حذف موضوع',
    `موضوع «${title}» و تمام پیشرفت آن حذف می‌شود. این کار قابل بازگشت نیست.`,
    'حذف',
  );
  if (!ok) return;
  await removeTopic(id);
  const [topics, versions, us] = await Promise.all([getTopics(), getDownloadedVersions(), getUserStates()]);
  store.dispatch({ type: 'REPLACE_TOPICS', topics });
  store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
  store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
  store.dispatch({ type: 'DATA_CHANGED' });
  toast('موضوع حذف شد ✅', { kind: 'success' });
}

async function resetTopicWithConfirm(id: string, title: string): Promise<void> {
  const ok = await confirmDialog(
    'ریست پیشرفت',
    `تمام پیشرفت موضوع «${title}» پاک می‌شود. این کار قابل بازگشت نیست.`,
    'پاک کن',
  );
  if (!ok) return;
  await resetTopicProgress(id);
  const us = await getUserStates();
  store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
  toast('پیشرفت این موضوع ریست شد.', { kind: 'success' });
  store.dispatch({ type: 'SESSION_RESET' });
  store.dispatch({ type: 'DATA_CHANGED' });
}

function exportCustomQuestions(): void {
  const state = store.getState();
  const backup = {
    customQuestions: state.customQuestions,
    userStates: state.userStates,
    gamification: state.gamification,
  };
  const data = JSON.stringify(backup, null, 2);
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

async function loadCatalogInto(host: HTMLElement): Promise<void> {
  host.replaceChildren(skeletonList(3, 'skeleton--row'));
  try {
    const catalog = await fetchCatalog();
    const s = store.getState();
    const rows: HTMLElement[] = [];
    for (const item of catalog.topics) {
      const downloadedVersion = s.downloadedVersions[item.id];
      const isDownloaded = downloadedVersion !== undefined && s.topics[item.id] !== undefined;
      const hasUpdate = isDownloaded && compareVersions(item.version, downloadedVersion) > 0;
      if (isDownloaded && !hasUpdate) continue;
      const actionLabel = hasUpdate ? 'بروزرسانی' : 'دانلود';
      const btn = button(
        actionLabel,
        () => {
          btn.disabled = true;
          btn.textContent = '…';
          void downloadTopic(item)
            .then(async () => {
              const topics = await getTopics();
              const versions = await getDownloadedVersions();
              const us = await getUserStates();
              store.dispatch({ type: 'REPLACE_TOPICS', topics });
              store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
              store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
              btn.textContent = '✓';
              toast(hasUpdate ? 'موضوع بروزرسانی شد ✅' : 'موضوع دانلود شد ✅', { kind: 'success' });
              if (!store.getState().activeTopicId) {
                void setActiveTopicId(item.id);
                store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: item.id });
              }
              store.dispatch({ type: 'DATA_CHANGED' });
            })
            .catch((e: unknown) => {
              btn.disabled = false;
              btn.textContent = actionLabel;
              toast(e instanceof Error ? e.message : 'دانلود ناموفق بود.', { kind: 'error' });
            });
        },
        { variant: 'primary', ariaLabel: `${actionLabel} ${item.title}` },
      );
      rows.push(
        h(
          'div',
          { className: 'settings-row settings-row--static' },
          h(
            'div',
            { className: 'settings-row__main' },
            h('span', {}, item.title),
            hasUpdate ? h('span', { className: 'badge badge--update' }, 'بروزرسانی') : null,
            h('span', { className: 'settings-row__meta' }, item.description),
          ),
          btn,
        ),
      );
    }
    host.replaceChildren(
      rows.length > 0
        ? h('div', { className: 'settings-group glass' }, rows)
        : emptyState('✨', 'همه‌چیز به‌روزه', 'موضوع جدید یا بروزرسانی‌ای موجود نیست.'),
    );
  } catch (e) {
    host.replaceChildren(
      errorCard(e instanceof Error ? e.message : 'دریافت فهرست موضوعات ناموفق بود.', () =>
        void loadCatalogInto(host),
      ),
    );
  }
}
