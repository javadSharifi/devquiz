/* ============================================================
 * DevQuiz — app/clipboard.ts
 * Copy as plain text. In dark mode the browser puts the white
 * text colour into the copied rich text, so it pastes as white
 * text in Word/Docs. Writing text/plain only avoids that.
 * ============================================================ */

export function bindPlainCopy(): void {
  document.addEventListener('copy', (ev) => {
    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    const text = window.getSelection()?.toString() ?? '';
    if (!text || !ev.clipboardData) return;
    ev.clipboardData.setData('text/plain', text);
    ev.preventDefault();
  });
}
