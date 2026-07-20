/* ============================================================
 * test/dom-helpers.ts
 * Minimal DOM stub for vitest (node env, no DOM lib installed).
 * Supports exactly the surface our components touch:
 *  - createElement, createElementNS, createTextNode
 *  - className, style (Proxy), dataset (Proxy)
 *  - classList (add/remove/toggle/contains)
 *  - setAttribute / getAttribute / hasAttribute / removeAttribute
 *  - appendChild / remove
 *  - addEventListener + dispatch
 *  - instanceof Node (FakeNode is registered as globalThis.Node)
 * Used by hyperscript/button/progress/modal test files only.
 * ============================================================ */

export class FakeNode {
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  addEventListener(_name: string, _fn: EventListener): void { /* noop */ }
  appendChild<T extends FakeNode>(c: T): T {
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  replaceChildren(...nodes: FakeNode[]): void {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    for (const n of nodes) {
      n.parentNode = this;
      this.childNodes.push(n);
    }
  }
  remove(): void {
    if (this.parentNode) {
      const i = this.parentNode.childNodes.indexOf(this);
      if (i >= 0) this.parentNode.childNodes.splice(i, 1);
      this.parentNode = null;
    }
  }
}

type StyleRecord = Record<string, string | number> & { setProperty?: (prop: string, value: string) => void };
const styleProxyHandler = {
  get(target: StyleRecord, prop: string): unknown {
    if (prop === 'setProperty') {
      return (prop: string, value: string): void => { target[prop] = value; };
    }
    if (prop === 'getPropertyValue') {
      return (prop: string): string => {
        const v = target[prop];
        return v === undefined ? '' : String(v);
      };
    }
    return target[prop];
  },
  set(target: StyleRecord, prop: string, val: string | number): boolean {
    target[prop] = val;
    return true;
  },
};
const datasetProxyHandler = {
  get(target: StyleRecord, prop: string): string | number | undefined {
    return target[prop];
  },
  set(target: StyleRecord, prop: string, val: string | number): boolean {
    target[prop] = String(val);
    (this as any).host._attrs.set(`data-${prop}`, String(val));
    return true;
  },
};

export class FakeElement extends FakeNode {
  tagName = '';
  id = '';
  className = '';
  disabled = false;
  type = '';
  value = '';
  title = '';
  href = '';
  tabIndex = 0;
  innerHTML = '';
  textContent = '';
  style = new Proxy({} as StyleRecord, styleProxyHandler);
  private _datasetTarget: StyleRecord = {};
  dataset: Record<string, string | number> = new Proxy({} as StyleRecord, {
    get: (t, p: string) => t[p],
    set: (t, p: string, v: string | number) => {
      t[p] = String(v);
      this._attrs.set(`data-${p}`, String(v));
      return true;
    },
  }) as unknown as Record<string, string | number>;
  private _attrs = new Map<string, string>();
  private _classes = new Set<string>();
  private _listeners = new Map<string, EventListener[]>();

  classList = {
    add: (...names: string[]): void => {
      for (const n of names) {
        this._classes.add(n);
        this._syncClassName();
      }
    },
    remove: (...names: string[]): void => {
      for (const n of names) {
        this._classes.delete(n);
        this._syncClassName();
      }
    },
    contains: (name: string): boolean => this._classes.has(name),
    toggle: (name: string, force?: boolean): boolean => {
      const has = this._classes.has(name);
      const next = force === undefined ? !has : force;
      if (next) this._classes.add(name);
      else this._classes.delete(name);
      this._syncClassName();
      return next;
    },
  };

  private _syncClassName(): void {
    this.className = [...this._classes].join(' ');
  }

  setAttribute(name: string, value: string): void {
    this._attrs.set(name, value);
    if (name === 'class') this._classes = new Set(value.split(/\s+/).filter(Boolean));
    if (name === 'id') this.id = value;
    if (name === 'disabled') this.disabled = true;
  }
  getAttribute(name: string): string | null {
    return this._attrs.has(name) ? this._attrs.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this._attrs.has(name);
  }
  removeAttribute(name: string): void {
    this._attrs.delete(name);
    if (name === 'disabled') this.disabled = false;
  }
  addEventListener(name: string, fn: EventListener): void {
    const list = this._listeners.get(name) ?? [];
    list.push(fn);
    this._listeners.set(name, list);
  }
  dispatch(name: string, ev: any): void {
    for (const fn of this._listeners.get(name) ?? []) fn(ev);
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 100, height: 40 };
  }
  focus(): void { /* noop */ }
  querySelector(): FakeElement | null { return null; }
  querySelectorAll(): FakeElement[] { return []; }
}

export class FakeTextNode extends FakeNode {
  textContent: string;
  constructor(text: string) {
    super();
    this.textContent = text;
  }
}

function makeEl(tag: string, isSvg = false): FakeElement {
  const el = new FakeElement();
  el.tagName = tag.toUpperCase();
  (el as any).nodeType = isSvg ? 1 : 1;
  return el;
}

export interface DomStub {
  restore: () => void;
  body: FakeElement;
  dispatchClick: (el: FakeElement) => void;
  fireRaf: () => void;
}

export function installDomStub(): DomStub {
  const origGlobals: Record<string, unknown> = {};
  for (const k of ['Node', 'document', 'requestAnimationFrame', 'HTMLElement', 'HTMLButtonElement', 'SVGSVGElement', 'SVGCircleElement']) {
    origGlobals[k] = (globalThis as any)[k];
  }

  (globalThis as any).Node = FakeNode;
  (globalThis as any).HTMLElement = FakeElement;
  (globalThis as any).HTMLButtonElement = FakeElement;
  (globalThis as any).SVGSVGElement = FakeElement;
  (globalThis as any).SVGCircleElement = FakeElement;

  const body = new FakeElement();
  const documentElement = new FakeElement();
  const document: any = {
    createElement: (tag: string) => makeEl(tag),
    createElementNS: (_ns: string, tag: string) => makeEl(tag, true),
    createTextNode: (text: string) => new FakeTextNode(text),
    body,
    documentElement,
  };
  (globalThis as any).document = document;

  const rafQueue: FrameRequestCallback[] = [];
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };

  return {
    restore: () => {
      for (const [k, v] of Object.entries(origGlobals)) {
        if (v === undefined) delete (globalThis as any)[k];
        else (globalThis as any)[k] = v;
      }
    },
    body,
    documentElement,
    dispatchClick: (el) => el.dispatch('click', { target: el }),
    fireRaf: () => {
      while (rafQueue.length) (rafQueue.shift()!)(performance.now());
    },
  };
}
