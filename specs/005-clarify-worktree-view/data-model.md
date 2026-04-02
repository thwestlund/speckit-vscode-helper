# Data Model: Clarify Worktree-Origin View

**Feature**: `005-clarify-worktree-view`  
**Date**: 2026-04-02

---

## Entities (unchanged from prior features)

No new domain entities are introduced. This feature changes the aggregation and display logic, not the data schema.

---

## Modified Entity: `FeatureGroup`

**Current** (`src/models/featureGroup.ts`):
```ts
interface FeatureGroup {
  readonly worktree: WorktreeInfo;
  readonly features: Feature[];
}
```

**Change**: None required to the interface. The `features` array may now be empty for valid worktrees with no features (edge case from research §4). Empty-feature groups are permitted in the model and handled at the display layer.

---

## New Behaviour: Deduplication Map

Introduced inside `worktreeAggregator.ts` (not a persistent data model — an in-memory computation):

```
FeatureOwnershipMap: Map<featureFolderName: string, homeWorktreeIndex: number>
```

- **Key**: `feature.branchName` (the `specs/` subfolder name, e.g., `"002-add-auth"`)
- **Value**: Index into the ordered `WorktreeInfo[]` from `listWorktrees` — identifies the winning worktree

**Priority chain** (evaluated in order; first match wins):

| Priority | Condition | Notes |
|---|---|---|
| 1 (strongest) | `worktree.branch === folderName \|\| worktree.branch?.endsWith('-' + folderName)` | Suffix-match using project branch naming convention |
| 2 | `worktree.isCurrentWorkspace === true` | Current workspace takes ownership if no suffix match |
| 3 | First occurrence in `listWorktrees` result order | Deterministic tie-breaker; git reports main worktree first |

---

## State Transitions (unchanged)

The `WorkflowState` derivation is unchanged. A feature's state is computed solely from artifact files in its home worktree's `specs/<featureFolderName>/` directory.

```
Empty dir → no state displayed
spec.md present → Specified
plan.md present → Planned  
tasks.md present → In Progress / Complete (derived from tasks content)
```

---

## Display Model

The tree structure after this feature:

```
TreeView root
└── WorktreeGroupItem (branch: "main", isCurrentWorkspace: true)
    │   icon: home  description: "(current)"
    ├── FeatureTreeItem (002-add-auth, Planned)
    └── FeatureTreeItem (001-setup, Complete)

└── WorktreeGroupItem (branch: "vscode-speckit-extension-003-new-feature")
    │   icon: source-control  description: undefined
    └── FeatureTreeItem (003-new-feature, Specified)

└── WorktreeGroupItem (branch: "vscode-speckit-extension-004-payment", no features)
        [NoFeaturesItem] "(no features)"
```

**Previous** (single-worktree flat list — removed by this feature):
```
TreeView root
├── FeatureTreeItem (002-add-auth, Planned)
└── FeatureTreeItem (001-setup, Complete)
```

---

## Validation Rules

- A `featureFolderName` MUST appear in the `features` array of at most one `FeatureGroup`.
- `WorktreeGroupItem` MAY have zero features (valid worktree, no spec folders); it renders a non-interactive placeholder child.
- `WorktreeGroupItem` is NOT created for worktrees whose directory does not exist on disk (omitted silently by `aggregateFeatures`).
