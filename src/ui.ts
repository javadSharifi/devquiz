/* ============================================================
 * DevQuiz — ui.ts
 * Compatibility barrel. Re-exports every symbol from
 * src/components/*. New code should import from the focused
 * component file directly:
 *   import { h } from './components/hyperscript.js';
 *   import { button } from './components/button.js';
 *   import { toast } from './components/toast.js';
 *   import { confirmDialog } from './components/modal.js';
 *   import { progressBar, progressRing } from './components/progress.js';
 *   import { skeleton, skeletonList } from './components/skeleton.js';
 *   import { emptyState, errorCard, xpFloat, confetti } from './components/feedback.js';
 * ============================================================ */

export type { Child, HProps } from './components/hyperscript.js';
export { h, svgIcon } from './components/hyperscript.js';

export type { ButtonOpts } from './components/button.js';
export { button } from './components/button.js';

export type { ToastOpts } from './components/toast.js';
export { toast } from './components/toast.js';

export { confirmDialog } from './components/modal.js';

export { progressBar, progressRing } from './components/progress.js';

export { skeleton, skeletonList } from './components/skeleton.js';

export { emptyState, errorCard, xpFloat, confetti } from './components/feedback.js';
