# Implementation Plan: Clarify Worktree-Origin View

**Branch**: `005-clarify-worktree-view` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/005-clarify-worktree-view/spec.md`

## Summary

The current sidebar shows each feature once per worktree — because every checked-out worktree shares the same `specs/` folder history — producing confusing duplicate entries with conflicting state representations. This feature introduces a **deduplication pass** in `worktreeAggregator.ts` that assigns each feature to exactly one home worktree using a priority chain (branch suffix-match → current workspace → list order), and removes the flat-list single-worktree rendering path so the grouped layout is always shown consistently.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: VS Code Extension API (`vscode`), Node.js `child_process` (git interop)  
**Storage**: File system only — `specs/` directory structure; no persistent state  
**Testing**: Mocha + VS Code Extension Test Runner (unit + integration), `esbuild` for bundling  
**Target Platform**: VS Code Desktop (macOS, Windows, Linux)  
**Project Type**: VS Code Extension  
**Performance Goals**: `aggregateFeatures` (including deduplication) must complete within the existing 200 ms command-responsiveness budget; deduplication is O(W × F) where W = worktrees (≤20) and F = features per worktree — negligible overhead  
**Constraints**: No new `FileSystemWatcher` instances; no new VS Code contributions (commands/views/settings); no `package.json` manifest changes  
**Scale/Scope**: ≤20 worktrees (enforced cap), ≤~200 feature folders per worktree in practice

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Principle | Status | Notes |
|---|---|---|---|
| Type safety | I — Code Quality | ✅ PASS | No `any` introduced; new function has typed parameters |
| Single responsibility | I — Code Quality | ✅ PASS | `deduplicateFeatures` is one focused function; `featureTreeProvider` change is a one-line removal |
| No dead code | I — Code Quality | ✅ PASS | Removing the flat-list branch eliminates dead path |
| Unit tests for new public function | II — Testing Standards | ✅ PASS | `deduplicateFeatures` is exported and tested |
| Integration test updated | II — Testing Standards | ✅ PASS | Single-worktree grouped-display integration test updated |
| VS Code idioms | III — UX Consistency | ✅ PASS | `WorktreeGroupItem` already uses `vscode.ThemeIcon`, `description`, VS Code tree API |
| Consistent terminology | III — UX Consistency | ✅ PASS | "home worktree" canonicalized in spec; UI shows branch name (existing) |
| Activation time ≤500 ms | IV — Performance | ✅ PASS | No new activation cost; deduplication is O(W×F), negligible |
| No new FileSystemWatcher | IV — Performance | ✅ PASS | Remote worktrees remain manual-refresh only (FR-011) |
| No new runtime dependency | Tech Decision Framework | ✅ PASS | Pure TypeScript logic, no new npm package |

**Constitution Check result: ALL GATES PASS — no violations to justify.**

## Project Structure

### Documentation (this feature)

```text
specs/005-clarify-worktree-view/
├── plan.md         ← this file
├── research.md     ← Phase 0 (complete)
├── data-model.md   ← Phase 1 (complete)
├── quickstart.md   ← Phase 1 (see below)
└── tasks.md        ← Phase 2 (/speckit.tasks — not yet created)
```

### Source Code (files modified or added)

```text
src/
├── services/
│   └── worktreeAggregator.ts   ← ADD: deduplicateFeatures(); MODIFY: call it in aggregateFeatures()
└── providers/
    ├── featureTreeProvider.ts  ← MODIFY: remove flat-list single-worktree branch
    └── worktreeGroupItem.ts    ← MODIFY: add NoFeaturesItem placeholder (edge case)

test/
├── unit/
│   └── services/
│       └── worktreeAggregator.test.ts   ← ADD: deduplication unit tests
└── integration/
    └── featureTreeProvider.test.ts      ← UPDATE: single-worktree now expects grouped structure
```

**Structure Decision**: Single project — VS Code extension. No new files; changes are targeted modifications to existing modules. `deduplicateFeatures` is added as an exported function to `worktreeAggregator.ts` alongside `aggregateFeatures` and `sortGroups`.

## Architecture Design

### 1. `deduplicateFeatures(groups: FeatureGroup[]): FeatureGroup[]`

New exported function in `worktreeAggregator.ts`. Called by `aggregateFeatures` before `sortGroups`.

**Algorithm**:
```
seen = new Map<featureFolderName, worktreeIndex>()

// Pass 1: assign home worktree for each feature folder
for each (group, index) in groups:
  for each feature in group.features:
    if feature.branchName not in seen:
      seen.set(feature.branchName, index)  // first occurrence wins (list-order fallback)

// Pass 2: override with priority-1 (suffix-match) assignments
for each (group, index) in groups:
  if group.worktree.branch is defined:
    for each feature in group.features:
      folderName = feature.branchName
      if branch === folderName OR branch.endsWith('-' + folderName):
        seen.set(folderName, index)  // suffix-match overrides any prior assignment

// Pass 3: for each feature with no suffix-match AND multiple candidates, use current-workspace
// (Already handled: if current workspace appeared first in list-order pass, it won.
//  If a non-current worktree appeared first, but current workspace also has the feature,
//  we must override with current workspace.)
for each (group, index) in groups:
  if group.worktree.isCurrentWorkspace:
    for each feature in group.features:
      folderName = feature.branchName
      // only override if winner so far has no suffix-match AND is not current workspace
      currentWinner = seen.get(folderName)
      if currentWinner is defined AND groups[currentWinner].worktree.isCurrentWorkspace is false:
        // check if the current winner has a suffix-match; if not, current workspace takes over
        winnerBranch = groups[currentWinner].worktree.branch
        hasSuffixMatch = winnerBranch === folderName || winnerBranch?.endsWith('-' + folderName)
        if !hasSuffixMatch:
          seen.set(folderName, index)

// Rebuild groups, keeping only features assigned to each group
return groups.map((group, index) =>
  { ...group, features: group.features.filter(f => seen.get(f.branchName) === index) }
).filter(group => group.worktree directory is accessible)
```

> **Simplification note**: The three passes can be collapsed into a single comparison function `pickOwner(candidates: {group, index}[]): index` applied per feature folder. Both produce identical results; the two-pass form is easier to test independently.

### 2. `FeatureTreeProvider.getChildren` change

**Remove** (single line block):
```ts
// Single worktree: flat list (backwards-compatible)
if (this._groups.length <= 1) {
  const features = this._groups.flatMap((g) => g.features);
  return features.map((f) => new FeatureTreeItem(f));
}
```

**Result**: `getChildren(undefined)` always returns `WorktreeGroupItem[]`. `getChildren(WorktreeGroupItem)` returns `FeatureTreeItem[]` (or a `NoFeaturesItem` if empty).

### 3. `WorktreeGroupItem` / `NoFeaturesItem`

When `element.group.features.length === 0` in `getChildren(WorktreeGroupItem)`, return a single non-interactive placeholder:
```ts
const placeholder = new vscode.TreeItem('(no features)', vscode.TreeItemCollapsibleState.None);
placeholder.contextValue = 'noFeatures';
```

This is a minimal inline item — no new class required.

### 4. Empty-group visibility in `aggregateFeatures`

Current code filters `nonEmpty` (groups with features). After deduplication, a worktree may have zero features in its group because all its features were assigned to other worktrees by the deduplication pass. Such a group should still be shown if the `specs/` directory exists and is accessible (it's a valid worktree, just not the owner of any feature). The filter changes from `features.length > 0` to `specsDir accessible (no readDirectory error)`.

**Implementation**: Track whether `discoverFeatures` succeeded (directory exists) vs. threw. A worktree whose `specs/` is inaccessible is omitted; one with an accessible `specs/` but zero features (after dedup) is kept.

---

## Key Design Decisions

| Decision | Principle | Rationale |
|---|---|---|
| `deduplicateFeatures` as a separate exported function | I — Single responsibility | Isolates the algorithm, makes it independently testable |
| List-order pass first, then suffix-match override | Simple correctness | Avoids multi-pass complexity; suffix-match always wins regardless of order it appears |
| Inline placeholder `vscode.TreeItem` instead of new class | I — Minimal complexity | Used in one place; new class would be over-engineering |
| Remove flat-list path entirely (not feature-flagged) | III — UX Consistency, I — No dead code | Consistent display from day 1 of multi-worktree awareness; no toggle to maintain |
