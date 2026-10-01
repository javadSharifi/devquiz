/* ============================================================
 * test/settings-view.test.ts
 * Tests for renderSettings view (account, topic-mgmt, theme, backup)
 * ============================================================ */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDomStub, type DomStub } from './dom-helpers.js';
import { renderSettings } from '../src/features/settings.js';
import type { AppState } from '../src/state.js';

let dom: DomStub;
beforeEach(() => { dom = installDomStub(); });
afterEach(() => { dom.restore(); });

describe('renderSettings()', () => {
  it('renders settings view without error in unauthenticated state', () => {
    const mockState = {
      activeTab: 'settings',
      topics: {
        git: {
          meta: { version: '1.0', topic: 'git', title: 'Git', lang: 'fa' },
          categories: [],
        },
      },
      catalog: [],
      downloadedVersions: { git: '1.0' },
      theme: 'dark',
      fontSize: 'medium',
      authUser: null,
      authToken: null,
      isSyncing: false,
      lastSyncedAt: null,
      customQuestions: [],
      userStates: {},
      gamification: { streak: 0, xp: 0, lastActiveDate: '' },
    } as unknown as AppState;

    const el = renderSettings(mockState);
    expect(el).toBeDefined();
    expect(el.className).toContain('view--settings');
  });

  it('renders settings view with authenticated user', () => {
    const mockState = {
      activeTab: 'settings',
      topics: {},
      catalog: [],
      downloadedVersions: {},
      theme: 'dark',
      fontSize: 'medium',
      authUser: { id: 'u1', email: 'test@example.com', name: 'جواد' },
      authToken: 'sample-token',
      isSyncing: false,
      lastSyncedAt: Date.now(),
      customQuestions: [],
      userStates: {},
      gamification: { streak: 0, xp: 0, lastActiveDate: '' },
    } as unknown as AppState;

    const el = renderSettings(mockState);
    expect(el).toBeDefined();
    expect(el.className).toContain('view--settings');
  });
});
