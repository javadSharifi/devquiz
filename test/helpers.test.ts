import { describe, it, expect } from 'vitest';
import { pickIcon } from '../src/lib/helpers.js';

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
