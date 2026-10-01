import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pickIcon, renderPriorityBadge } from '../src/lib/helpers.js';
import { installDomStub, type DomStub } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('pickIcon', () => {
  it('returns item.icon when defined and non-empty', () => {
    expect(pickIcon({ id: 'js', icon: '🟨' })).toBe('🟨');
  });

  it('returns fallback for known topic IDs', () => {
    expect(pickIcon({ id: 'javascript' })).toBe('🟨');
    expect(pickIcon({ id: 'typescript' })).toBe('🟦');
    expect(pickIcon({ id: 'react' })).toBe('⚛️');
    expect(pickIcon({ id: 'python' })).toBe('🐍');
    expect(pickIcon({ id: 'rust' })).toBe('🦀');
    expect(pickIcon({ id: 'go' })).toBe('🔵');
    expect(pickIcon({ id: 'css' })).toBe('🎨');
    expect(pickIcon({ id: 'html' })).toBe('🌐');
    expect(pickIcon({ id: 'sql' })).toBe('🗄️');
    expect(pickIcon({ id: 'docker' })).toBe('🐳');
    expect(pickIcon({ id: 'git' })).toBe('🔧');
  });

  it('returns default for unknown IDs', () => {
    expect(pickIcon({ id: 'unknown-topic' })).toBe('📘');
  });

  it('returns default for empty string icon', () => {
    expect(pickIcon({ id: 'unknown', icon: '' })).toBe('📘');
  });

  it('ignores fallback when icon is explicitly set to empty', () => {
    // icon is empty string — should fall through to fallback, then default
    expect(pickIcon({ id: 'no-such-id', icon: '' })).toBe('📘');
  });
});

describe('renderPriorityBadge', () => {
  it('returns null when priority is undefined or null', () => {
    expect(renderPriorityBadge(undefined)).toBeNull();
    expect(renderPriorityBadge(null)).toBeNull();
  });

  it('renders priority badge element with correct percentage and level class', () => {
    const el = renderPriorityBadge(8);
    expect(el).not.toBeNull();
    expect(el?.className).toContain('priority-badge');
    expect(el?.className).toContain('priority-badge--high');
    expect(el?.textContent).toContain('۸۰٪');
  });

  it('renders compact badge when compact option is true', () => {
    const el = renderPriorityBadge(9.5, { compact: true });
    expect(el?.className).toContain('priority-badge--compact');
    expect(el?.textContent).toBe('۹۵٪');
  });
});

