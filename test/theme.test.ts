import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyFontSize, applyTheme } from '../src/app/theme.js';
import { installDomStub, type DomStub } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('applyTheme()', () => {
  it('sets data-theme="dark" on documentElement', () => {
    applyTheme('dark');
    expect(dom.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets data-theme="light" on documentElement', () => {
    applyTheme('light');
    expect(dom.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('applyFontSize()', () => {
  it('maps small → 12px', () => {
    applyFontSize('small');
    expect((dom.documentElement.style as any).getPropertyValue('--font-size')).toBe('12px');
  });

  it('maps medium → 14px', () => {
    applyFontSize('medium');
    expect((dom.documentElement.style as any).getPropertyValue('--font-size')).toBe('14px');
  });

  it('maps large → 16px', () => {
    applyFontSize('large');
    expect((dom.documentElement.style as any).getPropertyValue('--font-size')).toBe('16px');
  });

  it('maps extra → 18px', () => {
    applyFontSize('extra');
    expect((dom.documentElement.style as any).getPropertyValue('--font-size')).toBe('18px');
  });
});
