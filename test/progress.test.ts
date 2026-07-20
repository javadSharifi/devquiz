import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { progressBar, progressRing } from '../src/components/progress.js';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('progressBar()', () => {
  function fill(el: FakeElement): FakeElement {
    return el.childNodes[0] as FakeElement;
  }

  it('renders a progressbar role with correct aria attrs', () => {
    const bar = progressBar(3, 7);
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('7');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
  });

  it('sets fill width to rounded percent', () => {
    const bar = progressBar(1, 3);
    const f = fill(bar);
    expect(f.style.width).toBe('33%');
  });

  it('clamps percent to 0 when total is 0', () => {
    const bar = progressBar(0, 0);
    expect(fill(bar).style.width).toBe('0%');
  });

  it('aria-label includes Persian count text', () => {
    const bar = progressBar(2, 5);
    const label = bar.getAttribute('aria-label') ?? '';
    expect(label).toContain('۲');
    expect(label).toContain('۵');
    expect(label).toContain('پاسخ داده شده');
  });

  it('uses the progress class on the bar', () => {
    expect(progressBar(1, 2).className).toContain('progress');
  });
});

describe('progressRing()', () => {
  it('renders an SVG with track + fill circles and a percent label', () => {
    const wrap = progressRing(1, 4, 'red', 44);
    expect(wrap.className).toContain('ring-wrap');
    const svg = wrap.childNodes.find((n) => (n as FakeElement).tagName === 'SVG') as FakeElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('44');
    expect(svg.getAttribute('height')).toBe('44');
    const label = wrap.childNodes[1] as FakeElement;
    expect(label.className).toContain('ring__label');
    expect((label.childNodes[0] as any).textContent).toBe('۲۵٪');
  });

  it('uses provided color as fill stroke', () => {
    const wrap = progressRing(1, 2, 'var(--accent)', 44);
    const svg = wrap.childNodes[0] as FakeElement;
    const fill = svg.childNodes[1] as FakeElement;
    expect(fill.style.stroke).toBe('var(--accent)');
  });

  it('aria-label contains the rounded percent', () => {
    const wrap = progressRing(1, 4, 'red', 44);
    const label = wrap.getAttribute('aria-label') ?? '';
    expect(label).toContain('۲۵');
    expect(label).toContain('درصد');
  });
});
