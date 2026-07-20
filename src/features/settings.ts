import { h } from '../components/hyperscript.js';
import type { AppState } from '../state.js';
import { renderTopicMgmtSection } from './settings/topic-mgmt.js';
import { renderDisplaySection } from './settings/theme-controls.js';
import { renderBackupSection } from './settings/backup.js';

export function renderSettings(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--settings' });
  wrap.appendChild(h('h2', { className: 'view__title' }, 'تنظیمات'));
  wrap.appendChild(renderTopicMgmtSection(state));
  wrap.appendChild(renderDisplaySection(state));
  wrap.appendChild(renderBackupSection());
  return wrap;
}
