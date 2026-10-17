import { h } from '../components/hyperscript.js';
import type { AppState } from '../state.js';
import { renderTopicMgmtSection } from './settings/topic-mgmt.js';
import { renderDisplaySection } from './settings/theme-controls.js';
import { renderBackupSection } from './settings/backup.js';
import { renderAccountSection } from './settings/account.js';

export function renderSettings(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--settings' });
  wrap.appendChild(
    h(
      'header',
      { className: 'st-head' },
      h('h2', { className: 'st-head__title' }, 'تنظیمات'),
      h('p', { className: 'st-head__sub' }, 'حساب، بازی‌ها، ظاهر و پشتیبان‌گیری'),
    ),
  );
  wrap.appendChild(renderAccountSection(state));
  wrap.appendChild(renderTopicMgmtSection(state));
  wrap.appendChild(renderDisplaySection(state));
  wrap.appendChild(renderBackupSection());
  return wrap;
}
