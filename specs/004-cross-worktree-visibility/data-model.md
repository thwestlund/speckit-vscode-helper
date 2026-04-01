# Data Model: Cross-Worktree Feature Visibility

**Feature**: 004-cross-worktree-visibility  
**Date**: 2026-04-01

---

## Entities

### WorktreeInfo *(existing — `src/services/worktreeService.ts`)*

No changes. Used as-is as the `worktreeSource` carrier on `Feature`.

```typescript
interface WorktreeInfo {
  readonly path: string;             // absolute filesystem path of the worktree root
  readonly branch: string | undefined; // branch name, undefined for detached HEAD
  readonly isCurrentWorkspace: boolean; // true when path === gitRoot passed to listWorktrees
}
```

---

### Feature *(modified — `src/models/feature.ts`)*

Add one required field: `worktreeSource`. All existing consumers pass the current workspace's `WorktreeInfo` (constructed in `specDiscovery.ts` from the new parameter).

```typescript
interface Feature {
  readonly number: string;
  readonly shortName: string;
  readonly branchName: string;
  readonly directoryPath: string;       // absolute path within the worktree
  readonly state: WorkflowState;
  readonly artifacts: Artifact[];
  readonly actionState: ActionState;
  readonly worktreeSource: WorktreeInfo; // NEW — which worktree this feature came from
}
```

**Validation rules**:
- `worktreeSource.path` MUST be a valid filesystem path that prefixes `directoryPath`.
- `artifacts[*].filePath` MUST be rooted under `worktreeSource.path`.

---

### FeatureGroup *(new — `src/models/featureGroup.ts`)*

Represents one worktree's contribution to the tree view.

```typescript
interface FeatureGroup {
  readonly worktree: WorktreeInfo;
  readonly features: Feature[];        // sorted by actionState + numeric prefix
}
```

**Derivation rules**:
- One `FeatureGroup` per worktree that has at least one discoverable `specs/` directory.
- Groups are ordered: current workspace first, then remotes sorted alphabetically by branch name.
- Empty groups (no features after deduplication) are removed.

**State transitions**: None — `FeatureGroup` is a read-only view model derived fresh on each refresh.

---

### WorktreeGroupItem *(new — `src/providers/worktreeGroupItem.ts`)*

VS Code tree node representing a `FeatureGroup`. This is a UI-layer object, not persisted.

```typescript
class WorktreeGroupItem extends vscode.TreeItem {
  constructor(readonly group: FeatureGroup) {
    // label: branch name or "Detached HEAD" if branch is undefined
    // description: "(current)" for isCurrentWorkspace === true
    // collapsibleState: Collapsed
    // iconPath: ThemeIcon('source-control') for remote, ThemeIcon('home') for current
    // contextValue: 'worktreeGroup'
  }
}
```

**Label logic**:
- `group.worktree.branch` is defined → use branch name as label
- `group.worktree.branch` is undefined → use `path.basename(group.worktree.path)` + suffix `(detached)`
- `group.worktree.isCurrentWorkspace === true` → append `(current)` to description

---

## Key Relationships

```
listWorktrees(gitRoot)
  └─► WorktreeInfo[]
        └─► discoverFeatures(specsUri, worktree)
              └─► Feature[]  ← each Feature.worktreeSource = WorktreeInfo
                    └─► deduplicateByNumber(Feature[])  ← keeps highest STATE_ORDER
                          └─► FeatureGroup[]
                                └─► WorktreeGroupItem  [tree root when >1 group]
                                      └─► FeatureTreeItem  [unchanged]
                                            └─► ArtifactTreeItem  [unchanged]
```

---

## State Ordering for Deduplication

Uses existing `STATE_ORDER` array from `workflowState.ts`:

```typescript
const STATE_ORDER: WorkflowState[] = [
  WorkflowState.New,          // index 0 — lowest
  WorkflowState.Specified,    // index 1
  WorkflowState.Planned,      // index 2
  WorkflowState.TasksDefined, // index 3
  WorkflowState.Implementing, // index 4
  WorkflowState.Complete,     // index 5 — highest
];
// WorkflowState.Unknown treated as -1 (lower than New)
```

Deduplication: for each numeric prefix, keep the `Feature` with `STATE_ORDER.indexOf(state)` closest to index 5. Ties (equal state) keep the current-workspace entry; if both are remote, keep the first encountered.

---

## Aggregation Flow

```
aggregateFeatures(gitRoot, currentWorkspaceRoot):
  1. listWorktrees(gitRoot)          → WorktreeInfo[]
  2. filter: worktrees.length > 20   → warn, slice to 20
  3. for each worktree in parallel:
       specsUri = vscode.Uri.file(path.join(worktree.path, 'specs'))
       features = await discoverFeatures(specsUri, worktree)
                  catch → [] (per worktree error isolation)
  4. build FeatureGroup[] from (worktree → features)
  5. filter: drop groups where features.length === 0
  6. deduplicateByNumber(groups)
  7. sort: current workspace group first, then alphabetical by branch

findGitRoot(workspaceRoot, execFn?):
  1. exec 'git rev-parse --show-toplevel' in workspaceRoot
  2. return trimmed stdout, or undefined on error
```
