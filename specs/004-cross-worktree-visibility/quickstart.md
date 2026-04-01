# Quickstart: Cross-Worktree Feature Visibility

**Feature**: 004-cross-worktree-visibility  
**Date**: 2026-04-01

---

## What This Feature Does

After this feature ships, the SpecKit sidebar aggregates features from **every checked-out git worktree**, not just the current workspace. Opening VS Code on your main branch shows features in-progress on other branches too — grouped and labelled by branch name.

Single-worktree setups see no UI change.

---

## Prerequisites

- Git installed and available in PATH
- Workspace opened at the git repo root (or any worktree within it)
- `.specify/init-options.json` present (extension activation requirement, unchanged)

---

## File Changes Summary

### New files

| File | Purpose |
|------|---------|
| `src/models/featureGroup.ts` | `FeatureGroup` interface — typed container for one worktree's features |
| `src/services/worktreeAggregator.ts` | `findGitRoot`, `aggregateFeatures`, `deduplicateByNumber` |
| `src/providers/worktreeGroupItem.ts` | `WorktreeGroupItem` tree node — the branch-level header in the sidebar |

### Modified files

| File | Change |
|------|--------|
| `src/models/feature.ts` | Add required `worktreeSource: WorktreeInfo` field |
| `src/services/specDiscovery.ts` | Accept `worktree: WorktreeInfo` parameter; attach to each `Feature` |
| `src/providers/featureTreeProvider.ts` | Use `WorktreeAggregator`; render group nodes when multi-worktree |
| `src/extension.ts` | Resolve `gitRoot` via `findGitRoot`; pass to `FeatureTreeProvider` |

---

## Implementation Steps

### Step 1 — Add `FeatureGroup` model

```typescript
// src/models/featureGroup.ts
import { WorktreeInfo } from '../services/worktreeService.js';
import { Feature } from './feature.js';

export interface FeatureGroup {
  readonly worktree: WorktreeInfo;
  readonly features: Feature[];
}
```

### Step 2 — Extend `Feature` with `worktreeSource`

```typescript
// src/models/feature.ts  (add field)
import { WorktreeInfo } from '../services/worktreeService.js';

export interface Feature {
  // ... existing fields ...
  readonly worktreeSource: WorktreeInfo;  // ← add this
}
```

### Step 3 — Update `specDiscovery.ts`

`discoverFeatures` and `buildFeature` gain a `worktree: WorktreeInfo` parameter. The value is passed through to every `Feature` object it constructs.

```typescript
// signature change
export async function discoverFeatures(
  specsDir: vscode.Uri,
  worktree: WorktreeInfo,        // ← new
): Promise<Feature[]>
```

### Step 4 — Implement `worktreeAggregator.ts`

```typescript
// src/services/worktreeAggregator.ts

export async function findGitRoot(
  workspaceRoot: string,
  execFn: ExecFn = childProcess.exec,
): Promise<string | undefined>

export async function aggregateFeatures(
  gitRoot: string,
  currentWorkspaceRoot: string,
): Promise<FeatureGroup[]>

export function deduplicateByNumber(groups: FeatureGroup[]): FeatureGroup[]
```

Key behaviour:
- `aggregateFeatures` calls `listWorktrees(gitRoot)`, reads each worktree's `specs/` via `discoverFeatures` in parallel, suppresses per-worktree errors.
- `deduplicateByNumber` uses `STATE_ORDER.indexOf` to keep the highest-state entry per numeric prefix.

### Step 5 — Add `WorktreeGroupItem`

```typescript
// src/providers/worktreeGroupItem.ts
export class WorktreeGroupItem extends vscode.TreeItem {
  constructor(readonly group: FeatureGroup) {
    const label = group.worktree.branch
      ?? `${path.basename(group.worktree.path)} (detached)`;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = group.worktree.isCurrentWorkspace ? '(current)' : undefined;
    this.iconPath = new vscode.ThemeIcon(
      group.worktree.isCurrentWorkspace ? 'home' : 'source-control',
    );
    this.contextValue = 'worktreeGroup';
  }
}
```

### Step 6 — Refactor `FeatureTreeProvider`

Change the provider's internal state from `Feature[]` to `FeatureGroup[]`. Update `getChildren`:

- **Root level** (`element === undefined`):
  - If `_groups.length === 1` → return flat `FeatureTreeItem[]` (single-worktree, no group header)
  - If `_groups.length > 1` → return `WorktreeGroupItem[]`
- **`WorktreeGroupItem` level** → return `FeatureTreeItem[]` for that group
- **`FeatureTreeItem` level** → return `ArtifactTreeItem[]` (unchanged)

### Step 7 — Update `extension.ts`

```typescript
// After locating workspaceRoot:
const gitRoot = await findGitRoot(workspaceRoot.fsPath) ?? workspaceRoot.fsPath;
const treeProvider = new FeatureTreeProvider(specsDir, gitRoot);
```

Pass `gitRoot` to `FeatureTreeProvider` so `aggregateFeatures` can find all worktrees.

---

## Test Plan

| Suite | File | Tests |
|-------|------|-------|
| TT-FG: FeatureGroup model | `test/unit/models/featureGroup.test.ts` | shape validation, empty features |
| TT-WA: WorktreeAggregator | `test/unit/services/worktreeAggregator.test.ts` | findGitRoot success/failure, aggregateFeatures single/multi/error, deduplicateByNumber |
| TT-WGI: WorktreeGroupItem | `test/unit/providers/worktreeGroupItem.test.ts` | label for branch, detached HEAD, current badge |
| TT-MW: Multi-worktree integration | `test/integration/multiWorktree.test.ts` | flat list preserved for single worktree; group items rendered for multi |

---

## Acceptance Verification

1. Open VS Code on a repo with two worktrees, each with a `specs/` directory  
   → Sidebar shows two group headers, current workspace first  
2. Click a remote-worktree artifact → opens file from that worktree's path (check editor title)  
3. Simulate git failure (mock `findGitRoot` to return `undefined`) → sidebar shows current-workspace features only, no error modal  
4. Add a new feature folder to a remote worktree → sidebar does NOT auto-update  
5. Click "Refresh" in sidebar → remote worktree's new feature appears  
6. Open single-worktree repo → no group header, flat list exactly as before this feature
