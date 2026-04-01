# Tasks: Cross-Worktree Feature Visibility

**Input**: Design documents from `/specs/004-cross-worktree-visibility/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- All paths are relative to the repo root

---

## Phase 1: Setup

**Purpose**: Create the feature worktree and verify the baseline test suite passes before any changes

- [x] T001 Create git worktree for branch `004-cross-worktree-visibility` at `../vscode-speckit-extension--004`
- [x] T002 Verify 69/69 tests GREEN (`npm test`) in the new worktree before making changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the `Feature` model and `specDiscovery.ts` to carry `worktreeSource`. Every user story depends on this — no story can work without `Feature.worktreeSource` being set.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `worktreeSource: WorktreeInfo` required field to `Feature` interface in `src/models/feature.ts`
- [x] T004 Create `FeatureGroup` interface in `src/models/featureGroup.ts` with fields `worktree: WorktreeInfo` and `features: Feature[]`
- [x] T005 Update `discoverFeatures(specsDir, worktree)` signature in `src/services/specDiscovery.ts` to accept `worktree: WorktreeInfo` parameter and pass it to `buildFeature`
- [x] T006 Update `buildFeature` in `src/services/specDiscovery.ts` to attach `worktreeSource` from the passed `worktree` parameter to each returned `Feature`
- [x] T007 Fix all TypeScript compile errors caused by `Feature.worktreeSource` now being required — update `test/fixtures/` and any test helpers that construct `Feature` objects directly
- [x] T008 Run `npm run compile` and confirm zero errors before proceeding

**Checkpoint**: `Feature` carries `worktreeSource`; `discoverFeatures` accepts a `WorktreeInfo`; tests compile.

---

## Phase 3: User Story 1 — All Worktree Features Aggregated (Priority: P1) 🎯 MVP

**Goal**: On sidebar load and refresh, features from ALL checked-out worktrees appear in the tree.

**Independent Test**: Set up two worktrees each with a `specs/` directory; open the main workspace and verify both worktrees' features appear after a refresh.

- [x] T009 [US1] Create `src/services/worktreeAggregator.ts` with exported `findGitRoot(workspaceRoot: string, execFn?: ExecFn): Promise<string | undefined>` that runs `git rev-parse --show-toplevel`
- [x] T010 [US1] Implement `aggregateFeatures(gitRoot: string, currentWorkspaceRoot: string): Promise<FeatureGroup[]>` in `src/services/worktreeAggregator.ts` — calls `listWorktrees`, discovers features per-worktree in parallel, suppresses per-worktree errors, returns one `FeatureGroup` per worktree with features
- [x] T011 [US1] Implement `deduplicateByNumber(groups: FeatureGroup[]): FeatureGroup[]` in `src/services/worktreeAggregator.ts` — deduplicates by numeric prefix using `STATE_ORDER.indexOf`, removes empty groups after dedup
- [x] T012 [US1] Add >20 worktree guard in `aggregateFeatures`: slice to 20 and call `vscode.window.showWarningMessage` once per session in `src/services/worktreeAggregator.ts`
- [x] T013 [P] [US1] Write unit tests for `findGitRoot` (success, git unavailable) in `test/unit/services/worktreeAggregator.test.ts`
- [x] T014 [P] [US1] Write unit tests for `aggregateFeatures` (single worktree, multi-worktree, per-worktree error isolation, empty specs dir) in `test/unit/services/worktreeAggregator.test.ts`
- [x] T015 [P] [US1] Write unit tests for `deduplicateByNumber` (no duplicates, duplicate kept at higher state, tie kept from current workspace, empty group removed) in `test/unit/services/worktreeAggregator.test.ts`
- [x] T016 [US1] Update `FeatureTreeProvider` constructor in `src/providers/featureTreeProvider.ts` to accept `gitRoot: string` parameter alongside `specsDir`
- [x] T017 [US1] Update `FeatureTreeProvider.refresh()` in `src/providers/featureTreeProvider.ts` to call `aggregateFeatures(gitRoot, ...)` and store `FeatureGroup[]` as internal state instead of `Feature[]`
- [x] T018 [US1] Update `extension.ts` to call `findGitRoot(workspaceRoot.fsPath)` after locating `workspaceRoot`, fall back to `workspaceRoot.fsPath` if undefined, and pass `gitRoot` to `FeatureTreeProvider`
- [x] T019 [US1] Run `npm test` and confirm all existing tests still pass with the foundational changes

---

## Phase 4: User Story 2 — Remote Features Visually Distinct (Priority: P2)

**Goal**: When multiple worktrees have features, the sidebar shows group-level headers labelled by branch name, with the current workspace first.

**Independent Test**: With two worktrees, open the sidebar and verify a group header per worktree appears, current first, remote labelled by branch name; detached-HEAD worktrees show filesystem-path fallback.

- [x] T020 [US2] Create `src/providers/worktreeGroupItem.ts` with `WorktreeGroupItem extends vscode.TreeItem` — label from `worktree.branch` or `basename(path) + " (detached)"`, description `"(current)"` for `isCurrentWorkspace`, icons `ThemeIcon('home')` for current and `ThemeIcon('source-control')` for remote, `contextValue: 'worktreeGroup'`
- [x] T021 [US2] Update `FeatureTreeProvider.getChildren()` in `src/providers/featureTreeProvider.ts`:
  - When root (`!element`) and single group → return flat `FeatureTreeItem[]` (backwards-compatible)
  - When root and multiple groups → return `WorktreeGroupItem[]`
  - When `WorktreeGroupItem` → return `FeatureTreeItem[]` for that group's features
- [x] T022 [US2] Update `sortFeatures` call site in `src/providers/featureTreeProvider.ts` to sort features within each group (existing sort logic unchanged, applied per-group), and sort groups so current workspace is index 0, remotes sorted alphabetically by branch
- [x] T023 [P] [US2] Write unit tests for `WorktreeGroupItem` label logic (current branch, remote branch, detached HEAD, `(current)` description) in `test/unit/providers/worktreeGroupItem.test.ts`
- [x] T024 [US2] Write integration test verifying flat-list rendering is preserved for single-worktree setup in `test/integration/multiWorktree.test.ts`
- [x] T025 [US2] Write integration test verifying `WorktreeGroupItem` nodes appear at root level when two feature groups are present in `test/integration/multiWorktree.test.ts`

---

## Phase 5: User Story 3 — Open Files from Correct Worktree Path (Priority: P3)

**Goal**: Opening an artifact from a remote-worktree feature opens the file at its actual path in the remote worktree, not the current workspace.

**Independent Test**: Expand a remote-worktree feature, click `spec.md` — editor title bar shows the remote worktree path.

- [x] T026 [US3] Verify `specDiscovery.ts` `buildArtifacts` uses the `worktree.path`-rooted `dirPath` already passed in (no extra change needed if T005–T006 are correct); add assertion in unit test that `artifact.filePath` starts with `worktree.path`
- [x] T027 [US3] Update `COMMAND_IDS.openArtifact` handler in `src/extension.ts` to wrap `showTextDocument` in a try/catch and call `vscode.window.showErrorMessage` with a human-readable message if the file cannot be opened (handles stale/removed worktree paths per FR-006 + US3 scenario 3)
- [x] T028 [P] [US3] Write unit test in `test/unit/services/specDiscovery.test.ts` (extend existing file) asserting that `artifact.filePath` values are rooted under the `worktree.path` argument passed to `discoverFeatures`

---

## Phase 6: User Story 4 — Graceful Fallback When Git Unavailable (Priority: P4)

**Goal**: If `git` is missing or `listWorktrees` fails, the sidebar shows current-workspace features normally with no blocking error.

**Independent Test**: Mock `findGitRoot` to return `undefined`; the sidebar loads the current-workspace features unchanged.

- [x] T029 [US4] Confirm `findGitRoot` returns `undefined` (not throws) when `git` is unavailable — covered by T013; add explicit test case if not already present in `test/unit/services/worktreeAggregator.test.ts`
- [x] T030 [US4] Confirm `aggregateFeatures` catches all errors and returns a single-group result (current workspace only) when `listWorktrees` throws — covered by T014; add explicit test case if not already present
- [x] T031 [US4] Update `FeatureTreeProvider.refresh()` to fall back gracefully when `gitRoot` is undefined: skip `aggregateFeatures`, call `discoverFeatures(specsDir, currentWorktreeInfo)` directly, construct a single `FeatureGroup` in `src/providers/featureTreeProvider.ts`

---

## Phase 7: User Story 5 — Manual Refresh Only for Remote Worktrees (Priority: P5)

**Goal**: The live file-watcher only covers the current workspace; remote worktrees update on explicit refresh only.

**Independent Test**: Add a new feature folder to a remote worktree — sidebar does NOT auto-update. Click Refresh — it does.

- [x] T032 [US5] Audit `src/services/fileWatcher.ts` and `extension.ts` to confirm no watcher path is extended to remote worktrees (should already be correct — this is a verification + documentation task)
- [x] T033 [US5] Write unit test in `test/unit/services/fileWatcher.test.ts` (extend existing) asserting that `createSpecsWatcher` is called exactly once with the current `specsDir` URI and not with any remote worktree path

---

## Phase 8: User Story 6 — Duplicate Feature Numbers Deduplicated (Priority: P6)

**Goal**: Same feature number in multiple worktrees is either shown once (highest state wins) or shown with clear branch labels — never unlabelled duplicates.

**Independent Test**: Feature `003` at `specified` in current and `in-progress` in remote → sidebar shows one entry, the `in-progress` one, rooted in the remote worktree.

- [x] T034 [US6] Verify `deduplicateByNumber` correctly removes same-number features at lower state; assert that the winning entry's `worktreeSource` is from the remote worktree when the remote has higher state — add test in `test/unit/services/worktreeAggregator.test.ts` if not covered by T015
- [x] T035 [US6] Write integration test verifying that when the same feature number exists in two groups, the sidebar shows only one entry (the higher-state one) in `test/integration/multiWorktree.test.ts`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T036 Run full `npm test` and confirm all tests GREEN; fix any remaining failures
- [x] T037 Run `npm run compile` — confirm zero TypeScript errors
- [x] T038 Check that `FeatureTreeProvider` remains under 300 lines (constitution Gate 1); extract helpers to `worktreeAggregator.ts` if needed
- [x] T039 Manual smoke test: open workspace with one worktree → flat list unchanged; add a worktree with specs → refresh → group headers appear; open remote artifact → correct path in editor
- [x] T040 Commit all changes on branch `004-cross-worktree-visibility` with message `feat: cross-worktree feature visibility (004)`

---

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: Feature model + specDiscovery changes)
        ├── Phase 3 (US1: WorktreeAggregator + FeatureTreeProvider wired up)
        │     ├── Phase 4 (US2: WorktreeGroupItem + visual grouping)
        │     │     └── Phase 5 (US3: file-open path correctness)
        │     ├── Phase 6 (US4: graceful fallback — depends on Phase 3 fallback path)
        │     ├── Phase 7 (US5: watcher audit — mostly verification, can run after Phase 3)
        │     └── Phase 8 (US6: deduplication — depends on Phase 3 deduplicateByNumber)
        └── Phase 9 (Polish — depends on all above)
```

**Independent stories within Phase 3+**: US4 (T029–T031), US5 (T032–T033), and US6 (T034–T035) can be worked in parallel once Phase 3 is complete.

---

## Parallel Execution Examples

**After Phase 2 completes**, these can run in parallel:

- T013 + T014 + T015 (worktreeAggregator unit tests)
- T023 (WorktreeGroupItem tests) — once T020 is done
- T028 (specDiscovery path assertion) — independent of Phase 3 tree wiring
- T033 (fileWatcher audit test) — fully independent

---

## Implementation Strategy

**MVP scope**: Phases 1–3 (US1) deliver the core aggregation. Features are visible from all worktrees after a refresh — no grouping yet. This alone is a shippable improvement.

**Full delivery**: Phases 4–8 add visual grouping, correct file paths, fallback, watcher audit, and deduplication.

**Suggested order for a single session**: T001 → T002 → T003–T008 (foundation) → T009–T011 (aggregator) → T013–T015 (aggregator tests) → T016–T018 (wire up provider) → T019 → T020–T022 (group items) → T023–T025 (group tests) → T026–T028 (file paths) → T029–T033 (fallback + watcher) → T034–T035 (dedup) → T036–T040 (polish)

---

## Summary

| Phase | User Story | Tasks | Parallel Opportunities |
|-------|-----------|-------|----------------------|
| 1 — Setup | — | T001–T002 | — |
| 2 — Foundation | — | T003–T008 | T005, T006 in parallel after T003 |
| 3 — Aggregation | US1 (P1) | T009–T019 | T013, T014, T015 in parallel |
| 4 — Visual Grouping | US2 (P2) | T020–T025 | T023 parallel after T020 |
| 5 — File Paths | US3 (P3) | T026–T028 | T028 parallel |
| 6 — Fallback | US4 (P4) | T029–T031 | T029, T030 parallel |
| 7 — Watcher Audit | US5 (P5) | T032–T033 | Both parallel after Phase 3 |
| 8 — Deduplication | US6 (P6) | T034–T035 | T034 parallel |
| 9 — Polish | — | T036–T040 | T036, T037 parallel |
| **Total** | | **40 tasks** | |
