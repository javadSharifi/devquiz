import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { button } from '../src/components/button.js';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('button()', () => {
  it('builds a <button> with base + variant class', () => {
    const b = button('click me', () => {});
    expect(b.tagName).toBe('BUTTON');
    expect(b.className).toContain('btn');
    expect(b.className).toContain('btn--primary');
  });

  it('honors the variant class', () => {
    expect(button('x', () => {}, { variant: 'ghost' }).className).toContain('btn--ghost');
    expect(button('x', () => {}, { variant: 'danger' }).className).toContain('btn--danger');
    expect(button('x', () => {}, { variant: 'soft' }).className).toContain('btn--soft');
  });

  it('appends extra className when provided', () => {
    const b = button('x', () => {}, { className: 'btn--wide btn--big' });
    expect(b.className).toContain('btn btn--primary btn--wide btn--big');
  });

  it('sets disabled from opts', () => {
    expect(button('x', () => {}, {}).disabled).toBe(false);
    expect(button('x', () => {}, { disabled: true }).disabled).toBe(true);
  });

  it('always sets type=button', () => {
    expect(button('x', () => {}).type).toBe('button');
  });

  it('applies aria-label and title as attributes when provided', () => {
    const b = button('x', () => {}, { ariaLabel: 'حذف', title: 'tooltip' });
    expect(b.getAttribute('aria-label')).toBe('حذف');
    expect(b.getAttribute('title')).toBe('tooltip');
  });

  it('omits aria-label and title attributes when not provided', () => {
    const b = button('x', () => {});
    expect(b.hasAttribute('aria-label')).toBe(false);
    expect(b.hasAttribute('title')).toBe(false);
  });

  it('fires onClick when clicked', () => {
    let calls = 0;
    const b = button('x', () => calls++);
    dom.dispatchClick(b);
    expect(calls).toBe(1);
  });

  it('renders the label as text child', () => {
    const b = button('save', () => {});
    expect(b.childNodes).toHaveLength(1);
    expect((b.childNodes[0] as any).textContent).toBe('save');
  });

  it('returns a FakeElement typed as HTMLButtonElement', () => {
    expect(button('x', () => {})).toBeInstanceOf(FakeElement);
  });
});
