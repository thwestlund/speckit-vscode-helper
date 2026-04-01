# VS Code Manifest Contract: Cross-Worktree Feature Visibility

**Feature**: 004-cross-worktree-visibility  
**Date**: 2026-04-01

---

## Overview

This feature introduces no new `package.json` contributions (commands, views, settings, or activation events). All changes are internal to the extension host. The manifest contract documents which existing contributions change behaviour and what the VS Code API surface boundary looks like for the new code.

---

## Existing Contributions — Behaviour Changes

### `speckit.featureTree` (TreeView)

**Existing**: Renders a flat list of `FeatureTreeItem` nodes (one per feature in `{workspace}/specs/`).

**After this feature**:
- When a single worktree is detected: renders the same flat list — **no visual change**.
- When multiple worktrees are detected: renders a two-level tree:
  - Level 1: `WorktreeGroupItem` nodes (one per worktree with features)
  - Level 2: `FeatureTreeItem` nodes (same as before, nested under the group)
  - Level 3: `ArtifactTreeItem` nodes (unchanged)

**Context value added**: `'worktreeGroup'` — used to identify group nodes in context menus (no new menu entries needed for this feature, but registered for future extensibility).

### `speckit.refreshTree` (Command)

**Existing**: Calls `treeProvider.refresh()` which reads `{workspace}/specs/`.

**After this feature**: `refresh()` additionally calls `aggregateFeatures(gitRoot, ...)` which reads all worktrees' `specs/` directories. Behaviour is unchanged for single-worktree setups (returns one group, renders flat).

### `speckit.openArtifact` (Command)

**Existing**: Opens `vscode.Uri.file(artifact.filePath)` — filePath was always within current workspace.

**After this feature**: `filePath` on artifacts from remote worktrees is rooted under the remote worktree's path. The command handler is unchanged — it still calls `vscode.window.showTextDocument(vscode.Uri.file(filePath))`. The correct path is embedded in the artifact at discovery time by `specDiscovery.ts`.

---

## New VS Code API Usages

| API | Usage | Notes |
|-----|-------|-------|
| `vscode.window.showWarningMessage` | One-time warning when >20 worktrees detected | Non-blocking, no buttons |
| `vscode.TreeItem` (subclass) | `WorktreeGroupItem` — new tree node type | Follows existing `FeatureTreeItem` pattern |
| `vscode.ThemeIcon('home')` | Current workspace group icon | Built-in VS Code icon |
| `vscode.ThemeIcon('source-control')` | Remote worktree group icon | Built-in VS Code icon |

No new activation events, settings, keybindings, menus, or webviews are introduced.

---

## No API Changes (Stable Contracts)

The following existing public contracts are unchanged and tested:

| Contract | File | Status |
|---------|------|--------|
| `listWorktrees(gitRoot, execFn?)` | `worktreeService.ts` | Unchanged |
| `addWorktree(branch, path, gitRoot, execFn?)` | `worktreeService.ts` | Unchanged |
| `discoverFeatures(specsDir)` | `specDiscovery.ts` | Signature extended (new param); backward-compatible via default |
| `FeatureTreeProvider.refresh()` | `featureTreeProvider.ts` | No signature change |
| `FeatureTreeItem` | `featureTreeItem.ts` | Unchanged |
| `ArtifactTreeItem` | `featureTreeItem.ts` | Unchanged |

---

## `package.json` — No Changes Required

```jsonc
// No new entries needed in:
// contributes.commands       — no new commands
// contributes.views          — existing speckit.featureTree is reused
// contributes.menus          — no new menu items
// contributes.configuration  — no new settings
// activationEvents            — unchanged
```

---

## Error Handling Contract

| Scenario | User-facing behaviour | Implementation |
|----------|----------------------|----------------|
| `git` not in PATH | Sidebar shows current-workspace features only | `findGitRoot` returns `undefined`; provider falls back |
| `listWorktrees` throws | Same fallback as above | Caught in `aggregateFeatures`; returns single current-workspace group |
| Remote worktree `specs/` unreadable | That worktree silently skipped | Per-worktree `catch` in `aggregateFeatures` |
| Remote worktree path no longer exists | Error shown when user opens file | `vscode.window.showTextDocument` throws; caught with `showErrorMessage` |
| >20 worktrees | Warning notification once per session | `showWarningMessage` (non-modal) |
