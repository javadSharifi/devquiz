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

export function renderTopicMgmtSection(state: AppState): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h3', { className: 'section-title' }, 'مدیریت بازی‌ها'));
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
  frag.appendChild(topicList);

  const catalogHost = h('div', { className: 'catalog-host' });
  frag.appendChild(
    button('➕ دریافت موضوعات جدید', () => void loadCatalogInto(catalogHost), {
      variant: 'ghost',
      className: 'btn--wide',
    }),
  );
  frag.appendChild(catalogHost);
  return frag;
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
