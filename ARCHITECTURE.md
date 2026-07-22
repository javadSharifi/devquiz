# DevQuiz — Cross-platform Architecture

One TypeScript codebase, three shipping targets:

| Target | Output | API surface | Persistence |
|---|---|---|---|
| Chrome MV3 | `dist/chrome/` | `chrome.*` (service worker) | `chrome.storage.local/sync` |
| Firefox MV3 | `dist/firefox/` | `browser.*` (background scripts) | `browser.storage.local/sync` |
| GitHub Pages | `dist/web/` | none (plain browser) | `localStorage` (envelope) |

The extension features (popup, onboarding, flashcard game, gamification, backup)
are unchanged. The platform-isolation layer is the only new piece.

## The platform adapter

```
src/platform/
  types.ts          ← single PlatformAdapter interface
  chrome-adapter.ts ← chrome.*  implementation
  firefox-adapter.ts← browser.* implementation
  web-adapter.ts    ← localStorage + noop implementation
  _chrome.ts        ← `export { chromeAdapter as platform }`
  _firefox.ts       ← `export { firefoxAdapter as platform }`
  _web.ts           ← `export { webAdapter as platform }`
  index.ts          ← default (web) re-export — overwritten at build time
```

**Rule for app code:** import `platform` from `'../platform/index.js'`. Never
touch `chrome.*`, `browser.*`, or `localStorage` directly. The single
exception is the platform adapter files themselves.

The `PlatformAdapter` interface (`src/platform/types.ts`) is the contract. It
exposes five surfaces:

- `storage.local` / `storage.sync` — typed `{get, set, remove}`
- `alarms` — `{create, get, clear, onAlarm}`
- `runtime` — `{getURL, onInstalled, onStartup}`
- `action` — `{setBadgeText, setBadgeBackgroundColor}`
- `tabs` — `{create}`

Every adapter implements the same surface, so call sites are line-for-line
portable. The web adapter's alarms/action/tabs are no-ops (or `window.open`
for tabs), because GitHub Pages has no service worker, no badge, and no
`chrome.tabs` API.

### Why three re-export files, not a runtime `pick()`?

`esbuild --define` can fold a runtime ternary
(`__PLATFORM__ === 'chrome' ? chromeAdapter : …`) into the right branch, but
it cannot eliminate the unused adapter imports. The remaining two adapter
files end up in every bundle because esbuild cannot prove their imports
have no side effects.

The clean solution: the build script copies the right per-platform
re-export to `src/platform/index.ts` before each bundle. esbuild then sees
exactly one import, tree-shakes the other adapters, and each bundle ends
up with only its own adapter (verified: 6 chrome-storage refs in the Chrome
bundle, 0 in Firefox; 3 localStorage refs in the web bundle, 0 in either
extension).

The re-export is restored to the web default after the build so the file
in the working tree is predictable and `tsc --noEmit` is reproducible.

## Build pipeline

`build/build.mjs` is the single entry point.

```bash
node build/build.mjs chrome     # → dist/chrome/
node build/build.mjs firefox    # → dist/firefox/
node build/build.mjs web        # → dist/web/
node build/build.mjs all        # all three
node build/build.mjs chrome --watch   # esbuild context.watch()
```

Per target it:

1. Stages `src/platform/_<name>.ts` over `src/platform/index.ts`
2. Bundles entry points with esbuild (`format: esm`, `target: es2022`,
   `minify: true`, `--define:__PLATFORM__='"<name>"'`)
3. Copies static assets (popup/, pages/, styles/, assets/, vendor/)
4. Drops the matching manifest (`manifest.json` for Chrome,
   `manifest.firefox.json` for Firefox, generated `index.html` for web)
5. Restores the default `index.ts` so the working tree is clean

Entry points per target:

- Chrome / Firefox: `src/popup.ts`, `src/onboarding.ts`, `src/background.ts`
- Web: `src/entry-web.ts` (mounts the same app shell in fullscreen)

## Manifest differences

Both extensions use Manifest V3. The only material diff:

```diff
- "background": { "service_worker": "dist/background.js", "type": "module" }
+ "background": { "scripts": ["dist/background.js"] }
```

`browser_specific_settings` is omitted; Firefox loads MV3 without an addon ID
for `about:debugging` installs. The shared `permissions` and
`host_permissions` arrays are identical.

## Web app behaviour

`src/entry-web.ts` mounts the same `AppShell` (header / nav / main / live
region) that the popup uses, into a fullscreen layout. There is no service
worker, no onboarding page, no extension icon — `webAdapter` no-ops all of
those. `platform.tabs.create` opens a new tab via `window.open` so the
fullscreen button still works.

`localStorage` is namespaced with a `devquiz.web.` prefix and a `local.`
or `sync.` area prefix. The 5–10 MB quota is comfortably above the
flashcard payload. Migration to IndexedDB is a one-file change
(`web-adapter.ts`) when the dataset outgrows it.

## Future migration

Code that still hardcodes `chrome.*` outside the platform/ directory
should be moved through the adapter on the next touch. The lint rule
"no `chrome.|browser.|localStorage` outside `src/platform/`" is the
single mechanism to keep the boundary clean.

## Verification matrix

Run after any platform change:

```bash
pnpm run typecheck          # tsc --noEmit (all 3 targets type-check)
pnpm test                   # 233 unit tests, all pass
pnpm run build              # all 3 builds emit the right adapter
```

Bundle output per target after tree-shake:

| Bundle | chrome.storage | browser.storage | localStorage | devquiz.web prefix |
|---|---|---|---|---|
| `dist/chrome/dist/popup.js` | 6 | 0 | 0 | 0 |
| `dist/firefox/dist/popup.js` | 0 | 6 | 0 | 0 |
| `dist/web/dist/entry-web.js` | 0 | 0 | 3 | 1 |
