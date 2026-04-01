# Research: Cross-Worktree Feature Visibility

**Feature**: 004-cross-worktree-visibility  
**Date**: 2026-04-01  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: How to detect the git root from the workspace root

**Decision**: Run `git rev-parse --show-toplevel` in `workspaceRoot.fsPath` via the existing `ExecFn` pattern (DI-injectable, avoids `childProcess.exec` being non-stubable in tests).

**Rationale**: The workspace root found from `.specify/init-options.json` is always inside the git repo, but may not be the git root itself (e.g., a monorepo has `<gitRoot>/packages/my-app`). `git rev-parse --show-toplevel` is the canonical, cross-platform way to resolve this. It also already returns the primary worktree path — the same string `listWorktrees` uses for `isCurrentWorkspace` comparison — so the two are guaranteed to stay in sync.

**Alternatives considered**:
- Walk up the directory tree looking for `.git/` — works but breaks for worktrees because worktrees have a `.git` file (not a directory) pointing back to the main `.git/`. Would require parsing the file contents, adding complexity.
- Read `.git/config` — not reliable for worktrees; skipped.
- Use `vscode.workspace.workspaceFolders[0].uri` directly — the workspace root and the git root are not always the same; rejected.

---

## Decision 2: Where to put the aggregation logic

**Decision**: New file `src/services/worktreeAggregator.ts` with three exported functions:
- `findGitRoot(workspaceRoot: string, execFn?: ExecFn): Promise<string | undefined>`
- `aggregateFeatures(gitRoot: string, currentWorkspaceRoot: string): Promise<FeatureGroup[]>`
- `deduplicateByNumber(groups: FeatureGroup[]): FeatureGroup[]`

**Rationale**: The constitution requires files under 300 lines. Adding aggregation logic directly to `FeatureTreeProvider` would push it well over that limit, and the logic is independently testable (no VS Code API dependency). A dedicated service matches the existing pattern (`specDiscovery.ts`, `worktreeService.ts`).

**Alternatives considered**:
- Add to `specDiscovery.ts` — rejected; discovery is per-directory, not multi-worktree. Single-responsibility violated.
- Add to `FeatureTreeProvider` — rejected; provider should only handle tree rendering, not orchestration.

---

## Decision 3: Whether to add `worktreeSource` to the `Feature` interface or carry it separately

**Decision**: Add `worktreeSource: WorktreeInfo` as a required field to the `Feature` interface. All existing callers (single-worktree path) will supply the current workspace's `WorktreeInfo`. This is inferred in `specDiscovery.ts` from a new `worktree: WorktreeInfo` parameter passed into `discoverFeatures`.

**Rationale**: The tree item and the file-open command need to know which worktree a feature belongs to. Embedding the source directly in `Feature` avoids a separate lookup at render time and keeps the model self-contained. Making it required (not optional) prevents the common mistake of forgetting to set it on a newly created feature.

**Alternatives considered**:
- Parallel map of `Feature → WorktreeInfo` maintained by the provider — rejected; denormalized, error-prone, and harder to test.
- Optional `worktreeSource?: WorktreeInfo` — rejected; optional fields tend to become unset through refactors. Required field forces correctness at compile time.

Migration impact: `buildFeature` in `specDiscovery.ts` gains one parameter. All 5 existing tests continue to pass with a synthetic `WorktreeInfo` representing the current workspace.

---

## Decision 4: Tree structure when multiple worktrees are present

**Decision**: When `aggregateFeatures` returns more than one `FeatureGroup` (i.e., additional worktrees with features are detected), the tree root renders `WorktreeGroupItem` nodes — one per group. The current workspace group is always first, labelled with the branch name and a "(current)" badge in the description. Each `WorktreeGroupItem` expands to show `FeatureTreeItem` nodes exactly as before. When only one group exists (single-worktree or git unavailable), render the flat list as today — no grouping header is shown, maintaining backwards compatibility.

**Rationale**: Zero-impact for single-worktree users (constitution Gate 5). Progressive disclosure: the overhead of an extra tree level is only introduced when needed.

**Alternatives considered**:
- Always render group items even with a single worktree — rejected; adds visual noise for the common case.
- Flat list with worktree prefix in the feature label — rejected; hard to scan, violates progressive-disclosure principle.

---

## Decision 5: Deduplication strategy for same feature number across worktrees

**Decision**: When the same numeric prefix appears in multiple `FeatureGroup`s, keep the entry with the highest `WorkflowState` (using `STATE_ORDER` from `workflowState.ts`). The winning entry retains its original `WorktreeInfo`, so file-opens still route to the correct worktree. The losing entries are discarded from their groups. If a group becomes empty after deduplication it is dropped entirely.

**Rationale**: `STATE_ORDER` already defines the canonical ordering: `New < Specified < Planned < TasksDefined < Implementing < Complete`. The highest-state feature is the most actionable one to surface. No new ordering logic is needed.

**Alternatives considered**:
- Show all duplicates with branch labels — valid fallback described in spec FR-005 option (b). Rejected for the default because it creates noise for the common case where the same feature is partially merged into multiple branches.
- Merge/union the artifacts from both entries — rejected; creates misleading data (spec.md from one worktree, tasks.md from another would produce incorrect state).
- Let the user configure dedup behaviour via a setting — deferred to a future feature; adds UI surface area not needed for initial delivery.

---

## Decision 6: File watcher scope remains unchanged

**Decision**: `FileWatcher.createSpecsWatcher` continues to watch only `{currentWorkspaceRoot}/specs/`. Remote worktrees are only re-scanned on explicit user refresh.

**Rationale**: Spec FR-007 and FR-008 are explicit: live watching across worktrees is out of scope due to performance cost (each `fs.watch` call is a persistent OS resource). VS Code's file-system watcher API is scoped to workspace folders, and other worktrees are not workspace folders. Watching them would require `chokidar`-style native watchers or polling — neither is acceptable per the constitution's dependency and performance principles.

---

## Decision 7: Maximum worktree scan limit

**Decision**: If `listWorktrees` returns more than 20 entries, scan only the first 20 and show a one-time non-blocking `vscode.window.showWarningMessage` informing the user of the limit.

**Rationale**: SC-005 caps the expected load at 20 worktrees. Scanning unbounded worktree counts risks exceeding the 3-second refresh budget and could cause memory pressure on repos with many stale worktrees. 20 is a generous limit that covers all realistic developer workflows.
