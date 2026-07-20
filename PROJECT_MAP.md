# DevQuiz — PROJECT_MAP

Single source of truth for project structure, architecture, conventions.
Update this file whenever files/folders/components/modules/APIs/architecture change.

---

# Project Overview

**Purpose.** Browser extension (Chrome MV3) for practicing Persian technical-interview questions as a gamified flashcard game. Fully RTL, dark/light themes, streak/XP, 3D card flip, undo, celebration screens. Hosts no server of its own — questions are gist-hosted JSON fetched at runtime, validated, then cached in `chrome.storage.local`.

**Tech stack.**
- Language: TypeScript (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- Target: ES2022 modules (native ESM, no bundler required for runtime).
- UI: hand-rolled hyperscript `h()` in `src/components/hyperscript.ts` (re-exported from `src/ui.ts` compat barrel) — no framework. No `innerHTML` of untrusted strings; all content via `createTextNode` or the sanitizer.
- State: custom PubSub `Store` + reducer in `src/state.ts` (discriminated `Action` union).
- Persistence: `chrome.storage.local` (data) + `chrome.storage.sync` (tiny flags).
- Markdown: vendored `marked@18` (UMD classic script) + custom DOM-rebuild sanitizer (DOMPurify-equivalent config).
- Tests: Vitest (Node env, mock chrome globals).
- Build: tsc + optional esbuild (see `package.json`).

**Frameworks / libraries.**
- `marked@18` (vendored at `vendor/marked.umd.js`, MIT).
- Vazirmatn font (optional, drop-in to `assets/fonts/`).
- No DOMPurify in build (sanitizer reimplemented in `src/markdown.ts`); one-function swap to add it.
- No framework. No Tailwind. CSS is split by responsibility under `styles/` (entry `styles.css` only contains `@import`s; tokens in `variables.css`; reset/glass in `base.css`; layout under `layout/`; reusable widgets under `components/`; per-feature rules under `features/`; `reduced-motion.css` last).

**Architecture style.** Vanilla modular MV3 extension.
- 3 entry scripts: `popup` (game), `onboarding` (first-run), `background` (service worker).
- Shared core: `types` + `state` + `storage` + `markdown` + `ui`.
- `lib/` = pure helpers (topic merge, undo, viewport patch, icon helpers).
- `features/` = one module per top-level view (`game`, `all-games`, `review`, `add`, `settings`).
- `components/` = small reusable DOM widgets (flashcard).
- State is single source of truth; UI re-renders driven by `store.subscribe` with smart diff (granular `patchGameCard` for in-session card advance, full re-render otherwise).

---

# Project Structure

```
devquiz/
├── manifest.json            MV3 manifest — popup, SW, host perms, icons
├── package.json             scripts: build (esbuild) / build:tsc / typecheck / test
├── tsconfig.json            strict, ES2022, rootDir=src, outDir=dist
├── vitest.config.ts         test config (node env, setup file)
├── README.md                user-facing docs (install, build, architecture)
├── assets/
│   ├── icons/               16/48/128 PNGs (referenced by manifest)
│   └── fonts/README.md      Vazirmatn install notes
├── pages/
│   └── onboarding.html      first-run page, loads ../dist/onboarding.js
├── popup/
│   └── popup.html           main popup, loads marked (classic) + ../dist/popup.js
├── styles/
│   ├── styles.css           ENTRY: @imports only — loads variables/base/layout/components/features/reduced-motion
│   ├── variables.css        :root tokens (colors, radii, glows, type scale) + light theme override
│   ├── base.css             @font-face, reset, sr-only, focus-visible, .glass
│   ├── reduced-motion.css   @media (prefers-reduced-motion) — loaded last for cascade override
│   ├── layout/
│   │   ├── app-shell.css    .popup-body, .app, .app-main, .view*, .back-btn
│   │   ├── header.css       .app-header, .brand*, .header-stats, .stat*, stat-pulse keyframe
│   │   └── navigation.css   .bottom-nav, .nav-item*
│   ├── components/
│   │   ├── buttons.css      .btn + variants
│   │   ├── flashcard.css    3D-flip card + face* + act* + card-enter/exit keyframes
│   │   ├── markdown.css     .md + .code-ltr (LTR exception for <pre><code>)
│   │   ├── modal.css        .overlay + .modal*
│   │   ├── toast.css        .toast + .toast__action
│   │   ├── progress.css     .ring* + .progress / .progress__fill
│   │   ├── skeleton.css     .skeleton + shimmer keyframe
│   │   └── feedback.css     .celebrate + .stat-chip + .confetti + .xp-float + .empty + .error-card
│   └── features/
│       ├── game.css         .level-card, .cat-grid, .cat-card, .cat-list*, .topic-picker, .topic-tile*, .topic-chip*
│       ├── settings.css     .settings-group, .settings-row*, .seg*, .badge*, .spinner + spin keyframe
│       ├── review.css       .review-list, .review-item*
│       ├── add.css          .field, .field__input*, .field__err
│       ├── all-games.css    .recent-row, .recent-chip*, .game-card* + scrollbar
│       └── onboarding.css   .ob-body, .ob-hero, .ob-card*, .ob-finish
├── vendor/
│   └── marked.umd.js        vendored marked@18 (MIT, header preserved)
├── dist/                    build output (committed, loaded by HTMLs as ESM)
├── src/
│   ├── types.ts             domain models, Action union, runtime guards, faNum/faDigits
│   ├── state.ts             reducer + Store (PubSub) + debounced session persist
│   ├── storage.ts           compat facade: re-exports chrome-storage primitives + fetch
│   ├── services/
│   │   ├── storage/
│   │   │   ├── chrome-storage.ts  # Mutex + locked() + getLocal/setLocal/getSync/setSync
│   │   │   ├── mutex.ts           # async Mutex (5s auto-release)
│   │   │   ├── migrations.ts      # runMigrations() — schema v0→v1
│   │   │   └── flags.ts           # activeTopicId, onboardingDone, recentTopics, fontSize, theme
│   │   ├── api/
│   │   │   └── topic-api.ts       # CATALOG_URL + fetchValidatedJson + fetchCatalog (10s abort)
│   │   └── data/
│   │       ├── topics.ts          # getTopics/getDownloadedVersions/downloadTopic/cleanupOrphanStates/resetTopicProgress/removeTopic
│   │       ├── user-states.ts     # getUserStates/setUserStateEntry
│   │       ├── custom-questions.ts # getCustomQuestions/addCustomQuestion/importCustomQuestions
│   │       ├── gamification.ts    # getGamification/saveGamification/recordAnswer/revertXp
│   │       └── session.ts         # getSession/saveSession/clearSession
│   ├── markdown.ts          marked + DOM-rebuild sanitizer + LTR code wrapper
│   ├── ui.ts                COMPAT BARREL — re-exports components/* (h, button, toast, modal, progress, skeleton, feedback)
│   ├── chrome-shim.d.ts     ambient chrome.* types (offline build fallback)
│   ├── popup.ts             ENTRY POINT: mounts shell DOM, calls app/bootstrap.ts
│   ├── app/                 app wiring (depends on components/features/services)
│   │   ├── bootstrap.ts     init(): migrations → parallel reads → HYDRATE → restore → mount
│   │   ├── router.ts        NAV_ITEMS, renderNav(), renderMain(); AppShell type
│   │   ├── header.ts        initHeader(), renderHeader(), updateHeaderStats()
│   │   ├── subscriptions.ts store.subscribe smart-diff + store.onAction storage mirror
│   │   ├── keyboard.ts      bindKeyboard() RTL: Space/Enter flip, ← know, ↓ learn, → skip
│   │   ├── theme.ts         applyFontSize(), applyTheme()
│   │   └── picker/
│   │       └── first-run-picker.ts renderNoTopics() + loadPickerInto() (empty-state)
│   ├── onboarding.ts        first-run catalog grid + per-topic download
│   ├── background.ts        MV3 SW: chrome.alarms 24h catalog check → 🔔 badge
│   ├── components/
│   │   ├── hyperscript.ts   h() + svgIcon() — typed DOM utility, no state
│   │   ├── button.ts        button(label, onClick, opts) — variant + ariaLabel
│   │   ├── toast.ts         single-instance snackbar with optional action
│   │   ├── modal.ts         confirmDialog(title, msg, label) → Promise<boolean>
│   │   ├── progress.ts      progressBar + progressRing (SVG) with a11y attrs
│   │   ├── skeleton.ts      skeleton + skeletonList shimmer placeholders
│   │   ├── feedback.ts      emptyState, errorCard, xpFloat, confetti
│   │   └── flashcard.ts     3D-flip card DOM + applyFlip() patch
│   ├── features/
│   │   ├── game.ts          game flow router: no-topic / all-categories / flashcard / celebration
│   │   ├── game/
│   │   │   └── cat-list.ts  category-question list view + applyCategoryItemState DOM mutation
│   │   ├── all-games.ts     downloaded + available topics grid, update detection
│   │   ├── review.ts        learning list + 🎲 random question picker
│   │   ├── add.ts           custom-question form (existing or new category)
│   │   ├── settings.ts      ORCHESTRATOR: renderSettings() — delegates to settings/*
│   │   └── settings/
│   │       ├── segmented.ts       segmentedGroup<T>() radio builder
│   │       ├── theme-controls.ts  renderDisplaySection() + FONT/THEME constants
│   │       ├── topic-mgmt.ts      topic list + catalog loader + reset/delete confirms
│   │       └── backup.ts          import/export pipeline + validators + renderBackupSection()
│   └── lib/
│       ├── helpers.ts       LEVEL_LABEL, ICON_FALLBACK, backButton, fieldRow, statChip
│       ├── topic-utils.ts   getMergedTopic (cached), findQuestion, stats, buildQueue
│       ├── cat-list-stats.ts pure: STATE_COLORS, computeKnownCount, computeProgress
│       ├── undo.ts          answerCurrentCard / answerRandomCard / undoLastAnswer + XP table
│       └── dom-patch.ts     viewport()/patchViewport() granular DOM updates
└── test/
    ├── setup.ts                mock chrome.storage/action/alarms/runtime for Node tests
    ├── state.test.ts           reducer purity + action coverage (19 tests)
    ├── state-extra.test.ts     remaining 7 reducer actions + edges (14 tests)
    ├── topic-utils.test.ts     levelStats / categoryStats (10 tests)
    ├── topic-utils-extra.test.ts  isEligibleForQueue (5 tests)
    ├── undo.test.ts            XP_PER_STATE table (5 tests)
    ├── types.test.ts           compareVersions, faNum, faDigits, date, guards (52 tests)
    ├── helpers.test.ts         pickIcon (5 tests)
    ├── storage.test.ts         Mutex locking logic (13 tests)
    ├── gamification.test.ts    getGamification defaults + recordAnswer/revertXp (7 tests)
    ├── background.test.ts      detectUpdates pure function (8 tests)
    ├── hyperscript.test.ts     h() element/attrs/dataset/style/events + svgIcon (15 tests)
    ├── button.test.ts          variant classes, disabled, aria, onClick (10 tests)
    ├── progress.test.ts        progressBar percent + a11y, progressRing SVG (8 tests)
    ├── modal.test.ts           confirmDialog true/false/backdrop/timer (7 tests)
    ├── theme.test.ts           applyTheme + applyFontSize mapping (6 tests)
    ├── router.test.ts          NAV_ITEMS + renderMain tab routing + renderNav (11 tests)
    └── cat-list-state.test.ts  STATE_COLORS, computeKnownCount, computeProgress, applyCategoryItemState (18 tests)
    └── settings-import-export.test.ts  isValidUserStates/Gamification, buildBackupPayload, importBackupFromFile (20 tests)
```

## Folder responsibilities

**`src/`** — all TypeScript source. The only place new code goes. Flat subfolders:
- `components/` — reusable DOM widgets consumed by multiple features. Keep them stateless; pass callbacks.
- `features/` — one file per top-level view. Each exports a `renderX(state)` returning an `HTMLElement`. Dispatch actions; never call storage directly.
- `lib/` — pure or near-pure helpers, no rendering, no DOM (except `dom-patch.ts`). Can be tested in Node.

**`dist/`** — committed pre-built JS. HTML files reference `../dist/*.js` directly as native ESM. Rebuild with `npm run build` or `npm run build:tsc`.

**`pages/` + `popup/`** — HTML entry points. Both `dir="rtl" lang="fa"`. Both link `../styles/styles.css`. `popup.html` also loads `vendor/marked.umd.js` as a classic script before the ES module so `window.marked` exists.

**`styles/`** — single hand-authored stylesheet. CSS custom properties for theme tokens (`--accent`, `--junior`, `--mid`, `--senior`, `--danger`, etc.) and font size (`--font-size`). Per-feature class names: `.view--game`, `.cat-card`, `.flashcard`, `.review-item`, `.stat-chip`, `.toast`, `.modal`, `.celebrate`.

**`vendor/`** — third-party code committed to the repo so the build works offline. MIT license preserved in-file.

**`assets/icons/`** — three PNG sizes referenced by `manifest.json`.

**`assets/fonts/`** — optional Vazirmatn; without it, falls back to Tahoma/Segoe UI.

**`test/`** — Vitest suites (18 test files, 233 tests). Pure unit tests in Node env. `setup.ts` mocks `chrome.storage`, `chrome.action`, `chrome.alarms`, `chrome.runtime`. DOM-touching component tests use the in-test stub in `test/dom-helpers.ts` (FakeNode/FakeElement/FakeTextNode + document shim) — no DOM library needed. Prioritizes testing pure functions (reducer, type guards, utils, Mutex); also covers h(), button, progress, modal, theme, router, cat-list primitives, and settings backup IO (FileReader + chrome.storage.local.set mock).

---

# Application Flow

## Entry points

| Page | File | Purpose |
|------|------|---------|
| Popup (default action) | `popup/popup.html` → `dist/popup.js` (`src/popup.ts`) | Main app: 5 tabs (game, all-games, review, add, settings). |
| Onboarding | `pages/onboarding.html` → `dist/onboarding.js` (`src/onboarding.ts`) | First-run page: fetch catalog, download ≥1 topic, unlock «شروع». |
| Background SW | `dist/background.js` (`src/background.ts`) | `chrome.alarms` 24h catalog check, lights action badge on updates. |

## Boot sequence (popup)

1. `popup.ts` mounts header + nav + mainEl with skeleton placeholders.
2. `init()` runs:
   - `runMigrations()` — ensures `schema_version` + base keys exist.
   - Parallel read: topics, userStates, customQuestions, downloadedVersions, gamification, activeTopic, session, recentTopics.
   - `HYDRATE` dispatch with payload.
   - Resolve `activeTopicId` (saved sync value, else first downloaded).
   - `SET_ACTIVE_TOPIC` dispatch.
   - Load fontSize + theme, apply to `<html>`.
   - If a valid `session` exists for the active topic, `RESTORE` its snapshot.
3. `renderHeader()` + `renderNav()` + `renderMain(state)`.
4. `bindKeyboard()` — RTL-aware shortcuts while a flashcard is mounted.
5. `fetchCatalog()` in background; result dispatched as `SET_CATALOG`.
6. `visibilitychange` → `store.flushPersist()` to save session before popup closes.
7. `store.subscribe` performs smart re-render diffing (see "Rendering" below).
8. `store.onAction` mirrors certain actions to storage (SET_USER_STATE, SET_GAMIFICATION, ADD_CUSTOM_QUESTION, SET_ACTIVE_TOPIC, SET_FONT_SIZE, SET_THEME).

## Routing

There is no router. Tabs are a discriminated union: `'game' | 'all-games' | 'review' | 'add' | 'settings'`. Navigation is a state action (`SET_TAB`) handled in `popup.ts` `renderMain()`. The bottom nav updates on tab change. Browser back behavior is not modeled.

## State management

- One singleton `Store` instance exported from `src/state.ts`.
- `reduce(state, action): state` is a pure switch over the discriminated `Action` union.
- `dispatch(action)` mutates internal state, notifies listeners, schedules debounced session persist (300ms).
- `flushPersist()` writes the session immediately (called on `visibilitychange: hidden`).
- `onAction(handler)` is a separate side-effect channel: storage writes happen here so the reducer stays pure.
- `dataRevision` counter increments on `DATA_CHANGED`; `getMergedTopic()` caches by `(dataRevision, topicId)`.

## Data fetching

- Single `fetchValidatedJson<T>(url, guard)` in `src/storage.ts`: 10s `AbortController` timeout, `cache: "no-cache"`, runtime validation via type guard, Persian error messages.
- `fetchCatalog()` → `TopicCatalog`.
- `downloadTopic(item)` → fetch + validate + persist + orphan-state cleanup, all under a `Mutex`.
- All network lives in `storage.ts`. Other modules import the typed wrappers; no direct `fetch()` outside `storage.ts`.

## Authentication

None. Extension is local-only; identity is implicit (per Chrome profile).

## API communication

- Outbound: only `fetch()` against `https://gist.githubusercontent.com/*` (granted in `host_permissions`).
- `chrome.storage.local` (large blobs: topics, user_states, custom_questions, downloaded_versions, session, gamification, schema_version, font_size, theme, recent_topics).
- `chrome.storage.sync` (tiny flags only: `active_topic`, `onboarding_done`).
- `chrome.alarms` for the SW 24h check.
- `chrome.action.setBadgeText` / `setBadgeBackgroundColor` for the update bell.
- `chrome.runtime.onInstalled` / `onStartup` to install the alarm.

## Error handling

- All `fetch` failures throw a Persian `Error` (network/timeout/parse/validation).
- Popups render `errorCard(msg, onRetry)` from `src/components/feedback.ts` (re-exported via `src/ui.ts` compat barrel) for unreadable storage or rendering exceptions.
- Topic downloads that fail toast an error and keep the tile in "not selected" state; the rest of the batch still runs.
- All chrome.storage mutations happen inside an async `Mutex` (`storage.ts`) to serialize read-modify-write. 5s acquire timeout prevents deadlocks.
- Type guards (`isTopic`, `isCustomQuestionArray`, etc.) prevent malformed data from being persisted.

## Rendering

`store.subscribe` in `popup.ts` runs a smart diff on (prev, next) state to choose the cheapest re-render:

1. fontSize/theme changed in settings → full `renderMain` (to apply CSS vars).
2. activeTab changed → `renderNav` + `renderMain`; clear action badge when entering settings.
3. gamification changed → `updateHeaderStats` only (pulse the XP cell).
4. activeTopicId / selectedLevel / selectedCategoryId / dataRevision / topics / catalog changed → `renderMain`.
5. In-game card advance (same tab, same category, idx or queue changed) → try `patchGameCard` (granular `data-viewport` swap); fall back to full `renderMain` if it can't patch.
6. randomQuestionId / queue / index changed outside the game tab → `renderMain`.
7. isFlipped changed → `applyFlip` (toggles the `.flashcard--flipped` class without rebuilding the card).

---

# Core Files Reference

| File | Purpose | Related Files |
|------|---------|---------------|
| `manifest.json` | MV3 manifest: popup, SW, icons, host perms (`gist.githubusercontent.com`), permissions (`storage`, `alarms`, `unlimitedStorage`). | `popup/popup.html`, `dist/background.js`, `assets/icons/*` |
| `popup/popup.html` | Main popup shell. Loads `vendor/marked.umd.js` (classic) + `dist/popup.js` (ESM). | `src/popup.ts`, `vendor/marked.umd.js`, `dist/popup.js` |
| `pages/onboarding.html` | First-run page shell. Loads `dist/onboarding.js`. | `src/onboarding.ts` |
| `src/types.ts` | Domain models (`Question`, `Category`, `Topic`, `CustomQuestion`, `Gamification`, `SessionSnapshot`), discriminated `Action` union, runtime type guards, `faNum`/`faDigits`/`stateKey`/`localDateString`/`compareVersions`. | every other `src/*` file |
| `src/state.ts` | `reduce()`, `Store` (PubSub + debounced session persist), singleton `store`. Persists session on every dispatch (300ms debounce) and on `flushPersist`. | `src/storage.ts`, `src/types.ts`, all `features/*` |
| `src/storage.ts` | Pure compatibility facade. Re-exports every symbol from `src/services/{storage,api,data}/`. No inline logic. | `src/services/**` |
| `src/services/storage/mutex.ts` | Lightweight async `Mutex` (5s auto-release). Pure class, no chrome dependency. | `src/services/storage/chrome-storage.ts` |
| `src/services/storage/chrome-storage.ts` | `getLocal` / `setLocal` / `getSync` / `setSync` + `locked()` (Mutex wrapper). | `src/services/storage/mutex.ts`, `src/storage.ts` |
| `src/services/storage/migrations.ts` | `runMigrations()` — v0→v1 ensures all base containers (`topics`, `user_states`, `custom_questions`, `downloaded_versions`) exist with the right shape before first use. | `src/services/storage/chrome-storage.ts`, `src/types.ts` |
| `src/services/storage/flags.ts` | Tiny persistence for `activeTopicId` (sync), `onboardingDone` (sync), `recentTopics` / `fontSize` / `theme` (local). Imports the `isTheme` guard to validate stored values. | `src/services/storage/chrome-storage.ts`, `src/types.ts` |
| `src/services/api/topic-api.ts` | `CATALOG_URL` + `fetchValidatedJson<T>(url, guard)` (10s `AbortController`, `cache: "no-cache"`, runtime validation, Persian errors) + `fetchCatalog()`. The ONLY module allowed to call `fetch()`. | `src/types.js`, `src/storage.ts` |
| `src/services/data/topics.ts` | Topic download + persistence: `getTopics` / `getDownloadedVersions` / `downloadTopic` (gated by `locked`) / `cleanupOrphanStates` / `resetTopicProgress` / `removeTopic` (also clears active topic). | `src/services/api/topic-api.js`, `src/services/storage/flags.js`, `src/services/data/user-states.js`, `src/services/data/custom-questions.js` |
| `src/services/data/user-states.ts` | `getUserStates` / `setUserStateEntry` (single-entry mutate under `locked`). | `src/services/storage/chrome-storage.js`, `src/types.js` |
| `src/services/data/custom-questions.ts` | `getCustomQuestions` / `addCustomQuestion` / `importCustomQuestions` (validates with `isCustomQuestionArray`, dedupes by id). | `src/services/storage/chrome-storage.js`, `src/types.js` |
| `src/services/data/gamification.ts` | `getGamification` (returns a fresh clone of the default to avoid shared-mutation) / `saveGamification` / `recordAnswer` (advances daily streak at most once per local day) / `revertXp` (subtracts without touching streak). | `src/services/storage/chrome-storage.js`, `src/types.js` |
| `src/services/data/session.ts` | `getSession` / `saveSession` / `clearSession` (popup closes on outside-click → snapshot must be flushed on `visibilitychange`). | `src/services/storage/chrome-storage.js`, `src/types.js` |
| `src/markdown.ts` | `renderMarkdown(md)`: marked → DOMParser → whitelist sanitizer → rebuild tree. `<pre>` wrapped in `div.code-ltr dir="ltr"`. No `innerHTML` of untrusted content. | `src/components/flashcard.ts`, `src/features/*` |
| `src/ui.ts` | **Compat barrel.** Re-exports every symbol from `src/components/*` so existing `from '../ui.js'` imports keep working. New code should import from the focused component file. | every feature/component |
| `src/components/hyperscript.ts` | `h()` hyperscript (tag, props, children), `svgIcon(path, size)`. `HProps` / `Child` types. | every component/feature |
| `src/components/button.ts` | `button(label, onClick, opts)` — variant classes (`primary`/`ghost`/`danger`/`soft`), ariaLabel, title, disabled, custom className. Always `type="button"`. | every feature |
| `src/components/toast.ts` | `toast(message, opts)` — single-instance snackbar, replaces prior; optional action; default 4s; `toast--in` enter class. | every feature |
| `src/components/modal.ts` | `confirmDialog(title, msg, label)` → `Promise<boolean>` — glassmorphism overlay, backdrop click → false, cancel/confirm buttons. | features (settings) |
| `src/components/progress.ts` | `progressBar(done, total)` with `aria-valuemin/max/now`; `progressRing(done, total, color, size=44)` SVG with track+fill circles + percent label. | features (game, review) |
| `src/components/skeleton.ts` | `skeleton(className)` + `skeletonList(count, className)` shimmer placeholders. | features (popup, onboarding) |
| `src/components/feedback.ts` | `emptyState(emoji, title, desc, action?)`, `errorCard(msg, onRetry)`, `xpFloat(anchor, amount)` (+XP indicator), `confetti(host, count=36)` (CSS-animated pieces). | features (game, all-games, settings) |
| `src/popup.ts` | **Entry point only.** Mounts the 4 shell elements (`headerEl`, `mainEl`, `navEl`, `liveRegion`) and skeleton placeholders, then calls `bootstrap(shell)` from `src/app/bootstrap.ts`. All wiring (init flow, header render, nav, main routing, smart-diff, keyboard, theme, picker, storage mirroring) lives under `src/app/`. 30 lines. | `src/app/bootstrap.ts` |
| `src/app/bootstrap.ts` | `bootstrap(shell)`: `runMigrations` → 8-way parallel read → `HYDRATE` → resolve `activeTopicId` → load+apply fontSize/theme → `RESTORE` session → `renderHeader/renderNav/renderMain` → `bindKeyboard` → background `fetchCatalog` → `visibilitychange` → `installSubscriptions`. | every `app/*` |
| `src/app/router.ts` | `NAV_ITEMS` (5 tabs), `renderNav(shell)`, `renderMain(state, shell)`, `AppShell` type, re-exports `patchGameCard`. Smart-diff in `subscriptions.ts` calls these. | features + `app/subscriptions` |
| `src/app/header.ts` | `initHeader(shell)` caches `headerEl`; `renderHeader()` builds brand + streak/XP cells; `updateHeaderStats()` pulses XP on `gamification` change. | `app/subscriptions` |
| `src/app/subscriptions.ts` | `installSubscriptions(shell)` — exact pre-refactor `store.subscribe` smart-diff + `store.onAction` storage mirrors (SET_USER_STATE / SET_GAMIFICATION / ADD_CUSTOM_QUESTION / SET_ACTIVE_TOPIC / SET_FONT_SIZE / SET_THEME). No behavior change. | `app/router`, `app/header`, `app/theme` |
| `src/app/keyboard.ts` | `bindKeyboard(shell)` — document-level `keydown` listener; ignores INPUT/TEXTAREA/SELECT/contentEditable; Space/Enter flip; RTL ←/↓/→ act when flashcard is flipped. | `lib/undo`, `features/review` |
| `src/app/theme.ts` | `applyFontSize(size)` (small=12px/medium=14px/large=16px/extra=18px → `--font-size`); `applyTheme(theme)` → `data-theme` on `<html>`. | `app/bootstrap`, `app/subscriptions` |
| `src/app/picker/first-run-picker.ts` | `renderNoTopics()` → skeleton + grid + footer (kicks off `loadPickerInto`); `loadPickerInto` fetches catalog, renders multi-select grid, downloads selected topics in a loop, refreshes store, dispatches `DATA_CHANGED`, jumps to game tab. | `app/router` |
| `src/onboarding.ts` | First-run: `boot()` (migrations, theme), `loadCatalog()` (grid of topics with download button + per-tile state), `finish()` (sets `onboarding_done` + close window). | `src/storage.ts`, `src/ui.ts` |
| `src/background.ts` | MV3 service worker. `ensureAlarm` (5min initial, then 24h). `detectUpdates(versions, topics)` (pure, exported for test) compares downloaded versions vs catalog; `checkForUpdates` wraps it + sets action badge 🔔 if newer. Schedules 30min retry alarm on fetch failure. | `src/storage.ts`, `src/types.ts` |
| `src/components/flashcard.ts` | `buildFlashcard(question, level, flipped, onAnswer)` (3D-flip DOM with front/back faces + 3 action buttons). `applyFlip(flipped, mainEl, liveRegion)` (toggle class + aria + live region). | `src/components/hyperscript.ts`, `src/components/button.ts`, `src/markdown.ts`, `src/lib/undo.ts` |
| `src/features/game.ts` | Game flow router only: `renderGame` dispatches to no-topic empty state, `renderAllCategories` (all-cats grid, no level filter), `renderCategoryList` (from `./game/cat-list.ts`), or `renderFlashcardScreen` (3D card) → `renderCelebration` (confetti). `patchGameCard` does granular in-session card advance. Topic switcher chips when ≥2 topics. | `src/features/game/cat-list.ts`, `src/components/flashcard.ts`, `src/lib/topic-utils.ts`, `src/lib/undo.ts`, `src/lib/helpers.ts`, `src/lib/dom-patch.ts` |
| `src/features/game/cat-list.ts` | Category-question list view: collapsible per-question rows, inline answer (markdown), per-item state set (know / want_to_learn / skip) with live progress bar + count update via `applyCategoryItemState()`. No chrome.* access; dispatches only. | `src/lib/cat-list-stats.ts`, `src/lib/topic-utils.ts`, `src/markdown.ts`, `src/components/*` |
| `src/lib/cat-list-stats.ts` | Pure helpers for cat-list: `STATE_COLORS` (know→`--junior`, want_to_learn→`--mid`, skip/unseen→`--danger`), `computeKnownCount(questions, userStates, topicId)`, `computeProgress(known, total, fmt)` → `{text, widthPct}`. No DOM, no chrome. | `src/features/game/cat-list.ts`, `src/types.ts` |
| `src/features/all-games.ts` | Catalog grid split into downloaded / not-downloaded, with update detection via `compareVersions`. Per-card download, inflight set to prevent double-clicks. | `src/lib/topic-utils.ts`, `src/lib/helpers.ts` |
| `src/features/review.ts` | "Review" tab: 🎲 random-question button (excludes `know` + already-seen-this-batch; resets seen when pool exhausts) + "learning list" of `want_to_learn` + `skip` questions across all topics. | `src/components/flashcard.ts`, `src/lib/topic-utils.ts`, `src/lib/undo.ts` |
| `src/features/add.ts` | Add-question form: topic select, category select (with "new category" branch that auto-allocates `categoryId = "custom-cat-<uuid>"`), level select, question/answer textareas (≥5/≥3 char validation), persists to `custom_questions` and dispatches `ADD_CUSTOM_QUESTION` + `DATA_CHANGED`. | `src/lib/topic-utils.ts`, `src/lib/helpers.ts` |
| `src/features/settings.ts` | Settings tab orchestrator. Delegates to `src/features/settings/{topic-mgmt,theme-controls,backup}.ts` + `segmented.ts`. | `src/features/settings/**` |
| `src/features/settings/segmented.ts` | Generic `segmentedGroup<T>()` radio-group builder (used by theme + font). | `src/components/hyperscript.ts` |
| `src/features/settings/theme-controls.ts` | `FONT_LABELS`, `FONT_SIZES`, `THEME_LABELS`, `THEMES`, `renderDisplaySection()` (theme + font segmented controls). | `src/state.ts`, `./segmented.js` |
| `src/features/settings/topic-mgmt.ts` | `renderTopicMgmtSection()` (topic list + catalog host), `loadCatalogInto()` (catalog fetch + per-tile download), `deleteTopicWithConfirm`, `resetTopicWithConfirm`. | `src/storage.ts`, `src/state.ts`, `src/components/button.js`, `src/components/toast.js`, `src/components/modal.js` |
| `src/features/settings/backup.ts` | `isValidUserStates`, `isValidGamification`, `buildBackupPayload`, `exportCustomQuestions`, `importBackupFromFile`, `renderBackupSection()`. | `src/storage.ts`, `src/state.ts`, `src/types.ts` |
| `src/lib/helpers.ts` | `LEVEL_LABEL`, `ICON_FALLBACK` map (js/ts/react/vue/node/python/...), `pickIcon`, `topicIconEl`, `backButton`, `fieldRow`, `statChip`. | `src/features/*`, `src/app/picker/first-run-picker.ts` |
| `src/lib/topic-utils.ts` | `getMergedTopic(topicId)` (cached by dataRevision, merges gist topic with `customQuestions` for that topicId — in-memory only, never persisted), `findQuestion`, `catOf`, `levelStats`, `categoryStats`, `buildQueue`. | `src/state.ts`, `src/features/*` |
| `src/lib/undo.ts` | `XP_PER_STATE` (know=10, want_to_learn=5, skip=0, unseen=0), `answerCurrentCard`/`answerRandomCard` (records `UndoRecord`, dispatches user state + queues `recordAnswer` for XP/streak, plays `xpFloat`, animates `card-exit` then advances queue / random pick, shows undo toast), `undoLastAnswer` (restores user state, queue, index, session XP/answered; calls `revertXp`). | `src/storage.ts`, `src/state.ts`, `src/components/flashcard.ts` |
| `src/lib/dom-patch.ts` | Granular DOM update primitive: `viewport(id, ...children)` (returns element with `data-viewport="<id>"`), `findViewport`, `patchViewport` (in-place swap), `updateViewportText`. | `src/features/game.ts` |
| `src/chrome-shim.d.ts` | Ambient types for `chrome.storage`, `chrome.alarms`, `chrome.action`, `chrome.runtime`, `chrome.tabs`. Lets the project type-check without `@types/chrome`. | `tsconfig.json` |
| `styles/styles.css` | ENTRY. `@import` chain only — loads every other file under `styles/`. No rules itself. | `popup/popup.html`, `pages/onboarding.html` |
| `styles/variables.css` | `:root` tokens (colors, radii, shadows, glows, font-size scale, font stacks) + `:root[data-theme="light"]` overrides. | every other CSS file |
| `styles/base.css` | `@font-face` (Vazirmatn), `*` reset, `html/body/button` defaults, `.sr-only`, `:focus-visible`, `.glass`. | every layout/component file |
| `styles/reduced-motion.css` | `@media (prefers-reduced-motion: reduce)` — neutralizes flashcard flip, card-enter/exit, confetti, skeleton shimmer, celebrate badge, stat-pulse, xp-float, view-in. Loaded last so `!important` wins. | flashcard.css, feedback.css, header.css, skeleton.css, app-shell.css |
| `styles/layout/app-shell.css` | `.popup-body` (380×600), `.app` flex column, `.app-main` scroll region, `.view*`, `.section-title`, `.muted-note`, `.back-btn` + `@keyframes view-in`. | popup, all features |
| `styles/layout/header.css` | `.app-header` + `.brand*` + `.header-stats` + `.stat*` + `@keyframes stat-pulse`. | app/header.ts |
| `styles/layout/navigation.css` | `.bottom-nav` + `.nav-item*` (neon-glow active state). | app/router.ts |
| `styles/components/buttons.css` | `.btn` + variants (primary/ghost/danger/soft/wide/big/done). | every feature |
| `styles/components/flashcard.css` | 3D-flip `.flashcard` + `.flashcard__inner/face` + `.face__badge/body/foot/actions` + `.act--know/learn/skip` + `.card-enter`/`.card-exit` + their keyframes. | features/game.ts, features/review.ts |
| `styles/components/markdown.css` | `.md` typography (p/ul/ol/a/code) + `.code-ltr` LTR-exception wrapper for `<pre><code>`. | markdown.ts |
| `styles/components/modal.css` | `.overlay` + `.overlay--in` + `.modal*`. | components/modal.ts (confirmDialog) |
| `styles/components/toast.css` | `.toast` + `.toast--in/success/error` + `.toast__action`. | components/toast.ts |
| `styles/components/progress.css` | `.ring*` (SVG) + `.progress` / `.progress__fill` (linear bar). | features/game.ts (cat-list progress) |
| `styles/components/skeleton.css` | `.skeleton-list` + `.skeleton` + `.skeleton--header/row/card` + `@keyframes shimmer`. | app/bootstrap.ts, onboarding.ts |
| `styles/components/feedback.css` | `.celebrate*` + `.stat-chip*` + `.confetti` + `.xp-float` + `.empty*` + `.error-card*` (and `badge-pop` / `confetti-fall` / `xp-rise` keyframes). | features/game.ts (celebration), features/all-games.ts (empty) |
| `styles/features/game.css` | `.level-card*`, `.cat-grid`, `.cat-card*`, `.cat-list*` (per-question rows), `.picker-head`, `.topic-picker`, `.topic-tile*`, `.topic-switcher*`, `.topic-chip*`. | features/game.ts, app/picker/first-run-picker.ts |
| `styles/features/settings.css` | `.settings-group`, `.settings-row*`, `.seg-group`, `.seg*`, `.badge*`, `.catalog-host:empty`, `.spinner` + `@keyframes spin`. | features/settings/* |
| `styles/features/review.css` | `.review-list` + `.review-item*` (collapsible rows). | features/review.ts |
| `styles/features/add.css` | `.field` + `.field__label` + `.field__input*` + `.field__err`. | features/add.ts |
| `styles/features/all-games.css` | `.view--all-games`, `.recent-row` + scrollbar, `.recent-chip*`, `.all-games__grid`, `.game-card*` + progress mini-bar, update notes. | features/all-games.ts |
| `styles/features/onboarding.css` | `.ob-body`, `.ob`, `.ob-hero*`, `.ob-grid`, `.ob-card*`, `.ob-footer`, `.ob-finish*`. | pages/onboarding.html, onboarding.ts |
| `vendor/marked.umd.js` | Vendored `marked@18` (UMD). Loaded as classic script before popup ESM; exposes `window.marked`. | `popup/popup.html`, `src/markdown.ts` |
| `dist/*.js` | Compiled output. Committed pre-built; `npm run build`/`build:tsc` regenerates. | `package.json`, `tsconfig.json` |
| `test/setup.ts` | Mocks `chrome.storage.local/sync`, `chrome.action`, `chrome.alarms`, `chrome.runtime` for Vitest in Node. | `vitest.config.ts` |
| `test/state.test.ts` | Reducer purity + 19 action coverage. | `src/state.ts` |
| `test/state-extra.test.ts` | Remaining 7 reducer actions + edge cases (SET_CATALOG, SET_RECENT_TOPICS, REPLACE_CUSTOM_QUESTIONS, REPLACE_DOWNLOADED_VERSIONS, REPLACE_USER_STATES, SET_FONT_SIZE, SET_THEME, REPLACE_TOPICS fallback, HYDRATE recentTopics). | `src/state.ts` |
| `test/topic-utils.test.ts` | `levelStats` / `categoryStats` including level filtering and immutability. | `src/lib/topic-utils.ts` |
| `test/topic-utils-extra.test.ts` | `isEligibleForQueue` — unseen/skip/know/want_to_learn/topic scoping. | `src/lib/topic-utils.ts` |
| `test/undo.test.ts` | `XP_PER_STATE` table values and type-safety. | `src/lib/undo.ts` |
| `test/types.test.ts` | `compareVersions` (edge cases), `faNum`/`faDigits`, `localDateString`, `stateKey`, all 10 runtime type guards (52 tests). | `src/types.ts` |
| `test/helpers.test.ts` | `pickIcon` — icon/fallback/default behavior. | `src/lib/helpers.ts` |
| `test/storage.test.ts` | Real `Mutex` from `src/services/storage/mutex.ts` (FIFO, release, idempotency, 5s auto-release via fake timers) + `chrome-storage` helpers + `locked()` serialization. | `src/services/storage/mutex.ts`, `src/services/storage/chrome-storage.ts` |
| `test/gamification.test.ts` | Streak advance, same-day no-double-count, XP add/revert, clamp at zero, shared-mutation guard for the default object. | `src/services/data/gamification.ts` |
| `test/background.test.ts` | `detectUpdates` — version comparison with empty/missing/newer/older catalogs. | `src/background.ts` |

---

# Development Conventions

## Naming rules
- **Files:** `kebab-case` for folders; `camelCase.ts` for TS files (`game.ts`, `topic-utils.ts`, `undo.ts`).
- **Types/interfaces:** `PascalCase` (`AppState`, `Action`, `CustomQuestion`).
- **Type aliases for unions:** `PascalCase` (`QuestionLevel`, `Tab`, `Theme`).
- **State actions:** `SCREAMING_SNAKE_CASE` value strings inside a `type` field (`'SET_TAB'`, `'ANSWER_CARD'`).
- **DOM class names:** `kebab-case` with `block__element--modifier` (BEM-ish) — e.g. `flashcard__face--back`, `cat-card--done`, `btn--primary`, `toast--in`.
- **CSS vars:** `--kebab-case` (`--accent`, `--font-size`, `--junior`, `--mid`, `--senior`).
- **State keys:** ALWAYS composite `${topicId}:${questionId}` — enforced by `stateKey()` in `src/types.ts`. No bare ids.
- **Storage keys:** snake_case (`user_states`, `downloaded_versions`, `custom_questions`, `schema_version`).
- **Persian UI strings** are inline literals — do not extract to a separate i18n layer.

## Component structure
- Every view is a function `renderX(state: AppState): HTMLElement` that returns a fresh DOM tree. No caching, no incremental re-render at the feature level (the `store.subscribe` smart diff in `popup.ts` decides whether to call `renderX` or just patch).
- `components/*` is split by concern: `hyperscript` (h/svgIcon), `button`, `toast`, `modal` (confirmDialog), `progress` (bar/ring), `skeleton`, `feedback` (emptyState/errorCard/xpFloat/confetti), `flashcard`. Each widget is stateless DOM; callbacks only; no `chrome.*` / `fetch` / `store` imports.
- `components/flashcard.ts` is the only stateful reusable widget. It dispatches `FLIP_CARD` on click and calls a callback for answer actions.
- View modules do **not** call `chrome.storage` or `fetch` directly. They dispatch actions; `store.onAction` in `popup.ts` mirrors to storage.
- Pure helpers live in `src/lib/`. Testable in Node without DOM shims.
- `src/ui.ts` is a thin compat barrel that re-exports `components/*` so all existing `from '../ui.js'` imports keep working. New code should import from the focused component file.

## Styling approach
- One entry stylesheet (`styles/styles.css`) loads the actual rules via `@import`. The files under `styles/layout/`, `styles/components/`, `styles/features/` mirror the corresponding `src/` subfolders. No preprocessor, no CSS modules, no Tailwind, no postcss.
- CSS custom properties for theming (`--accent`, `--junior`, `--mid`, `--senior`, `--danger`) and dynamic font size (`--font-size`); defined once in `styles/variables.css` and overridden for light theme under `:root[data-theme="light"]` in the same file.
- Dark/light via `data-theme` attribute on `<html>`; toggled by `applyTheme()` in `src/app/theme.ts`.
- Font size mapped to px via `applyFontSize()` in `src/app/theme.ts`.
- Glassmorphism: `glass` utility class (backdrop-filter blur + semi-transparent bg) in `styles/base.css`.
- Animations: card flip (3D CSS transform on `.flashcard__inner`), card enter/exit, confetti, `stat--pulse`, `xp-float`, `toast--in`, `overlay--in`. Reduced-motion override in `styles/reduced-motion.css` (loaded last, uses `!important` on the same selectors).
- `<pre>` always wrapped in `div.code-ltr dir="ltr"` so code is readable inside RTL document.

## Import patterns
- ESM throughout. All local imports use `.js` extension even for `.ts` sources (tsconfig `moduleResolution: "Bundler"` + NodeNext-style path discipline).
- Import order: third-party → internal. Internal imports use **relative** paths (`./state.js`, `../lib/undo.js`, `../types.js`). No path aliases.
- Cross-feature imports discouraged; features should communicate via state + actions. `popup.ts` is the only file that wires everything.
- `lib/` is leaf-level (imports only from `types` and `state`).

## File organization rules
- New top-level view → `src/features/<name>.ts` exporting `render<Name>(state)`.
- New reusable DOM widget → `src/components/<name>.ts`.
- New pure helper → `src/lib/<name>.ts`.
- New domain type → extend `src/types.ts`; add a runtime type guard if the value can come from JSON/fetch.
- New storage surface → only via `src/storage.ts`.
- New tests → `test/<module>.test.ts`; pure unit tests in Node env. Import `vitest` from `'vitest'`.
- No code in `dist/` is hand-edited — regenerate via build.

## Security rules
- Never assign untrusted strings to `innerHTML`. All content goes through `createTextNode` (`h()` does this) or `renderMarkdown` (sanitizer).
- All fetched JSON validated with type guards before persistence. Malformed data triggers `errorCard` + retry, never save.
- `a[href]` only set when scheme is `http`/`https`. Links get `rel="noopener noreferrer" target="_blank"`.
- 10s `AbortController` timeout on every fetch.
- `Mutex` serializes all storage read-modify-writes to prevent races.

---

# Change History

Append entries here whenever files/folders/components/modules/APIs/architecture change.
Format: `YYYY-MM-DD — <change> — <files>`

- `2026-07-20` — Initial PROJECT_MAP created from full codebase analysis. — `PROJECT_MAP.md`
- `2026-07-20` — Added 6 test files (types, state-extra, helpers, storage, topic-utils-extra, background), refactored background.ts (extracted `detectUpdates`), expanded chrome mock in setup.ts (alarms, runtime). 125 total tests. — `PROJECT_MAP.md`, `test/`, `src/background.ts`, `test/setup.ts`
- `2026-07-20` — Refactor Steps 1–4: split `src/storage.ts` (448 → 58 lines) into `src/services/{api/topic-api, data/{topics,user-states,custom-questions,gamification,session}, storage/{chrome-storage,mutex,migrations,flags}}`. storage.ts is now a re-export facade. Fixed shared-mutation bug in getGamification (was returning same DEFAULT_GAMIFICATION reference). 138/138 tests across 10 files. — `src/services/**`, `src/storage.ts`, `test/storage.test.ts`, `test/gamification.test.ts`
- `2026-07-20` — Refactor Step 5: split `src/ui.ts` (341 lines, 10 concerns) into `src/components/{hyperscript,button,toast,modal,progress,skeleton,feedback}.ts`. ui.ts is now a 33-line re-export barrel. Added `test/dom-helpers.ts` minimal DOM stub. 178/178 tests across 14 files. — `src/components/**`, `src/ui.ts`, `test/dom-helpers.ts`, `test/{hyperscript,button,progress,modal}.test.ts`
- `2026-07-20` — Refactor Step 6: split `src/popup.ts` (511 → 30 lines) into `src/app/{bootstrap,router,header,subscriptions,keyboard,theme,picker/first-run-picker}.ts`. popup.ts is now shell + bootstrap() only. AppShell interface passes DOM refs between modules. 195/195 tests across 16 files. — `src/app/**`, `src/popup.ts`, `test/{theme,router}.test.ts`
- `2026-07-20` — Refactor Step 7: extracted `src/features/game/cat-list.ts` (157 lines) + pure helper `src/lib/cat-list-stats.ts` (53 lines: STATE_COLORS, computeKnownCount, computeProgress). game.ts 331 → 210 lines. 213/213 tests across 17 files. — `src/features/game/cat-list.ts`, `src/lib/cat-list-stats.ts`, `test/cat-list-state.test.ts`
- `2026-07-20` — Refactor Step 8: split `src/features/settings.ts` (310 → 14 lines) into `src/features/settings/{segmented,theme-controls,topic-mgmt,backup}.ts`. settings.ts is now renderSettings() orchestrator only. Extracted validators (isValidUserStates, isValidGamification), buildBackupPayload, importBackupFromFile as testable units. 233/233 tests across 18 files. — `src/features/settings/**`, `test/settings-import-export.test.ts`
- `2026-07-20` — Step 1: extracted `services/storage/{chrome-storage,mutex}` from storage.ts. `storage.ts` becomes a 58-line re-export facade. 7 new Mutex tests; getGamification defensive-clone. 138/138 green. — `src/services/storage/`, `src/storage.ts`, `test/storage.test.ts`
- `2026-07-20` — Step 2: extracted `services/api/topic-api` (CATALOG_URL + fetchValidatedJson + fetchCatalog) from storage.ts. Storage facade re-exports unchanged. — `src/services/api/topic-api.ts`, `src/storage.ts`
- `2026-07-20` — Step 3: split domain ops into `services/data/{topics,user-states,custom-questions,gamification,session}.ts`. Storage facade re-exports each. — `src/services/data/`, `src/storage.ts`
- `2026-07-20` — Step 4: extracted `services/storage/{migrations,flags}`. Storage facade unchanged. — `src/services/storage/migrations.ts`, `src/services/storage/flags.ts`, `src/storage.ts`
- `2026-07-20` — Step 5: split `src/ui.ts` (341 lines) into 7 focused `components/*` files; `ui.ts` is now a 33-line compat barrel. Added `test/dom-helpers.ts` (in-test DOM stub) and 4 new test files. 178/178 green. — `src/components/{hyperscript,button,toast,modal,progress,skeleton,feedback}.ts`, `src/ui.ts`, `test/dom-helpers.ts`, `test/{hyperscript,button,progress,modal}.test.ts`
- `2026-07-20` — Step 6: split `src/popup.ts` (511 lines) into 7 `app/*` modules; `popup.ts` is now a 30-line entry. Added `test/theme.test.ts` and `test/router.test.ts` (vi.hoisted for module mocks). 195/195 green. — `src/app/{bootstrap,router,header,subscriptions,keyboard,theme,picker/first-run-picker}.ts`, `src/popup.ts`, `test/{theme,router}.test.ts`
- `2026-07-20` — Step 7: extracted category-question list from `src/features/game.ts` into `src/features/game/cat-list.ts`. Pure math (`STATE_COLORS`, `computeKnownCount`, `computeProgress`) lives in `src/lib/cat-list-stats.ts`; DOM mutation `applyCategoryItemState` lives in `cat-list.ts` next to its caller. `game.ts` is now 215 lines and only owns game-flow routing + topic switcher + all-categories grid + flashcard + celebration. Added `test/cat-list-state.test.ts` (18 tests). 213/213 green.
- `2026-07-20` — Step 1 of REFACTOR_PLAN: extracted `Mutex` to `src/services/storage/mutex.ts` and `getLocal`/`setLocal`/`getSync`/`setSync`/`locked` to `src/services/storage/chrome-storage.ts`. `src/storage.ts` re-exports them as a compat facade. Rewrote `test/storage.test.ts` against the real `Mutex` (+ `vi.useFakeTimers` for the 5s auto-release test). 131 total tests. — `REFACTOR_PLAN.md`, `src/services/storage/`, `src/storage.ts`, `test/storage.test.ts`
- `2026-07-20` — Step 2 of REFACTOR_PLAN: extracted `CATALOG_URL` + `fetchValidatedJson` + `fetchCatalog` to `src/services/api/topic-api.ts`. `src/storage.ts` re-exports them; `downloadTopic` (still in `storage.ts`) imports `fetchValidatedJson` locally. No behavior or signature change. 131 tests still green. — `REFACTOR_PLAN.md`, `src/services/api/topic-api.ts`, `src/storage.ts`
- `2026-07-20` — Step 3 of REFACTOR_PLAN: split domain data into `src/services/data/{topics,user-states,custom-questions,gamification,session}.ts`. `src/storage.ts` re-exports all of them. `getGamification` now returns a fresh clone of the default (fixes pre-existing shared-mutation bug surfaced by new tests). `runMigrations` + sync flags stay in `storage.ts` (Step 4 territory). Added `test/gamification.test.ts` (7 tests). 138 total tests. — `REFACTOR_PLAN.md`, `src/services/data/`, `src/storage.ts`, `test/gamification.test.ts`
- `2026-07-20` — Step 4 of REFACTOR_PLAN: extracted `runMigrations` to `src/services/storage/migrations.ts` and the 10 flag functions to `src/services/storage/flags.ts`. `src/services/data/topics.ts` now imports `getActiveTopicId`/`setActiveTopicId` from `flags.ts` directly (no more circular dep through the `storage.ts` facade). `src/storage.ts` is now a 58-line pure re-export facade — zero inline logic. 138 tests still green. — `REFACTOR_PLAN.md`, `src/services/storage/migrations.ts`, `src/services/storage/flags.ts`, `src/services/data/topics.ts`, `src/storage.ts`
- `2026-07-20` — Step 5 of REFACTOR_PLAN: split `src/ui.ts` (341 lines, 10 concerns) into 7 focused files under `src/components/`: `hyperscript.ts` (h+svgIcon+Child/HProps types), `button.ts`, `toast.ts`, `modal.ts` (confirmDialog), `progress.ts` (bar+ring), `skeleton.ts`, `feedback.ts` (emptyState/errorCard/xpFloat/confetti). `src/ui.ts` is now a 33-line compat barrel re-exporting them — zero behavior/UI/CSS change, all 10 internal `from '../ui.js'` imports still resolve. Added `test/dom-helpers.ts` (FakeNode/FakeElement/FakeTextNode + document shim) so DOM-touching component tests run in pure node env without adding a DOM lib. New tests: `hyperscript.test.ts` (15), `button.test.ts` (10), `progress.test.ts` (8), `modal.test.ts` (7). 178 total tests across 14 files, all green. — `REFACTOR_PLAN.md`, `src/components/{hyperscript,button,toast,modal,progress,skeleton,feedback}.ts`, `src/ui.ts`, `test/{dom-helpers,hyperscript,button,progress,modal}.test.ts`
- `2026-07-20` — Step 6 of REFACTOR_PLAN: split `src/popup.ts` (511 → 30 lines) into `src/app/{bootstrap,router,header,subscriptions,keyboard,theme,picker/first-run-picker}.ts`. Smart-diff logic in `store.subscribe` and the 6-case `store.onAction` mirror are preserved byte-for-byte; only call sites rewired to receive an `AppShell` (`headerEl`/`mainEl`/`navEl`/`liveRegion`). `popup.ts` now only mounts the shell + calls `bootstrap(shell)`. New tests: `theme.test.ts` (6: data-theme + font-size px map), `router.test.ts` (11: NAV_ITEMS shape, renderMain routes each tab via vi.mock'd features, renderNav active class + aria-current). Stub extended with `replaceChildren` + `getPropertyValue` for these. 195 total tests across 16 files, all green; typecheck clean. — `REFACTOR_PLAN.md`, `src/popup.ts`, `src/app/**`, `test/{theme,router}.test.ts`, `test/dom-helpers.ts`
- `2026-07-20` — Step 7 of REFACTOR_PLAN: extracted category-question list from `src/features/game.ts` (331 → 215 lines) into `src/features/game/cat-list.ts` (157 lines) + pure helper `src/lib/cat-list-stats.ts` (53 lines: STATE_COLORS, computeKnownCount, computeProgress). DOM mutation `applyCategoryItemState` stays in `cat-list.ts` next to its caller. Added `test/cat-list-state.test.ts` (18 tests). 213 total tests across 17 files, all green; typecheck clean. — `REFACTOR_PLAN.md`, `src/features/game/cat-list.ts`, `src/lib/cat-list-stats.ts`, `test/cat-list-state.test.ts`
- `2026-07-20` — Step 8 of REFACTOR_PLAN: split `src/features/settings.ts` (310 → 14 lines) into `src/features/settings/{segmented,theme-controls,topic-mgmt,backup}.ts`. settings.ts is now `renderSettings()` orchestrator only. Extracted `isValidUserStates`, `isValidGamification`, `buildBackupPayload`, `exportCustomQuestions`, `importBackupFromFile` as testable units. Added `test/settings-import-export.test.ts` (20 tests: validators + FileReader + chrome.storage.local mock). 233 total tests across 18 files, all green; typecheck clean. — `REFACTOR_PLAN.md`, `src/features/settings/**`, `test/settings-import-export.test.ts`
- `2026-07-20` — Step 9 of REFACTOR_PLAN: split `styles/styles.css` (2032 lines, 1 file) into 17 focused files under `styles/`. `styles.css` is now an `@import`-only entry. Tokens + light override in `styles/variables.css`; reset/glass/a11y in `styles/base.css`; layout split into `layout/{app-shell,header,navigation}.css`; reusable widgets split into `components/{buttons,flashcard,markdown,modal,toast,progress,skeleton,feedback}.css`; per-feature rules split into `features/{game,settings,review,add,all-games,onboarding}.css`; `styles/reduced-motion.css` loaded last so its `!important` overrides win. NO class renames, NO value edits — verified by diffing the 211 unique class selectors between the old and new files (all present, no additions). HTML files still link only `../styles/styles.css`. 233/233 tests still green; typecheck clean. — `REFACTOR_PLAN.md`, `styles/**`
- `2026-07-20` — Step 10 of REFACTOR_PLAN (final): documentation update. PROJECT_MAP.md updated to reflect the final architecture — new `styles/` tree in Project Structure, expanded `styles/` folder responsibility paragraph, replaced the single-line `styles/styles.css` Core Files Reference row with 19 rows (entry + 18 split files), updated Styling approach section to describe the `@import` chain and `data-theme` token override, and appended Change History entries for Steps 7/8/9 + this entry. REFACTOR_PLAN.md updated: Steps 9 + 10 ticked, "Refactor Completed" final-status section added. 233/233 tests still green; typecheck clean. — `PROJECT_MAP.md`, `REFACTOR_PLAN.md`
