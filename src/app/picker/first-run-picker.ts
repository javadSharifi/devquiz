/* ============================================================
 * DevQuiz — app/picker/first-run-picker.ts
 * Empty-state topic picker shown when no topics are downloaded.
 * Lets user multi-select from the catalog, then downloads them.
 * ============================================================ */

import { store } from '../../state.js';
import { h, button, emptyState, errorCard, toast, skeletonList } from '../../ui.js';
import { topicIconEl } from '../../lib/helpers.js';
import { faNum } from '../../types.js';
import {
  downloadTopic,
  fetchCatalog,
  getDownloadedVersions,
  getTopics,
  getUserStates,
  setActiveTopicId,
} from '../../storage.js';

export function renderNoTopics(): HTMLElement {
  const wrap = h('div', { className: 'view view--picker' });
  wrap.appendChild(
    h('div', { className: 'picker-head' },
      h('h2', { className: 'view__title' }, 'یه موضوع انتخاب کن'),
      h('p', { className: 'view__sub' }, 'روی هر کارت بزن تا انتخاب بشه، بعد «دانلود انتخاب‌شده‌ها» رو بزن'),
    ),
  );
  const grid = h('div', { className: 'topic-picker', attrs: { role: 'list' } });
  wrap.appendChild(grid);
  const footer = h('div', { className: 'picker-footer' });
  wrap.appendChild(footer);
  void loadPickerInto(grid, footer);
  return wrap;
}

async function loadPickerInto(grid: HTMLElement, footer: HTMLElement): Promise<void> {
  grid.replaceChildren(skeletonList(4, 'skeleton--card'));
  footer.replaceChildren();
  try {
    const existing = store.getState().catalog;
    const catalog = existing.length > 0 ? { topics: existing } : await fetchCatalog();
    if (existing.length === 0) {
      store.dispatch({ type: 'SET_CATALOG', catalog: catalog.topics });
    }
    if (catalog.topics.length === 0) {
      grid.replaceChildren(
        emptyState('📦', 'فهرست خالیه', 'فعلاً موضوعی برای دانلود موجود نیست.'),
      );
      return;
    }
    const selected = new Set<string>();
    const tiles = new Map<string, HTMLButtonElement>();
    const downloadBtn = button('دانلود انتخاب‌شده‌ها', () => void downloadSelected(), {
      variant: 'primary',
      className: 'btn--wide btn--big',
    });
    downloadBtn.disabled = true;
    const selectAllBtn = button('انتخاب همه', () => {
      for (const item of catalog.topics) {
        selected.add(item.id);
        tiles.get(item.id)?.classList.add('topic-tile--selected');
      }
      updateFooter();
    }, { variant: 'ghost', className: 'btn--wide' });

    function updateFooter(): void {
      const n = selected.size;
      downloadBtn.disabled = n === 0;
      downloadBtn.textContent = n === 0 ? 'دانلود انتخاب‌شده‌ها' : `دانلود ${faNum(n)} موضوع`;
    }

    function toggle(item: typeof catalog.topics[number]): void {
      if (selected.has(item.id)) {
        selected.delete(item.id);
        tiles.get(item.id)?.classList.remove('topic-tile--selected');
      } else {
        selected.add(item.id);
        tiles.get(item.id)?.classList.add('topic-tile--selected');
      }
      updateFooter();
    }

    async function downloadSelected(): Promise<void> {
      if (selected.size === 0) return;
      downloadBtn.disabled = true;
      selectAllBtn.disabled = true;
      for (const tile of tiles.values()) tile.disabled = true;
      let ok = 0;
      let total = selected.size;
      for (const item of catalog.topics) {
        if (!selected.has(item.id)) continue;
        downloadBtn.textContent = `دانلود ${faNum(ok + 1)} از ${faNum(total)}…`;
        const tile = tiles.get(item.id);
        if (tile) {
          const old = tile.querySelector<HTMLElement>('.topic-tile__icon');
          const next = h('span', { className: 'topic-tile__icon', attrs: { 'aria-hidden': 'true' } }, '⏳');
          if (old) old.replaceWith(next);
        }
        try {
          await downloadTopic(item);
          ok++;
          if (tile) tile.classList.add('topic-tile--done');
        } catch (e) {
          if (tile) tile.classList.remove('topic-tile--selected');
          toast(e instanceof Error ? e.message : `دانلود «${item.title}» ناموفق بود.`, { kind: 'error' });
        }
      }
      if (ok > 0) {
        const [topics, versions, us] = await Promise.all([getTopics(), getDownloadedVersions(), getUserStates()]);
        store.dispatch({ type: 'REPLACE_TOPICS', topics });
        store.dispatch({ type: 'REPLACE_DOWNLOADED_VERSIONS', versions });
        store.dispatch({ type: 'REPLACE_USER_STATES', userStates: us });
        const firstId = catalog.topics.find((t) => selected.has(t.id))?.id;
        if (firstId && !store.getState().activeTopicId) {
          void setActiveTopicId(firstId);
          store.dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: firstId });
        }
        store.dispatch({ type: 'DATA_CHANGED' });
        toast(`${faNum(ok)} موضوع دانلود شد ✅`, { kind: 'success' });
        setTimeout(() => {
          store.dispatch({ type: 'SET_TAB', tab: 'game' });
          store.dispatch({ type: 'SELECT_LEVEL', level: null });
        }, 400);
      } else {
        for (const tile of tiles.values()) tile.disabled = false;
        selectAllBtn.disabled = false;
        updateFooter();
      }
    }

    const cards: HTMLElement[] = [];
    for (const item of catalog.topics) {
      const isDownloaded = store.getState().downloadedVersions[item.id] !== undefined;
      const tile = h(
        'button',
        {
          className: `topic-tile glass${isDownloaded ? ' topic-tile--done' : ''}`,
          type: 'button',
          attrs: {
            'aria-label': `${isDownloaded ? 'دانلود شده: ' : 'انتخاب '}${item.title}`,
            'aria-pressed': 'false',
            role: 'listitem',
          },
          onClick: () => toggle(item),
        },
        h('span', { className: 'topic-tile__check', attrs: { 'aria-hidden': 'true' } }, '✓'),
        topicIconEl(item),
        h('span', { className: 'topic-tile__title' }, item.title),
      );
      tiles.set(item.id, tile);
      cards.push(tile);
    }
    grid.replaceChildren(...cards);
    footer.replaceChildren(selectAllBtn, downloadBtn);
    updateFooter();
  } catch (e) {
    grid.replaceChildren(
      errorCard(
        e instanceof Error ? e.message : 'دریافت فهرست موضوعات ناموفق بود.',
        () => void loadPickerInto(grid, footer),
      ),
    );
  }
}
