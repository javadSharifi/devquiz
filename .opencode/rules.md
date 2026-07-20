# DevQuiz — Project Rules

## PROJECT_MAP.md is the source of truth

`PROJECT_MAP.md` is this project's architecture documentation and memory.

**Permanent rule:**

1. **Read `PROJECT_MAP.md` first** at the start of every task, before any code work or repository search.
2. **Use it to locate files and understand architecture** — folder responsibilities, core file table, naming/style conventions, data flow, and the change history are all there.
3. **Avoid unnecessary repository-wide searching.** Use `PROJECT_MAP.md` to jump directly to the relevant file/module. Only fall back to `semble search` / `grep` / `read` when information is missing or stale.
4. **Update `PROJECT_MAP.md` automatically** whenever you add, remove, or modify:
   - files
   - folders
   - components
   - modules
   - APIs
   - architecture

   For each change record: changed path, purpose, related files, date of change. Append a new entry to the **Change History** section in `YYYY-MM-DD — <change> — <files>` format. Also update the affected sections (folder responsibilities, core files table, flow, conventions) so the doc stays accurate.

Treat `PROJECT_MAP.md` as the single source of truth. Stale docs are a bug.
