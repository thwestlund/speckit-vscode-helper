# Research: Clarify Worktree-Origin View

**Feature**: `005-clarify-worktree-view`  
**Date**: 2026-04-02  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Root Cause of the "Confusing" Duplication

**Decision**: The duplication arises because `aggregateFeatures` scans every worktree's `specs/` folder independently. A feature folder committed to the shared git history (e.g., `specs/002-add-auth` on `main`) is visible on disk in every checked-out worktree. The current code does not deduplicate — it simply returns all discovered `{worktree, features}` pairs.

**Rationale**: Git worktrees share the same object database. When branch `002-add-auth` is checked out as a worktree alongside `main`, both paths on disk contain `specs/002-add-auth` unless the feature folder was only ever created on its own branch. In practice, `specs/` folders are created on `main` or another base branch and committed there, so they appear in every worktree that has them in its HEAD.

**Fix scope**: Deduplication must happen inside `aggregateFeatures` — after collecting all `{worktree, Feature[]}` results — by assigning each `feature.branchName` (folder name) to exactly one worktree using the priority chain.

---

## 2. Deduplication Priority Chain Algorithm

**Decision**: Three-tier priority chain applied per feature folder name:

1. **Suffix-match** (strongest): The worktree whose `branch` name ends with `-{featureFolderName}` or equals `{featureFolderName}`. Branch naming convention: `{project-name}-{feature-number}-{feature-name}` → e.g., `vscode-speckit-extension-002-add-auth`. Check: `branch === folderName || branch.endsWith('-' + folderName)`.  
2. **Current workspace** (fallback): If no suffix match, the worktree with `isCurrentWorkspace === true` claims the feature.  
3. **Git worktree list order** (final tie-breaker): First entry in the `listWorktrees` result array wins. `worktreeService.ts` already returns them in parsing order from `git worktree list --porcelain`, which is deterministic.

**Rationale**: Suffix-match is the most semantically correct rule — a branch named for a feature owns that feature. Current-workspace fallback handles the common case where a feature lives on `main` and is open in the main VS Code window. Order-based tie-breaking is deterministic and requires no heuristics.

**Alternatives considered**:  
- Prefix-match: Rejected because the project name prefix (`vscode-speckit-extension`) would be the match target, not the feature identifier. Folder names do NOT have the project prefix — only branch names do.  
- Alphabetical tie-break: Rejected as non-deterministic relative to the developer's intent.

---

## 3. Single-Worktree Display: Always Grouped

**Decision**: Remove the `if (this._groups.length <= 1)` flat-list branch in `FeatureTreeProvider.getChildren`. The grouped layout (one `WorktreeGroupItem` → child `FeatureTreeItem`s) is the only rendering path regardless of worktree count.

**Rationale**: Consistent structure means the UI never visually jumps when a second worktree is added. Users learn what the group labels mean from first use. The `WorktreeGroupItem` already exists and handles the single-worktree case correctly — it just wasn't used for single-worktree before.

**Impact**: Integration test `featureTreeProvider.test.ts` currently exercises the flat-list path for single-worktree; this test must be updated to expect a top-level `WorktreeGroupItem` wrapping the features.

---

## 4. "Empty Worktree" Group Visibility

**Decision**: Distinguish two cases:  
- **Missing directory** (worktrees directory deleted from disk after `git worktree list` ran): Group omitted silently. Already handled — `discoverFeatures` returns `[]` on `readDirectory` failure, and `aggregateFeatures` filters to `nonEmpty`.  
- **Valid worktree with no recognized feature directories**: The worktree group IS still shown with a "No features" placeholder child. This requires a small addition to `getChildren` for a `WorktreeGroupItem` whose `group.features` is empty.

**Rationale**: A valid but featureless worktree is meaningful information (the user knows the scan ran). A ghost worktree with a deleted directory is noise and should be invisible.

**Implementation note**: `aggregateFeatures` currently filters `nonEmpty`. The filter must be relaxed to include worktrees that have an accessible `specs/` dir but no features. A separate check for directory accessibility is needed. However this is a minor scope extension — the minimum viable approach: an empty group shows a non-interactive "No features" item. If complexity is high, this can be deferred; the spec states it as an edge case behavior.

---

## 5. Visual Distinction of Current Workspace Group

**Decision**: No new code required. `WorktreeGroupItem` already implements the VS Code-idiomatic pattern:  
- `description = '(current)'` for the current workspace worktree  
- `iconPath = new vscode.ThemeIcon('home')` for current, `'source-control'` for remote

This satisfies FR-012 with zero new implementation. The clarification Q4 answer ("bold label, dedicated icon, or annotation") is met by the `home` icon + `(current)` description combination.

---

## 6. Live File-Watch Scope

**Decision**: No change to the file-watching architecture. The existing `FileWatcher` only observes the current workspace's `specs/` directory (via `vscode.workspace.createFileSystemWatcher`). Remote worktrees are never watched. Manual refresh via the sidebar refresh command re-runs `aggregateFeatures` which re-scans all worktrees at that moment.

**Rationale**: Extending file-watching to all worktree paths would require one `FileSystemWatcher` per worktree, multiplying watchers and background I/O. The spec explicitly chose manual-only refresh for remote worktrees (Q1 clarification).

---

## 7. Affected Files Summary

| File | Change type | Reason |
|---|---|---|
| `src/services/worktreeAggregator.ts` | Add function | `deduplicateFeatures` algorithm (FR-003, FR-004) |
| `src/providers/featureTreeProvider.ts` | Modify | Remove flat-list single-worktree branch (FR-010) |
| `src/providers/worktreeGroupItem.ts` | Minor modify | Add "No features" placeholder child support (edge case) |
| `test/unit/services/worktreeAggregator.test.ts` | Add tests | Deduplication unit tests |
| `test/integration/featureTreeProvider.test.ts` | Update test | Single-worktree now expects grouped structure |

No new VS Code contributions (commands, views, settings) are required. No `package.json` manifest changes needed.
