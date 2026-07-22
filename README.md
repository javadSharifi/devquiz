# DevQuiz ⚡ — تمرین گیمیفای‌شده سوالات مصاحبه فنی

A Chrome / Firefox MV3 extension and a static web app for practicing Persian
technical-interview questions as a dark, Duolingo-style flashcard game: 3D
card flips, daily streaks, XP, progress rings, undo, celebration screens —
fully RTL with LTR code blocks. One TypeScript codebase, three shipping
targets. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the platform-adapter
design.

## Targets

| Target | Build | Install |
|---|---|---|
| Chrome MV3 | `pnpm run build:chrome` | Load `dist/chrome/` unpacked |
| Firefox MV3 | `pnpm run build:firefox` | Load `dist/firefox/` in `about:debugging` |
| GitHub Pages | `pnpm run build:web` | Auto-deployed by `.github/workflows/deploy-web.yml` |

The web build is published to GitHub Pages automatically on every push to
`main`. One-time setup: **Settings → Pages → Source = "GitHub Actions"**.

## Install (unpacked)

1. The project ships **pre-built** (`dist/` is committed) — no build step needed.
2. *(Optional, recommended)* add the Vazirmatn fonts: see `assets/fonts/README.md`.
   Without them the UI falls back to Tahoma/Segoe UI and still works.
3. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select this folder.
4. The onboarding page opens on first install; download ≥ 1 topic and hit «شروع».

## Building from source

Two equivalent paths:

**A. esbuild (spec default — requires network for `npm install`):**

```bash
npm install
npm run build     # or: npm run watch
```

**B. tsc only (works fully offline — what produced the committed dist/):**

```bash
npm run build:tsc
```

Both emit native ES modules into `dist/`; `popup/popup.html`,
`pages/onboarding.html` and the service worker load them directly
(`"type": "module"`), so no bundler is strictly required.

> If you `npm install` (bringing in `@types/chrome`), delete
> `src/chrome-shim.d.ts` and add `"types": ["chrome"]` back to
> `tsconfig.json` — the shim only exists so the project type-checks offline.

## Markdown & sanitization (deviation note)

The spec asks for `marked` + `DOMPurify`. This build environment had **no
registry access**, so:

- `marked` v18 (MIT) is **vendored** at `vendor/marked.umd.js` and loaded as a
  classic script before the popup module (`window.marked`).
- The DOMPurify config from the spec (tag whitelist `p strong em ul ol li pre
  code br a`, no `javascript:` URIs, no event-handler attributes) is implemented
  in `src/markdown.ts` as a strict **rebuild-the-DOM** sanitizer: marked's HTML
  is parsed with `DOMParser` into an inert document and copied node-by-node —
  *no attribute is ever copied* except a validated `a[href]`, and nothing is
  ever assigned to `innerHTML`. Swapping in DOMPurify later is a one-function
  change (see the header comment in `src/markdown.ts`).

## Architecture map

```
src/types.ts     — models, discriminated Action union, runtime type guards,
                   faNum/faDigits (Persian digits), version compare
src/state.ts     — typed PubSub Store + reducer + debounced session persistence
src/storage.ts   — the ONLY chrome.storage / fetch surface: typed wrappers,
                   10s AbortController timeouts, validation-before-persist,
                   migrations, orphan cleanup, streak/xp accounting
src/markdown.ts  — marked + whitelist sanitizer + LTR code-block wrapper
src/ui.ts        — typed h() hyperscript + shared components (toast w/ undo,
                   skeletons, progress bar/ring, confetti, modal, empty/error)
src/popup.ts     — tabs, game flow (levels → categories → flashcards →
                   celebration), review, add-question form, settings, RTL
                   keyboard shortcuts, undo, localized re-renders
src/onboarding.ts— first-run catalog grid with per-topic download states
src/background.ts— chrome.alarms 24h catalog check → 🔔 action badge
```

Key invariants (enforced in code):

- `user_states` keys are always `` `${topicId}:${questionId}` `` — never bare ids.
- Fetched JSON is validated with type guards **before** persisting; malformed
  data is never saved (error card + retry instead).
- `getMergedTopic()` merges gist topics with `custom_questions` **in memory at
  render time only**; the merged result is never persisted. Topic updates
  overwrite gist data, run orphan-state cleanup, and never touch custom
  questions.
- `chrome.storage.sync` holds only `active_topic` and `onboarding_done`.
- Skipped cards go to the end of the current session queue and stay eligible
  for «سؤال تصادفی».

## Keyboard shortcuts (RTL-aware, active only while a flashcard is mounted)

| Key            | Action                          |
| -------------- | ------------------------------- |
| Space / Enter  | flip the card                   |
| ArrowLeft (←)  | ✅ بلدم — advance direction in RTL |
| ArrowDown (↓)  | 📚 یاد می‌گیرم                   |
| ArrowRight (→) | ⏭ رد کن                         |

Shortcuts never fire while an input/textarea/select is focused; flips are
announced through an `aria-live="polite"` region.

## Data hosting

`storage.ts` exports the exact `CATALOG_URL` from the spec. Host your own data
by publishing gists matching the schemas in `sample-data/` (`catalog.json` and
one topic JSON per entry) and pointing `downloadUrl`s at their raw URLs — the
manifest already grants `host_permissions` for `https://gist.githubusercontent.com/*`.

## Licenses

- Project code: yours.
- `vendor/marked.umd.js`: MIT © MarkedJS (license header preserved in the file).
- Vazirmatn font (when added): SIL OFL © Saber Rastikerdar.
