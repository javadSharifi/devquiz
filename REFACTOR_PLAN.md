# DevQuiz — REFACTOR_PLAN

Goal: incremental refactor of "god files" into focused modules. Preserve behavior. Keep all 125 tests green. No UI/UX change.

---

## 1. Current Architecture Issues

### God files (LOC)
| File | LOC | Responsibilities |
|------|-----|-----------------|
| `src/popup.ts` | 511 | App bootstrap, hydration, header render, nav render, main routing, smart re-render diff, store subscriptions, store→storage mirroring, keyboard shortcuts, theme/font DOM apply, no-topics picker view + grid + download loop, error fallback. |
| `src/storage.ts` | 448 | Mutex, chrome.storage typed wrapper, migrations, topic fetch+download+orphan cleanup, user-state CRUD, custom-question CRUD, gamification (streak/XP), session persistence, sync flags, settings helpers. |
| `src/ui.ts` | 341 | h() hyperscript, svgIcon, button, toast, skeleton, progressBar, progressRing, emptyState, errorCard, confirmDialog, xpFloat, confetti. |
| `src/features/game.ts` | 215 (was 331) | Game-flow router only. Delegates category-question list to `./game/cat-list.ts`. Still owns no-topic empty state, all-categories grid, topic switcher, flashcard screen, celebration, patchGameCard. |
| `src/features/settings.ts` | 310 | Topic mgmt, theme/font segmented controls, import/export file I/O + JSON validation, catalog loader with per-tile download. |
| `styles/styles.css` | 2032 | All visual rules for app, components, every feature. Single 2k-line file. |

### Cross-cutting smells
- `popup.ts` knows about every tab, every store→storage mirror, every diff branch, plus the empty-state picker UI (which is conceptually a feature).
- `storage.ts` mixes low-level `Mutex` + chrome wrapper with high-level domain operations (gamification, custom questions, session, sync flags).
- `game.ts` mutates DOM directly from a list-item callback (`setQState` recomputes progress and rewrites count text + bar width) — leaks view logic into a per-item handler.
- `settings.ts` mixes settings UI with import/export pipeline (file read, JSON parse, validation, write).
- `ui.ts` is a 340-line grab-bag; 10+ distinct concerns.

---

## 2. Proposed Target Architecture

### New layout (additive; no file deletion in step 1)
```
src/
├── app/
│   ├── bootstrap.ts          # init(): migrations → parallel read → HYDRATE → restore → mount
│   ├── router.ts             # renderMain(state), renderNav(state), NAV_ITEMS
│   ├── header.ts             # renderHeader() + updateHeaderStats()
│   ├── subscriptions.ts      # store.subscribe smart-diff + store.onAction mirrors
│   ├── keyboard.ts           # bindKeyboard() (RTL: Space/Enter/←/↓/→)
│   └── theme.ts              # applyFontSize(), applyTheme()
├── components/
│   ├── hyperscript.ts        # h() + svgIcon (small DOM util)
│   ├── button.ts
│   ├── toast.ts
│   ├── modal.ts              # confirmDialog()
│   ├── progress.ts           # progressBar + progressRing
│   ├── skeleton.ts           # skeleton + skeletonList
│   ├── feedback.ts           # emptyState + errorCard + xpFloat + confetti
│   └── flashcard.ts          # (unchanged)
├── services/
│   ├── storage/
│   │   ├── chrome-storage.ts # getLocal/setLocal/getSync/setSync, Mutex, locked()
│   │   ├── migrations.ts     # runMigrations()
│   │   ├── session.ts        # getSession/saveSession/clearSession
│   │   └── flags.ts          # sync flags: activeTopicId, onboardingDone, recentTopics, fontSize, theme
│   ├── data/
│   │   ├── topics.ts         # getTopics, getDownloadedVersions, downloadTopic, cleanupOrphanStates, removeTopic, resetTopicProgress
│   │   ├── user-states.ts    # getUserStates, setUserStateEntry
│   │   ├── custom-questions.ts # getCustomQuestions, addCustomQuestion, importCustomQuestions
│   │   └── gamification.ts   # getGamification, saveGamification, recordAnswer, revertXp
│   ├── api/
│   │   ├── topic-api.ts      # CATALOG_URL, fetchValidatedJson, fetchCatalog
│   │   └── detect-updates.ts # (already in background.ts; keep colocated)
│   └── backup/
│       └── backup-io.ts      # export/import JSON backup (settings)
├── features/
│   ├── game.ts               # render + patchGameCard only; no direct chrome calls
│   ├── game/
│   │   └── cat-list.ts       # renderCategoryList (per-item setState + progress recompute) — extracted helper
│   ├── all-games.ts
│   ├── review.ts
│   ├── add.ts
│   ├── settings.ts
│   ├── settings/
│   │   ├── segmented.ts      # segmentedGroup() helper
│   │   ├── theme-controls.ts # theme + fontSize section
│   │   ├── topic-mgmt.ts     # topic list + reset/delete confirm
│   │   └── backup.ts         # import/export pipeline (extracted from settings)
│   └── picker/
│       └── first-run-picker.ts # renderNoTopics + loadPickerInto (extracted from popup.ts)
├── lib/
│   ├── helpers.ts            # LEVEL_LABEL, ICON_FALLBACK, backButton, fieldRow, statChip, topicIconEl
│   ├── topic-utils.ts
│   ├── undo.ts
│   └── dom-patch.ts
├── state.ts
├── storage.ts                # re-exports from services/storage/* + services/data/* + services/api/*  (compat layer)
├── markdown.ts
├── types.ts
├── popup.ts                  # SHRUNK to: mount shell + bootstrap()
├── onboarding.ts             # unchanged
├── background.ts             # unchanged
└── chrome-shim.d.ts
```

### Architecture rules
- `features/*` only: receive `state`, build DOM, `dispatch()`. No `chrome.storage`, no `fetch`, no JSON parse of external files.
- `services/*` is the only layer allowed to touch `chrome.*` and `fetch()`. Pure-async functions returning typed values; no DOM.
- `components/*` is stateless DOM widgets. No `store`, no `chrome.*`. Callbacks only.
- `app/*` wires it all together. Single import surface for side effects.
- `lib/*` stays pure (no DOM, no chrome, no fetch). Testable in Node.
- `styles/` split mirrors `src/components/` and `src/features/` (see §5).

---

## 3. Migration Order

Each step is independent, end-to-end verifiable, behavior-preserving. After every step: `npm run typecheck && npm test`. Update `PROJECT_MAP.md` and tick checklist.

### Step 1 — `src/services/storage/chrome-storage.ts` + `mutex.ts` (low risk)
Extract `Mutex` class + `locked()` + `getLocal`/`setLocal`/`getSync`/`setSync` from `src/storage.ts`. Keep `storage.ts` re-exporting them.
- Add `test/chrome-storage.test.ts` covering Mutex lock/release/queue/timeout (lift from existing `test/storage.test.ts`).
- Risk: **low** — pure mechanical move, no behavior change.

### Step 2 — `src/services/api/topic-api.ts` (low risk)
Extract `CATALOG_URL` + `fetchValidatedJson` + `fetchCatalog` from `src/storage.ts`.
- Re-export from `storage.ts` for back-compat.
- No new tests needed (no public-API change).

### Step 3 — `src/services/data/{topics,user-states,custom-questions,gamification,session}.ts` (low risk)
Split the domain operations into per-bucket files. `src/storage.ts` becomes a thin re-export facade.
- All existing tests stay green; tests still import from `../src/storage.js`.
- Risk: **low** — pure file move, no signature changes.

### Step 4 — `src/services/storage/migrations.ts` + `flags.ts` (low risk)
Lift `runMigrations` and the sync-flag helpers (`get/setActiveTopicId`, `get/setOnboardingDone`, `get/saveRecentTopics`, `get/setFontSize`, `get/setTheme`).
- Re-export from `storage.ts`.

### Step 5 — `src/components/*` split from `src/ui.ts` (low–medium risk)
Carve `ui.ts` into 6 small files (see layout). `src/ui.ts` becomes a re-export barrel so existing imports keep working.
- New unit tests:
  - `test/button.test.ts` — className composition, disabled flag, ariaLabel
  - `test/toast.test.ts` — single-instance replace, action label render
  - `test/modal.test.ts` — confirmDialog resolves true/false
  - `test/progress.test.ts` — progressBar percent + a11y attrs
  - `test/skeleton.test.ts` — count + className
  - `test/hyperscript.test.ts` — h() tag/attrs/dataset/style/event wiring
- Risk: **low** — zero behavior change, just re-homing.

### Step 6 — `src/app/{bootstrap,header,router,subscriptions,keyboard,theme}.ts` (medium risk)
Split `popup.ts`:
- `bootstrap.ts` → `init()` (migrations → parallel read → HYDRATE → restore session → mount).
- `header.ts` → `renderHeader()` + `updateHeaderStats()` + module-level refs.
- `router.ts` → `renderMain()`, `renderNav()`, `NAV_ITEMS` constant.
- `subscriptions.ts` → `store.subscribe` smart diff + `store.onAction` mirrors.
- `keyboard.ts` → `bindKeyboard()`.
- `theme.ts` → `applyFontSize()`, `applyTheme()`.
- `picker/first-run-picker.ts` → `renderNoTopics()` + `loadPickerInto()`.
- `popup.ts` becomes:
  ```ts
  import { bootstrap } from './app/bootstrap.js';
  // mount shell
  void bootstrap();
  ```
- Risk: **medium** — most logic in one file; verify smart-diff produces identical render calls. Add `test/router.test.ts` for `NAV_ITEMS` + `renderMain` switch (mock `store`).

### Step 7 — `src/features/game/cat-list.ts` (medium risk)
Extract `renderCategoryList` from `game.ts`. Move the per-item `setQState` closure into a pure helper `applyCategoryItemState(itemEl, countEl, progressEl, newState, total, knownCount)` that mutates DOM. Improves testability; behavior identical.
- Add `test/cat-list-state.test.ts` for the helper (count + bar + border).
- Risk: **medium** — DOM-coupled helper; verify against existing visual snapshots.

### Step 8 — `src/features/settings/{segmented,theme-controls,topic-mgmt,backup}.ts` (medium risk)
Split `settings.ts`:
- `segmented.ts` → `segmentedGroup<T>()`.
- `theme-controls.ts` → theme + font section render.
- `topic-mgmt.ts` → topic list + reset/delete + `loadCatalogInto` (move from settings).
- `backup.ts` → file I/O + `isValidUserStates` + `isValidGamification` + `exportCustomQuestions`.
- `features/settings.ts` orchestrates sections, holds `renderSettings()`.
- Risk: **medium** — `loadCatalogInto` is the biggest piece; lift carefully.

### Step 9 — `styles/` split (low–medium risk)
Add `@import` chain in `styles/styles.css` so `popup.html` / `onboarding.html` keep loading a single file. Split files contain pure rule blocks; no selector renames, no value edits.
- `styles/variables.css` — `:root` tokens + theme data-attr overrides.
- `styles/base.css` — `html`, `body`, `app`, typography, glass, scrollbar, animations keyframes.
- `styles/layout/{app-shell,nav,header}.css` — `.app`, `.app-header`, `.brand*`, `.header-stats`, `.app-main`, `.view*`, `.bottom-nav`, `.nav-item*`.
- `styles/components/{buttons,flashcard,modal,toast,progress,skeleton,feedback}.css`.
- `styles/features/{game,settings,review,add,all-games,onboarding}.css`.
- After split, `styles/styles.css` reduces to:
  ```css
  @import url('./styles/variables.css');
  @import url('./styles/base.css');
  /* …one per file… */
  ```
- Risk: **low** — only file boundaries move. Visual regression check by manual popup walkthrough.

### Step 10 — Update `PROJECT_MAP.md` + add `CHANGELOG.md` entries (zero risk)
Document new layout, new test counts, new module responsibilities per step. Append to Change History in the existing format.

---

## 4. Completed Steps Checklist

- [x] Step 1: chrome-storage.ts + mutex extracted
- [x] Step 2: topic-api.ts extracted (CATALOG_URL + fetchValidatedJson + fetchCatalog)
- [x] Step 3: services/data/* extracted (topics, user-states, custom-questions, gamification, session)
- [x] Step 4: migrations.ts + flags.ts extracted; storage.ts now pure facade (no inline logic)
- [ ] Step 2: topic-api extracted
- [ ] Step 3: data/{topics,user-states,custom-questions,gamification} extracted
- [ ] Step 4: migrations.ts + flags.ts extracted
- [x] Step 5: components/* split (button, toast, modal, progress, skeleton, feedback, hyperscript) — 7 new files, ui.ts = 33-line barrel, 4 new test files (15+10+8+7 = 40 new tests). 178/178 green.
- [x] Step 6: app/* split (bootstrap, router, header, subscriptions, keyboard, theme, picker/first-run-picker) — popup.ts 511 → 30 lines. Smart-diff + storage mirror preserved byte-for-byte. 2 new test files (theme 6 + router 11 = 17 tests). 195/195 green.
- [ ] Step 6: app/* split (bootstrap, header, router, subscriptions, keyboard, theme, picker)
- [x] Step 7: features/game/cat-list extracted
- [ ] Step 8: features/settings/* split (segmented, theme-controls, topic-mgmt, backup)
- [x] Step 8: features/settings/* split — settings.ts 310 → 14 lines (renderSettings orchestrator only). New: segmented.ts (segmentedGroup), theme-controls.ts (renderDisplaySection + FONT/THEME consts), topic-mgmt.ts (renderTopicMgmtSection + loadCatalogInto + confirms), backup.ts (validators + buildBackupPayload + importBackupFromFile + renderBackupSection). New test file: settings-import-export.test.ts (20 tests: validators + import pipeline w/ FileReader + chrome.storage.local mock). 233/233 green across 18 test files.
- [x] Step 9: styles/ split — 2032-line `styles.css` → 17 focused files. Entry `styles.css` is now `@import`-only. Tokens + light override in `variables.css`; reset/glass/a11y in `base.css`; `layout/{app-shell,header,navigation}.css`; `components/{buttons,flashcard,markdown,modal,toast,progress,skeleton,feedback}.css`; `features/{game,settings,review,add,all-games,onboarding}.css`; `reduced-motion.css` last. Zero class renames, zero value edits (verified by diffing the 211 unique selectors). HTML files still link only `../styles/styles.css`. 233/233 green; typecheck clean.
- [x] Step 10: PROJECT_MAP.md updated (final `styles/` tree, expanded `styles/` folder responsibility, 19-row Core Files Reference entry for the split files, updated Styling approach section, Change History entries appended for Steps 7/8/9/10). REFACTOR_PLAN.md updated (this checklist + Refactor Completed section below). 233/233 green; typecheck clean.

---

## 5. Non-Goals (explicitly out of scope)

- No behavior change.
- No new features, no new UI, no new strings.
- No i18n extraction.
- No CSS value changes.
- No bundler changes (still native ESM).
- No removal of `src/storage.ts` re-exports until all internal call sites are migrated (compat shim stays in `storage.ts`).
- No rename of public actions or storage keys.

---

## 6. Risk Summary

| Step | Risk | Rollback |
|------|------|----------|
| 1–4 | low | `git revert` |
| 5 | low | barrel re-exports keep callers working |
| 6 | medium | smart-diff logic concentrated; verify with full test pass + manual tab walk |
| 7 | medium | DOM helper; unit test the helper, visual verify the list |
| 8 | medium | catalog loader is the chunkiest piece; test + manual verify |
| 9 | low | CSS split is purely structural; single `@import` chain preserves load order |
| 10 | zero | docs only |

---

## Refactor Completed

All 10 steps finished. The project went from 5 god files to a focused layered architecture with zero behavior change and a fully green test suite.

### Final architecture summary

**`src/` layers (single direction: app → features → components → lib; services is sibling to app, both depend on types/state):**
- `types.ts` + `state.ts` — domain models, reducer, PubSub store (unchanged)
- `services/` — the only layer allowed to touch `chrome.*` or `fetch()`
  - `storage/{chrome-storage,mutex,migrations,flags}` — chrome wrapper, mutex, schema, sync flags
  - `data/{topics,user-states,custom-questions,gamification,session}` — domain operations
  - `api/topic-api` — catalog fetch + 10s AbortController
- `app/` — wiring (bootstrap, router, header, subscriptions, keyboard, theme, picker)
- `features/` — views: `game/` (with `cat-list`), `settings/` (with segmented/theme-controls/topic-mgmt/backup)
- `components/` — stateless DOM widgets: hyperscript, button, toast, modal, progress, skeleton, feedback, flashcard
- `lib/` — pure helpers: helpers, topic-utils, cat-list-stats, undo, dom-patch
- `markdown.ts`, `onboarding.ts`, `background.ts` — unchanged
- `popup.ts` — 30 lines, mounts shell + calls `bootstrap(shell)`
- `storage.ts` — 58 lines, pure re-export facade
- `ui.ts` — 33 lines, compat barrel re-exporting `components/*`

**`styles/` split:** 17 focused files + 1 `@import`-only entry. Tokens in `variables.css`, reset/glass in `base.css`, layout under `layout/`, reusable widgets under `components/`, per-feature rules under `features/`, `reduced-motion.css` last.

### Test count

| | Files | Tests |
|---|-------|-------|
| **Before** | 9 | 125 |
| **After** | 18 | 233 |
| **Delta** | +9 | +108 |

All 233 tests pass in `npm test`; `npm run typecheck` clean.

### Files changed (LOC)
| File | Before | After |
|------|--------|-------|
| `src/popup.ts` | 511 | 30 |
| `src/storage.ts` | 448 | 58 |
| `src/ui.ts` | 341 | 33 |
| `src/features/game.ts` | 331 | 215 |
| `src/features/settings.ts` | 310 | 14 |
| `styles/styles.css` | 2032 | 32 (entry only) |

### Remaining technical debt (intentionally not addressed)
- `dist/*` is committed pre-built JS; nothing in this refactor changes the build pipeline, but committing the build output means consumers can `git clone` and run without a build step. A future cleanup could add `dist/` to `.gitignore` + a CI build step.
- `src/services/data/topics.ts` is the largest single service file (~200 lines) because `downloadTopic` + `cleanupOrphanStates` + `removeTopic` + `resetTopicProgress` share many helpers and chrome.storage mutex calls. Could be split further if it grows.
- `src/features/add.ts` mixes form layout with a small bit of validation. If a second custom-form view appears, lift the validation into `lib/`.
- No CSS preprocessor / CSS-in-JS. The `@import` chain works in browsers but ships multiple HTTP requests. For production a bundler could inline these; out of scope for this refactor.
- The smart-diff in `src/app/subscriptions.ts` is the most fragile piece of app code; it has tests for the helper but not for the diff itself. A future improvement would snapshot the diff tree and assert behavior on representative state transitions.
