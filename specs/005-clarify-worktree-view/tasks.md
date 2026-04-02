# Tasks: Clarify Worktree-Origin View

**Input**: Design documents from `/specs/005-clarify-worktree-view/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (US1–US4)
- Exact file paths in every task description

---

## Phase 1: Setup

**Purpose**: No new project initialization is needed — this feature modifies an existing VS Code extension. Phase 1 confirms the working branch and verifies the build pipeline is healthy before changes begin.

- [x] T001 Confirm working branch is `005-clarify-worktree-view` and `npm run compile` passes with zero errors

---

## Phase 2: Foundational — `deduplicateFeatures` Algorithm

**Purpose**: The deduplication function is the core prerequisite that all user stories (US1, US4) depend on. It must exist and be tested before any provider or rendering changes touch it.

⚠️ **CRITICAL**: US1 and US4 implementation cannot begin until T003 is complete.

- [x] T002 Add exported function `deduplicateFeatures(groups: FeatureGroup[]): FeatureGroup[]` to `src/services/worktreeAggregator.ts` implementing the three-priority-chain algorithm (list-order pass → current-workspace override → suffix-match override) per quickstart.md
- [x] T003 Add unit tests for `deduplicateFeatures` in `test/unit/services/worktreeAggregator.test.ts` covering: suffix-match wins over current-workspace, current-workspace wins over list-order when no suffix match, list-order wins when neither applies, no-duplicate feature is unaffected, three-worktree conflict resolves to single winner

**Checkpoint**: `deduplicateFeatures` is implemented and all T003 unit tests pass.

---

## Phase 3: User Story 1 — Features Grouped Under Their Home Worktree (Priority: P1) 🎯 MVP

**Goal**: Call `deduplicateFeatures` inside `aggregateFeatures` so each feature appears under exactly one worktree group.

**Independent Test**: Set up two worktrees both containing `specs/001-foo`. Open the sidebar and verify `001-foo` appears under exactly one group.

- [x] T004 [US1] Call `deduplicateFeatures` inside `aggregateFeatures` in `src/services/worktreeAggregator.ts` — apply it to `groupResults` before passing to `sortGroups`
- [x] T005 [US1] Update the empty-group filter in `aggregateFeatures` (`src/services/worktreeAggregator.ts`): retain groups whose `specs/` directory was accessible even if deduplication reduced their feature count to zero; omit only groups whose directory was inaccessible
- [x] T006 [US1] Update integration test `test/integration/featureTreeProvider.test.ts`: assert that a feature present in two worktrees appears under exactly one `WorktreeGroupItem`

**Checkpoint**: US1 is fully functional — duplicate feature entries no longer appear in any multi-worktree configuration tested.

---

## Phase 4: User Story 2 — Each Feature Shows Its Authoritative State (Priority: P2)

**Goal**: Feature items already display state via `FeatureTreeItem`. This story verifies that the state shown is always sourced from the feature's home worktree (the worktree that now owns it after deduplication) — not a stale copy from another worktree.

**Independent Test**: With two worktrees, add `plan.md` to a feature only in worktree A, confirm the sidebar shows "Planned" for that feature only when worktree A is the home worktree.

- [x] T007 [P] [US2] Verify in `src/services/specDiscovery.ts` that `buildFeature` derives state from the `dirPath` inside the worktree it is called with — confirm no cross-worktree path leakage (read-only audit; fix if path construction is incorrect)
- [x] T008 [US2] Add integration test in `test/integration/featureTreeProvider.test.ts` asserting that a feature's displayed `WorkflowState` matches the artifact files in its home worktree group, not any other worktree

**Checkpoint**: US2 verified — state displayed is always authoritative from the home worktree.

---

## Phase 5: User Story 3 — Worktree Group Label Identifies Branch Clearly (Priority: P3)

**Goal**: Each `WorktreeGroupItem` already shows the branch name as its label and `(current)` + `home` icon for the current workspace. This story verifies correctness of detached-HEAD fallback and ordering.

**Independent Test**: Check out three worktrees on distinct branches. All three group headings display their branch names correctly; the current workspace group appears first.

- [x] T009 [P] [US3] Verify `WorktreeGroupItem` constructor in `src/providers/worktreeGroupItem.ts` uses `path.basename(worktree.path)` as fallback when `worktree.branch` is `undefined`; update label to append `" (detached)"` only when branch is truly absent (current code already does this — confirm no change needed or apply fix)
- [x] T010 [P] [US3] Add unit test in `test/unit/providers/worktreeGroupItem.test.ts` covering: branch-name label, detached-HEAD fallback label, `(current)` description present for current workspace, `home` icon for current workspace, `source-control` icon for remote worktrees

**Checkpoint**: US3 verified — labels are correct in all branch-name and detached-HEAD scenarios.

---

## Phase 6: User Story 4 — No Feature Appears in More Than One Group (Priority: P4)

**Goal**: Explicit contract test asserting zero duplication at the tree-data level after deduplication.

**Independent Test**: Scan the full `_groups` array across all worktrees and assert each `feature.branchName` appears exactly once.

- [x] T011 [US4] Add unit test in `test/unit/services/worktreeAggregator.test.ts`: call `aggregateFeatures` with a mock that returns overlapping features across three groups; assert resulting `FeatureGroup[]` has each `branchName` in at most one group
- [x] T012 [US4] Add integration test in `test/integration/featureTreeProvider.test.ts`: expand all `WorktreeGroupItem` children and assert no `FeatureTreeItem` label appears more than once across all groups

**Checkpoint**: US4 contract holds — deduplication is verified end-to-end from `aggregateFeatures` down to the rendered tree items.

---

## Phase 7: User Story 1 (continued) — Single-Worktree Always Shows Grouped Structure

**Goal**: Remove the flat-list branch in `FeatureTreeProvider.getChildren` so single-worktree setups render identically to multi-worktree setups.

**Independent Test**: Open the extension with exactly one worktree; `getChildren(undefined)` returns a `WorktreeGroupItem[]`, not a flat `FeatureTreeItem[]`.

- [x] T013 [US1] Remove the `if (this._groups.length <= 1)` flat-list branch from `FeatureTreeProvider.getChildren` in `src/providers/featureTreeProvider.ts`
- [x] T014 [US1] Add empty-group placeholder to `FeatureTreeProvider.getChildren` in `src/providers/featureTreeProvider.ts`: when `element instanceof WorktreeGroupItem` and `element.group.features.length === 0`, return a single non-interactive `vscode.TreeItem` labelled `'(no features)'` with `contextValue = 'noFeatures'`
- [x] T015 [US1] Update integration test `test/integration/featureTreeProvider.test.ts`: single-worktree scenario now expects `getChildren(undefined)` to return `[WorktreeGroupItem]` with the current branch name as label, and features as children of that group

**Checkpoint**: Single-worktree renders with identical grouped structure to multi-worktree. All prior checkpoints still hold.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T016 [P] Run `npm run compile` and confirm zero TypeScript errors across all modified files: `src/services/worktreeAggregator.ts`, `src/providers/featureTreeProvider.ts`, `src/providers/worktreeGroupItem.ts`
- [x] T017 [P] Run full unit test suite (`npm run pretest`) and confirm all tests pass with no coverage regression
- [x] T018 Run end-to-end quickstart validation per `quickstart.md`: manually verify sidebar with two worktrees shows one group per worktree, no duplicates, correct state labels, `(current)` annotation on active workspace group

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS Phases 3 and 7
- **Phase 3 (US1 – deduplication wiring)**: Depends on Phase 2 (T002 complete)
- **Phase 4 (US2 – state authority)**: Depends on Phase 3 (deduplication wired); T007 is independently runnable [P]
- **Phase 5 (US3 – labels)**: Independently runnable after Phase 1; T009 and T010 are both [P]
- **Phase 6 (US4 – no-duplicate contract)**: Depends on Phase 3 (T004 complete)
- **Phase 7 (US1 – single-worktree display)**: Depends on Phase 2; T013 must precede T014 and T015
- **Phase 8 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational (T002) → T004, T005, T006, T013, T014, T015
- **US2 (P2)**: US1 deduplication wired (T004) → T007 [P], T008
- **US3 (P3)**: Phase 1 only → T009 [P], T010 [P] — fully independent
- **US4 (P4)**: T004 complete → T011, T012

### Within Each Phase

- Foundational algorithm (T002) must precede all wiring tasks
- Unit tests (T003) must be written alongside T002 and PASS before T004 proceeds
- T013 (remove flat-list branch) must precede T015 (update integration test expectation)

### Parallel Opportunities

- T001 is a single prerequisite gate
- T003 is developed alongside T002 (test-driven)
- T007 (US2 audit) and T009, T010 (US3) can all run concurrently with Phase 3 implementation
- T016 and T017 (Phase 8) can run in parallel

---

## Implementation Strategy

**Recommended sequence (MVP = US1 only):**

```
T001 → T002+T003 → T004 → T005 → T006 → T013 → T014 → T015
                                                            ↓
                    T007[P], T009[P], T010[P] in parallel  → T008, T011, T012 → T016[P] + T017[P] → T018
```

**MVP scope**: Phases 1–3 + Phase 7 deliver the full user-visible fix (no duplicates, always grouped). Phases 4–6 add verification depth. Phase 8 is final gate.

**Total tasks**: 18  
**Parallelizable**: T007, T009, T010, T016, T017 (5 tasks)
