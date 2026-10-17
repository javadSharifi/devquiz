/* ============================================================
 * DevQuiz — app/picker/first-run-picker.ts
 * Empty-state topic picker shown when no topics are downloaded.
 * Lets user multi-select from the catalog, then downloads them.
 * ============================================================ */

import { store } from '../../state.js';
import { h, button, emptyState, errorCard, toast, skeletonList } from '../../ui.js';
import { svgIcon } from '../../components/hyperscript.js';
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
import { ico } from '../../components/icons.js';

export function renderNoTopics(): HTMLElement {
  const wrap = h('div', { className: 'view view--picker' });
  wrap.appendChild(
    h('div', { className: 'picker-head' },
      h('div', { className: 'picker-head__logo', attrs: { 'aria-hidden': 'true' } }, ico('bolt', 30)),
      h('h2', { className: 'picker-head__title' }, 'از کجا شروع کنیم؟'),
      h('p', { className: 'picker-head__sub' }, 'یک یا چند موضوع را انتخاب کن تا سؤال‌هایش دانلود شود. بعداً هم می‌توانی موضوع‌های دیگر را اضافه کنی.'),
    ),
  );
  const grid = h('div', { className: 'pick-list', attrs: { role: 'list' } });
  wrap.appendChild(grid);
  const footer = h('div', { className: 'pick-bar' });
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
        emptyState(ico('inbox', 42), 'فهرست خالیه', 'فعلاً موضوعی برای دانلود موجود نیست.'),
      );
      return;
    }
    const selected = new Set<string>();
    const rows = new Map<string, HTMLButtonElement>();
    const summary = h('span', { className: 'pick-bar__summary' }, 'موضوعی انتخاب نشده');
    const downloadBtn = button('دانلود و شروع', () => void downloadSelected(), {
      variant: 'primary',
      className: 'pick-bar__go',
    });
    downloadBtn.disabled = true;
    const selectAllBtn = h(
      'button',
      { type: 'button', className: 'pick-bar__all', onClick: () => toggleAll() },
      'انتخاب همه',
    );

    function setRowSelected(id: string, on: boolean): void {
      const row = rows.get(id);
      if (!row) return;
      row.classList.toggle('pick-row--selected', on);
      row.setAttribute('aria-pressed', String(on));
    }

    function updateFooter(): void {
      const n = selected.size;
      downloadBtn.disabled = n === 0;
      summary.textContent = n === 0 ? 'موضوعی انتخاب نشده' : `${faNum(n)} موضوع انتخاب شده`;
      selectAllBtn.textContent = n === catalog.topics.length ? 'لغو انتخاب همه' : 'انتخاب همه';
    }

    function toggleAll(): void {
      const all = selected.size === catalog.topics.length;
      for (const item of catalog.topics) {
        if (all) selected.delete(item.id);
        else selected.add(item.id);
        setRowSelected(item.id, !all);
      }
      updateFooter();
    }

    function toggle(id: string): void {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      setRowSelected(id, selected.has(id));
      updateFooter();
    }

    function setRowStatus(id: string, text: string, cls: 'loading' | 'done' | 'error' | null): void {
      const row = rows.get(id);
      if (!row) return;
      row.classList.remove('pick-row--loading', 'pick-row--done', 'pick-row--error');
      if (cls) row.classList.add(`pick-row--${cls}`);
      const hint = row.querySelector<HTMLElement>('.pick-row__desc');
      if (hint && text) hint.textContent = text;
    }

    async function downloadSelected(): Promise<void> {
      if (selected.size === 0) return;
      downloadBtn.disabled = true;
      selectAllBtn.disabled = true;
      for (const row of rows.values()) row.disabled = true;
      let ok = 0;
      let done = 0;
      const total = selected.size;
      toast(`در حال دانلود ${faNum(total)} موضوع…`, { kind: 'info', duration: 2000 });
      for (const item of catalog.topics) {
        if (!selected.has(item.id)) continue;
        summary.textContent = `در حال دانلود ${faNum(done + 1)} از ${faNum(total)}…`;
        downloadBtn.replaceChildren(h('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }), ' صبر کن…');
        setRowStatus(item.id, 'در حال دانلود…', 'loading');
        try {
          await downloadTopic(item);
          ok++;
          setRowStatus(item.id, 'دانلود شد', 'done');
        } catch (e) {
          selected.delete(item.id);
          setRowSelected(item.id, false);
          setRowStatus(item.id, e instanceof Error ? e.message : 'دانلود ناموفق بود', 'error');
          toast(e instanceof Error ? e.message : `دانلود «${item.title}» ناموفق بود.`, { kind: 'error' });
        }
        done++;
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
        toast(`${faNum(ok)} موضوع دانلود شد`, { kind: 'success' });
        setTimeout(() => {
          store.dispatch({ type: 'SET_TAB', tab: 'game' });
          store.dispatch({ type: 'SELECT_LEVEL', level: null });
        }, 400);
      } else {
        for (const row of rows.values()) row.disabled = false;
        selectAllBtn.disabled = false;
        downloadBtn.replaceChildren('دانلود و شروع');
        updateFooter();
      }
    }

    const cards: HTMLElement[] = [];
    for (const item of catalog.topics) {
      const isDownloaded = store.getState().downloadedVersions[item.id] !== undefined;
      const row = h(
        'button',
        {
          className: `pick-row${isDownloaded ? ' pick-row--done' : ''}`,
          type: 'button',
          attrs: {
            'aria-label': `${isDownloaded ? 'دانلود شده: ' : 'انتخاب '}${item.title}`,
            'aria-pressed': 'false',
            role: 'listitem',
          },
          onClick: () => toggle(item.id),
        },
        h('span', { className: 'pick-row__icon' }, topicIconEl(item)),
        h(
          'span',
          { className: 'pick-row__text' },
          h('span', { className: 'pick-row__title' }, item.title),
          h('span', { className: 'pick-row__desc' }, item.description || 'سؤال‌های مصاحبه و مرور'),
        ),
        h('span', { className: 'pick-row__check', attrs: { 'aria-hidden': 'true' } }, svgIcon('M5 12l5 5 9-9', 14)),
      );
      rows.set(item.id, row);
      cards.push(row);
    }
    grid.replaceChildren(...cards);
    footer.replaceChildren(
      h('div', { className: 'pick-bar__info' }, summary, selectAllBtn),
      downloadBtn,
    );
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
