import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { confirmDialog } from '../src/components/modal.js';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('confirmDialog()', () => {
  it('appends an overlay with role=dialog and aria-modal=true', () => {
    void confirmDialog('تأیید؟', 'پیام');
    expect(dom.body.childNodes).toHaveLength(1);
    const overlay = dom.body.childNodes[0] as FakeElement;
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-label')).toBe('تأیید؟');
  });

  it('resolves true when the confirm button is clicked', async () => {
    const p = confirmDialog('حذف', 'مطمئنی؟', 'حذف');
    dom.fireRaf();
    const overlay = dom.body.childNodes[0] as FakeElement;
    expect(overlay.classList.contains('overlay--in')).toBe(true);
    const modal = overlay.childNodes[0] as FakeElement;
    const actions = modal.childNodes[2] as FakeElement;
    const confirmBtn = actions.childNodes[1] as FakeElement;
    confirmBtn.dispatch('click', {});
    const result = await p;
    expect(result).toBe(true);
  });

  it('resolves false when the cancel button is clicked', async () => {
    const p = confirmDialog('حذف', 'مطمئنی؟', 'حذف');
    dom.fireRaf();
    const overlay = dom.body.childNodes[0] as FakeElement;
    const modal = overlay.childNodes[0] as FakeElement;
    const actions = modal.childNodes[2] as FakeElement;
    const cancelBtn = actions.childNodes[0] as FakeElement;
    cancelBtn.dispatch('click', {});
    const result = await p;
    expect(result).toBe(false);
  });

  it('resolves false when the overlay backdrop is clicked (target === overlay)', async () => {
    const p = confirmDialog('x', 'y');
    dom.fireRaf();
    const overlay = dom.body.childNodes[0] as FakeElement;
    overlay.dispatch('click', { target: overlay });
    const result = await p;
    expect(result).toBe(false);
  });

  it('does NOT close when clicking inside the modal (target !== overlay)', async () => {
    const p = confirmDialog('x', 'y');
    dom.fireRaf();
    const overlay = dom.body.childNodes[0] as FakeElement;
    const modal = overlay.childNodes[0] as FakeElement;
    let resolved = false;
    p.then(() => { resolved = true; });
    modal.dispatch('click', { target: modal });
    await Promise.resolve();
    expect(resolved).toBe(false);
  });

  it('uses default confirm label "تأیید" when none provided', () => {
    void confirmDialog('x', 'y');
    const overlay = dom.body.childNodes[0] as FakeElement;
    const modal = overlay.childNodes[0] as FakeElement;
    const actions = modal.childNodes[2] as FakeElement;
    const confirmBtn = actions.childNodes[1] as FakeElement;
    expect((confirmBtn.childNodes[0] as any).textContent).toBe('تأیید');
  });

  it('removes overlay after animation timeout', async () => {
    vi.useFakeTimers();
    const p = confirmDialog('x', 'y');
    const overlay = dom.body.childNodes[0] as FakeElement;
    const confirmBtn = (overlay.childNodes[0] as FakeElement).childNodes[2].childNodes[1] as FakeElement;
    confirmBtn.dispatch('click', {});
    vi.advanceTimersByTime(200);
    expect(dom.body.childNodes).toHaveLength(0);
    expect(await p).toBe(true);
    vi.useRealTimers();
  });
});
