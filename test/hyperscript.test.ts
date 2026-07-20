import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { h, svgIcon } from '../src/components/hyperscript.js';
import { installDomStub, type DomStub, FakeElement, FakeTextNode, FakeNode } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('h()', () => {
  it('creates an element with the requested tag', () => {
    const el = h('div');
    expect(el).toBeInstanceOf(FakeElement);
    expect(el.tagName).toBe('DIV');
  });

  it('sets className', () => {
    const el = h('span', { className: 'foo bar' });
    expect(el.className).toBe('foo bar');
  });

  it('applies attrs via setAttribute', () => {
    const el = h('input', { attrs: { type: 'text', 'aria-label': 'name' } });
    expect(el.getAttribute('type')).toBe('text');
    expect(el.getAttribute('aria-label')).toBe('name');
  });

  it('writes dataset keys to data-* attributes', () => {
    const el = h('div', { dataset: { viewport: 'card', role: 'list' } });
    expect(el.getAttribute('data-viewport')).toBe('card');
    expect(el.getAttribute('data-role')).toBe('list');
  });

  it('applies style via Object.assign on the style proxy', () => {
    const el = h('div', { style: { width: '50%', left: '10px' } });
    expect(el.style.width).toBe('50%');
    expect(el.style.left).toBe('10px');
  });

  it('wires on* event handlers as addEventListener', () => {
    let clicked = 0;
    const el = h('button', { onClick: () => clicked++ }, 'go');
    dom.dispatchClick(el);
    expect(clicked).toBe(1);
  });

  it('renders string children as text nodes', () => {
    const el = h('p', null, 'hello ', 42);
    expect(el.childNodes).toHaveLength(2);
    expect(el.childNodes[0]).toBeInstanceOf(FakeTextNode);
    expect((el.childNodes[0] as FakeTextNode).textContent).toBe('hello ');
    expect((el.childNodes[1] as FakeTextNode).textContent).toBe('42');
  });

  it('appends child elements (instanceof Node recognized)', () => {
    const inner = h('span', null, 'x');
    const outer = h('div', null, inner);
    expect(outer.childNodes).toHaveLength(1);
    expect(outer.childNodes[0]).toBe(inner);
  });

  it('flattens nested child arrays', () => {
    const a = h('span', null, 'a');
    const b = h('span', null, 'b');
    const el = h('div', null, [a, b]);
    expect(el.childNodes).toHaveLength(2);
  });

  it('skips null / undefined / false children', () => {
    const el = h('div', null, 'x', null, undefined, false, 'y');
    expect(el.childNodes).toHaveLength(2);
  });

  it('sets direct properties like id, disabled, value, href, type', () => {
    const el = h('input', { id: 'name', disabled: true, value: 'hi', type: 'email' });
    expect(el.id).toBe('name');
    expect(el.disabled).toBe(true);
    expect(el.value).toBe('hi');
    expect(el.type).toBe('email');
  });
});

describe('svgIcon()', () => {
  it('creates an SVG element with viewBox and aria-hidden', () => {
    const svg = svgIcon('M0 0');
    expect(svg).toBeInstanceOf(FakeElement);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses provided size for width/height', () => {
    const svg = svgIcon('M0 0', 32);
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('appends a path with the d attribute', () => {
    const svg = svgIcon('M1 2 L3 4');
    expect(svg.childNodes).toHaveLength(1);
    const path = svg.childNodes[0] as FakeElement;
    expect(path.getAttribute('d')).toBe('M1 2 L3 4');
  });
});

describe('instanceof Node across stub', () => {
  it('FakeElement is a FakeNode so h() appendChild path works', () => {
    const el = h('div', null, h('span'));
    expect(el.childNodes[0]).toBeInstanceOf(FakeNode);
  });
});
