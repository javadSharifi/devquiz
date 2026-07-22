/* ============================================================
 * DevQuiz — build/build.mjs
 * One orchestrator, three targets: Chrome MV3, Firefox MV3, web.
 * Each target bundles the same TypeScript sources; only the
 * platform adapter and the set of static files differ.
 *
 *   node build/build.mjs chrome
 *   node build/build.mjs firefox
 *   node build/build.mjs web
 *   node build/build.mjs all
 *   node build/build.mjs chrome --watch
 * ============================================================ */

import * as esbuild from 'esbuild';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const target = (args.find((a) => !a.startsWith('--')) ?? 'all').toLowerCase();

if (!['chrome', 'firefox', 'web', 'all'].includes(target)) {
  console.error(`Unknown target: ${target}. Use chrome|firefox|web|all`);
  process.exit(1);
}

const PLATFORM_INDEX = resolve(ROOT, 'src/platform/index.ts');
const PLATFORM_DEFAULT = resolve(ROOT, 'src/platform/_web.ts');

/** Copy the per-platform template to platform/index.ts so the
 *  bundler sees the right adapter and tree-shakes the rest. */
async function stagePlatformAdapter(name) {
  const template = resolve(ROOT, `src/platform/_${name}.ts`);
  await copyFile(template, PLATFORM_INDEX);
}

/** Restore platform/index.ts to the default (web) so the file
 *  in the working tree is predictable after the build finishes. */
async function restorePlatformAdapter() {
  await copyFile(PLATFORM_DEFAULT, PLATFORM_INDEX);
}

/** Bundle a single target with esbuild. */
async function bundle(name, outdir) {
  const define = { __PLATFORM__: JSON.stringify(name) };
  const entryPoints = name === 'web'
    ? ['src/entry-web.ts']
    : ['src/popup.ts', 'src/onboarding.ts', 'src/background.ts'];

  const opts = {
    entryPoints,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    outdir,
    define,
    logLevel: 'info',
  };

  if (watch) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
    return;
  }
  await esbuild.build(opts);
}

/** Copy the static assets the bundle needs at runtime. */
async function copyStatic(name) {
  const staticDir = resolve(ROOT, `dist/${name}`);
  if (name === 'chrome' || name === 'firefox') {
    await cp(resolve(ROOT, 'popup'), resolve(staticDir, 'popup'), { recursive: true });
    await cp(resolve(ROOT, 'pages'), resolve(staticDir, 'pages'), { recursive: true });
    await cp(resolve(ROOT, 'styles'), resolve(staticDir, 'styles'), { recursive: true });
    await cp(resolve(ROOT, 'assets'), resolve(staticDir, 'assets'), { recursive: true });
    await cp(resolve(ROOT, 'vendor'), resolve(staticDir, 'vendor'), { recursive: true });
    const manifestSrc = name === 'chrome' ? 'manifest.json' : 'manifest.firefox.json';
    await copyFile(resolve(ROOT, manifestSrc), resolve(staticDir, 'manifest.json'));
  } else if (name === 'web') {
    await cp(resolve(ROOT, 'styles'), resolve(staticDir, 'styles'), { recursive: true });
    await cp(resolve(ROOT, 'assets'), resolve(staticDir, 'assets'), { recursive: true });
    await cp(resolve(ROOT, 'vendor'), resolve(staticDir, 'vendor'), { recursive: true });
    await writeFile(resolve(staticDir, 'index.html'), renderWebIndex(), 'utf8');
    // Disable Jekyll so files starting with _ (e.g. vendor/) and
    // dotfiles in the dist tree are served verbatim.
    await writeFile(resolve(staticDir, '.nojekyll'), '', 'utf8');
  }
}

async function buildTarget(name) {
  const outdir = resolve(ROOT, `dist/${name}/dist`);
  const staticDir = resolve(ROOT, `dist/${name}`);
  if (!existsSync(outdir)) await mkdir(outdir, { recursive: true });
  await stagePlatformAdapter(name);
  try {
    await bundle(name, outdir);
    await copyStatic(name);
  } finally {
    if (!watch) await restorePlatformAdapter();
  }
  console.log(`[build] ${name} -> dist/${name}/${watch ? ' (watching)' : ''}`);
}

function renderWebIndex() {
  return `<!doctype html>
<html dir="rtl" lang="fa">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light dark" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>دِوکوئیز — وب</title>
    <link rel="stylesheet" href="./styles/styles.css" />
  </head>
  <body class="popup-body web-body">
    <div id="app" class="app app--fullscreen"></div>
    <script src="./vendor/marked.umd.js"></script>
    <script type="module" src="./dist/entry-web.js"></script>
  </body>
</html>
`;
}

const targets = target === 'all' ? ['chrome', 'firefox', 'web'] : [target];

if (!watch) {
  for (const t of targets) {
    await rm(resolve(ROOT, `dist/${t}`), { recursive: true, force: true });
  }
}

for (const t of targets) {
  if (t === 'chrome' || t === 'firefox' || t === 'web') {
    await buildTarget(t);
  }
}

if (watch) {
  console.log(`[build] watching — Ctrl+C to stop`);
  await new Promise(() => {});
} else {
  console.log(`[build] done: ${targets.join(', ')}`);
}
