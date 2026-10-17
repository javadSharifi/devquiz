import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pickIcon, renderPriorityBadge } from '../src/lib/helpers.js';
import { installDomStub, type DomStub } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('pickIcon', () => {
  it('returns the image URL when the icon is a URL', () => {
    expect(pickIcon({ id: 'js', icon: 'https://example.com/js.svg' })).toBe('https://example.com/js.svg');
    expect(pickIcon({ id: 'js', icon: 'data:image/svg+xml;base64,AAA' })).toBe('data:image/svg+xml;base64,AAA');
  });

  it('returns empty string when there is no image URL (emoji or missing icons are ignored)', () => {
    expect(pickIcon({ id: 'javascript' })).toBe('');
    expect(pickIcon({ id: 'js', icon: '🟨' })).toBe('');
    expect(pickIcon({ id: 'unknown', icon: '' })).toBe('');
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

