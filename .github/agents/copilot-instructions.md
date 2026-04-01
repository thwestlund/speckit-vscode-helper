# vscode-speckit-extension Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-01

## Active Technologies
- TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies; all visual indicator capabilities are native to the TreeItem and ThemeIcon APIs (003-feature-action-indicator)
- N/A — read-only; no persistence (003-feature-action-indicator)
- TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+); Node.js `child_process` module (already available in extension host) for git CLI invocation (002-feature-number-chat-worktree)
- N/A — read-only for US1/US2; git worktree operations mutate the file system but no extension-owned storage (002-feature-number-chat-worktree)

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
- 003-feature-action-indicator: Added TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies; all visual indicator capabilities are native to the TreeItem and ThemeIcon APIs
- 002-feature-number-chat-worktree: Added TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+); Node.js `child_process` module (already available in extension host) for git CLI invocation

- 001-speckit-visual-extension: Added TypeScript 5.x (strict mode, per Constitution Principle I) + `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
