# vscode-speckit-extension Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-02

## Active Technologies
- TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies; all visual indicator capabilities are native to the TreeItem and ThemeIcon APIs (003-feature-action-indicator)
- N/A — read-only; no persistence (003-feature-action-indicator)
- TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+); Node.js `child_process` module (already available in extension host) for git CLI invocation (002-feature-number-chat-worktree)
- N/A — read-only for US1/US2; git worktree operations mutate the file system but no extension-owned storage (002-feature-number-chat-worktree)
- TypeScript 5.x, strict mode + VS Code Extension API 1.85+, `child_process.exec` (already used via `worktreeService.ts`) (004-cross-worktree-visibility)
- Filesystem only — reads `specs/` directories via `vscode.workspace.fs` (004-cross-worktree-visibility)
- TypeScript 5.x (strict mode) + VS Code Extension API (`vscode`), Node.js `child_process` (git interop) (005-clarify-worktree-view)
- File system only — `specs/` directory structure; no persistent state (005-clarify-worktree-view)

- TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies (001-speckit-visual-extension)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict mode, per Constitution Principle I): Follow standard conventions

## Recent Changes
- 005-clarify-worktree-view: Added TypeScript 5.x (strict mode) + VS Code Extension API (`vscode`), Node.js `child_process` (git interop)
- 004-cross-worktree-visibility: Added TypeScript 5.x, strict mode + VS Code Extension API 1.85+, `child_process.exec` (already used via `worktreeService.ts`)
- 003-feature-action-indicator: Added TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies; all visual indicator capabilities are native to the TreeItem and ThemeIcon APIs


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
