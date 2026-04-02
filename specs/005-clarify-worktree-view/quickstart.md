# Quickstart: Clarify Worktree-Origin View

**Feature**: `005-clarify-worktree-view`  
**Date**: 2026-04-02

## What This Implements

Fixes duplicate feature entries in the SpecKit sidebar when using multiple git worktrees. Each feature now appears under exactly one labelled worktree group — its **home worktree**. The grouped layout is also applied consistently in single-worktree setups.

## Files to Change

| File | What changes |
|---|---|
| `src/services/worktreeAggregator.ts` | Add `deduplicateFeatures()` and call it in `aggregateFeatures()` |
| `src/providers/featureTreeProvider.ts` | Remove the flat-list single-worktree branch |
| `src/providers/worktreeGroupItem.ts` | Handle empty-feature groups with a placeholder child |
| `test/unit/services/worktreeAggregator.test.ts` | Add unit tests for `deduplicateFeatures` |
| `test/integration/featureTreeProvider.test.ts` | Update single-worktree expectation to grouped structure |

## Core Algorithm (`deduplicateFeatures`)

Assign each feature folder to one home worktree using this priority chain:

1. **Suffix-match** (strongest): `branch === folderName || branch.endsWith('-' + folderName)`
2. **Current workspace**: `worktree.isCurrentWorkspace === true`
3. **List order** (tie-breaker): first worktree in `git worktree list` output wins

```typescript
export function deduplicateFeatures(groups: FeatureGroup[]): FeatureGroup[] {
  // Map: featureFolderName → winning group index
  const owner = new Map<string, number>();

  // Priority 3 (weakest): list-order — first occurrence wins
  for (let i = 0; i < groups.length; i++) {
    for (const f of groups[i].features) {
      if (!owner.has(f.branchName)) owner.set(f.branchName, i);
    }
  }

  // Priority 2: current workspace overrides non-suffix-matched claims
  const currentIdx = groups.findIndex((g) => g.worktree.isCurrentWorkspace);
  if (currentIdx >= 0) {
    for (const f of groups[currentIdx].features) {
      const winnerIdx = owner.get(f.branchName)!;
      const winnerBranch = groups[winnerIdx].worktree.branch;
      const hasSuffix =
        winnerBranch === f.branchName || winnerBranch?.endsWith('-' + f.branchName);
      if (!hasSuffix) owner.set(f.branchName, currentIdx);
    }
  }

  // Priority 1 (strongest): suffix-match always wins
  for (let i = 0; i < groups.length; i++) {
    const branch = groups[i].worktree.branch;
    if (!branch) continue;
    for (const f of groups[i].features) {
      if (branch === f.branchName || branch.endsWith('-' + f.branchName)) {
        owner.set(f.branchName, i);
      }
    }
  }

  // Rebuild groups, retaining only owned features
  return groups.map((g, i) => ({
    ...g,
    features: g.features.filter((f) => owner.get(f.branchName) === i),
  }));
}
```

## `FeatureTreeProvider.getChildren` change

Remove the flat-list branch so all setups use grouped rendering:

```typescript
// DELETE this block:
if (this._groups.length <= 1) {
  const features = this._groups.flatMap((g) => g.features);
  return features.map((f) => new FeatureTreeItem(f));
}
```

## Empty group placeholder

In `getChildren(element: WorktreeGroupItem)`:

```typescript
if (element.group.features.length === 0) {
  const empty = new vscode.TreeItem('(no features)', vscode.TreeItemCollapsibleState.None);
  empty.contextValue = 'noFeatures';
  return [empty];
}
```

## Key Test Cases

```
deduplicateFeatures:
  ✓ suffix-match branch wins over current-workspace claim
  ✓ current-workspace wins over list-order when no suffix match
  ✓ list-order wins when neither suffix-match nor current-workspace applies
  ✓ feature with no duplicates is unaffected
  ✓ feature appearing in 3 worktrees — correct single winner

featureTreeProvider (single-worktree):
  ✓ getChildren(undefined) returns WorktreeGroupItem[] even with 1 group
  ✓ WorktreeGroupItem label matches current branch name
  ✓ WorktreeGroupItem description is "(current)"
```
