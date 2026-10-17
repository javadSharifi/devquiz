import { h } from '../../components/hyperscript.js';
import { button } from '../../components/button.js';
import { toast } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';
import { emptyState, errorCard, skeletonList } from '../../ui.js';
import { store } from '../../state.js';
import type { AppState } from '../../state.js';
import {
  downloadTopic,
  fetchCatalog,
  getDownloadedVersions,
  getTopics,
  getUserStates,
  removeTopic,
  resetTopicProgress,
  setActiveTopicId,
} from '../../storage.js';
import { compareVersions } from '../../types.js';
import { ICON, icon, settingsSection } from './section.js';

export function renderTopicMgmtSection(state: AppState): HTMLElement {
  const topicList = h('div', { className: 'st-card' });
  const entries = Object.entries(state.topics);
  if (entries.length === 0) {
    topicList.appendChild(h('p', { className: 'st-empty' }, 'هنوز بازی‌ای دانلود نشده است.'));
  }
  for (const [id, t] of entries) {
    const active = id === state.activeTopicId;
    const title = t.meta.title || id;
    topicList.appendChild(
      h(
        'div',
        { className: `topic-row${active ? ' topic-row--active' : ''}` },
        h(
          'button',
          {
            type: 'button',
            className: 'topic-row__main',
            attrs: { 'aria-pressed': String(active) },
            onClick: () => {
              if (active) return;
              void setActiveTopicId(id);
              store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: id });
              store.dispatch({ type: 'SET_TAB', tab: 'settings' });
              toast(`موضوع فعال: ${title}`, { duration: 2000 });
            },
          },
          h('span', { className: 'topic-row__radio', attrs: { 'aria-hidden': 'true' } }),
          h(
            'span',
            { className: 'topic-row__text' },
            h('span', { className: 'topic-row__title' }, title),
            h('span', { className: 'topic-row__hint' }, active ? 'فعال' : 'برای فعال‌سازی لمس کنید'),
          ),
        ),
        iconButton(ICON.reset, `ریست ${title}`, 'ریست پیشرفت این بازی', () => void resetTopicWithConfirm(id, title)),
        iconButton(ICON.trash, `حذف ${title}`, 'حذف کامل این بازی', () => void deleteTopicWithConfirm(id, title), true),
      ),
    );
  }

  const catalogHost = h('div', { className: 'catalog-host' });
  const getBtn = h(
    'button',
    { type: 'button', className: 'st-dashed', onClick: () => void loadCatalogInto(catalogHost) },
    icon(ICON.plus, 16),
    'دریافت موضوعات جدید',
  );
  return settingsSection('بازی‌ها', topicList, getBtn, catalogHost);
}

function iconButton(path: string, label: string, title: string, onClick: () => void, danger = false): HTMLButtonElement {
  return h(
    'button',
    {
      type: 'button',
      className: `icon-btn${danger ? ' icon-btn--danger' : ''}`,
      title,
      attrs: { 'aria-label': label },
      onClick,
    },
    icon(path, 18),
  );
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
  toast('موضوع حذف شد', { kind: 'success' });
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

export async function loadCatalogInto(host: HTMLElement): Promise<void> {
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
              btn.replaceChildren(icon(ICON.check, 16));
              toast(hasUpdate ? 'موضوع بروزرسانی شد' : 'موضوع دانلود شد', { kind: 'success' });
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
          { className: 'catalog-row' },
          h(
            'div',
            { className: 'catalog-row__main' },
            h(
              'span',
              { className: 'catalog-row__title' },
              item.title,
              hasUpdate ? h('span', { className: 'badge badge--update' }, 'بروزرسانی') : null,
            ),
            h('span', { className: 'catalog-row__meta' }, item.description),
          ),
          btn,
        ),
      );
    }
    host.replaceChildren(
      rows.length > 0
        ? h('div', { className: 'st-card' }, rows)
        : emptyState(icon(ICON.check, 42), 'همه‌چیز به‌روزه', 'موضوع جدید یا بروزرسانی‌ای موجود نیست.'),
    );
  } catch (e) {
    host.replaceChildren(
      errorCard(e instanceof Error ? e.message : 'دریافت فهرست موضوعات ناموفق بود.', () =>
        void loadCatalogInto(host),
      ),
    );
  }
}
