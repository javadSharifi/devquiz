import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installDomStub, type DomStub, FakeElement } from './dom-helpers.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

const { fakeStore, gameMock, allGamesMock, reviewMock, addMock, settingsMock } = vi.hoisted(() => ({
  fakeStore: { getState: vi.fn() },
  gameMock: { renderGame: vi.fn(() => Object.assign(new FakeElement(), { _marker: 'game' })), patchGameCard: vi.fn(() => false) },
  allGamesMock: { renderAllGames: vi.fn(() => Object.assign(new FakeElement(), { _marker: 'all-games' })) },
  reviewMock: { renderReview: vi.fn(() => Object.assign(new FakeElement(), { _marker: 'review' })), pickRandomQuestion: vi.fn() },
  addMock: { renderAdd: vi.fn(() => Object.assign(new FakeElement(), { _marker: 'add' })) },
  settingsMock: { renderSettings: vi.fn(() => Object.assign(new FakeElement(), { _marker: 'settings' })) },
}));

vi.mock('../src/state.js', () => ({ store: fakeStore }));
vi.mock('../src/features/game.js', () => gameMock);
vi.mock('../src/features/all-games.js', () => allGamesMock);
vi.mock('../src/features/review.js', () => reviewMock);
vi.mock('../src/features/add.js', () => addMock);
vi.mock('../src/features/settings.js', () => settingsMock);
vi.mock('../src/lib/undo.js', () => ({ setLastFlashcard: vi.fn() }));

import { NAV_ITEMS, renderMain, renderNav, type AppShell } from '../src/app/router.js';

function makeShell(): AppShell {
  return {
    headerEl: new FakeElement(),
    mainEl: new FakeElement(),
    navEl: new FakeElement(),
    liveRegion: new FakeElement(),
  };
}

describe('NAV_ITEMS', () => {
  it('has 5 entries', () => {
    expect(NAV_ITEMS).toHaveLength(5);
  });

  it('covers all tabs in the expected order', () => {
    expect(NAV_ITEMS.map((n) => n.tab)).toEqual(['game', 'all-games', 'review', 'add', 'settings']);
  });

  it('each entry has tab, label, and icon string', () => {
    for (const item of NAV_ITEMS) {
      expect(typeof item.tab).toBe('string');
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.icon).toBe('string');
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('renderMain()', () => {
  it('returns the picker view when topics is empty', async () => {
    fakeStore.getState.mockReturnValue({ topics: {}, activeTab: 'game' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(shell.mainEl.childNodes.length).toBe(1);
    const only = shell.mainEl.childNodes[0] as FakeElement;
    expect(only.className).toContain('view--picker');
  });

  it('routes to renderGame for activeTab=game', async () => {
    const { renderGame } = await import('../src/features/game.js');
    fakeStore.getState.mockReturnValue({ topics: { t1: { meta: {} } }, activeTab: 'game' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(renderGame).toHaveBeenCalledTimes(1);
  });

  it('routes to renderAllGames for activeTab=all-games', async () => {
    const { renderAllGames } = await import('../src/features/all-games.js');
    fakeStore.getState.mockReturnValue({ topics: { t1: { meta: {} } }, activeTab: 'all-games' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(renderAllGames).toHaveBeenCalledTimes(1);
  });

  it('routes to renderReview for activeTab=review', async () => {
    const { renderReview } = await import('../src/features/review.js');
    fakeStore.getState.mockReturnValue({ topics: { t1: { meta: {} } }, activeTab: 'review' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(renderReview).toHaveBeenCalledTimes(1);
  });

  it('routes to renderAdd for activeTab=add', async () => {
    const { renderAdd } = await import('../src/features/add.js');
    fakeStore.getState.mockReturnValue({ topics: { t1: { meta: {} } }, activeTab: 'add' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(renderAdd).toHaveBeenCalledTimes(1);
  });

  it('routes to renderSettings for activeTab=settings', async () => {
    const { renderSettings } = await import('../src/features/settings.js');
    fakeStore.getState.mockReturnValue({ topics: { t1: { meta: {} } }, activeTab: 'settings' });
    const shell = makeShell();
    renderMain(fakeStore.getState(), shell);
    expect(renderSettings).toHaveBeenCalledTimes(1);
  });
});

describe('renderNav()', () => {
  it('renders a button per NAV_ITEM with correct aria-current', () => {
    fakeStore.getState.mockReturnValue({ activeTab: 'game' });
    const shell = makeShell();
    renderNav(shell);
    expect(shell.navEl.childNodes).toHaveLength(5);
    const buttons = shell.navEl.childNodes as FakeElement[];
    expect(buttons[0].getAttribute('aria-current')).toBe('page');
    expect(buttons[1].getAttribute('aria-current')).toBe('false');
  });

  it('marks the active item with nav-item--active class', () => {
    fakeStore.getState.mockReturnValue({ activeTab: 'settings' });
    const shell = makeShell();
    renderNav(shell);
    const buttons = shell.navEl.childNodes as FakeElement[];
    expect(buttons[4].className).toContain('nav-item--active');
    expect(buttons[0].className).not.toContain('nav-item--active');
  });
});
