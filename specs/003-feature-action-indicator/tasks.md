# Tasks: Feature Action Required Indicator

**Input**: Design documents from `/specs/003-feature-action-indicator/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Test tasks appear **before** their corresponding implementation tasks per Constitution Principle II (test-first).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `test/` at repository root
- Paths follow the project structure defined in plan.md

---

## Phase 1: Setup

**Purpose**: Extend the test fixture so all lifecycle states and the 20+ feature count required by SC-005 are covered before coding begins.

- [X] T001 Verify test/fixtures/sample-workspace/specs/ contains 003-planned, 004-specified, and 005-empty directories representing "needs action" states and 001-complete-feature, 002-in-progress representing "no action" states — adjust or add fixture folders as needed per quickstart.md fixture table
- [X] T002 Add 15+ additional fixture feature directories to test/fixtures/sample-workspace/specs/ (e.g., 006-empty through 020-empty, optionally at mixed lifecycle states) to support the SC-005 performance validation with 20+ features — directories may be empty or contain a minimal placeholder spec.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new `actionState.ts` module is a pure shared building block. Following Constitution Principle II, the interface is defined first, tests are written second (red phase), then the function is implemented (green phase).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create src/models/actionState.ts — export `ActionState` interface with `needsAction: boolean` and `pendingActionLabel: string | undefined` fields, and export readonly `ACTION_MESSAGES` map of `WorkflowState` → `string | undefined` covering all 7 values per data-model.md derivation table (leave `deriveActionState` as a stub or not yet exported — implementation comes in T005)
- [X] T004 Create test/unit/models/actionState.test.ts — 7 unit tests (one per `WorkflowState` value) verifying `needsAction` and `pendingActionLabel` for New, Specified, Planned, TasksDefined (all `true` with correct label text) and Implementing, Complete, Unknown (all `false`, label `undefined`); run suite and confirm tests **fail** (red phase, T005 not implemented yet)
- [X] T005 Implement `deriveActionState(state: WorkflowState): ActionState` in src/models/actionState.ts using the `ACTION_MESSAGES` map per research.md Topic 4 and Topic 5; run T004 suite and confirm all 7 tests **pass** (green phase)
- [X] T006 Add `readonly actionState: ActionState` field to the `Feature` interface in src/models/feature.ts — import `ActionState` from `./actionState.js`
- [X] T007 Populate `actionState` in `buildFeature()` in src/services/specDiscovery.ts — call `deriveActionState(state)` immediately after the `deriveState(...)` call and include the result in the returned `Feature` object

**Checkpoint**: `ActionState` derivation is fully tested and `Feature` objects carry the new field — ready for US1, US2, US3 in parallel

---

## Phase 3: User Story 1 — Action Indicator on Features in Sidebar (Priority: P1) 🎯 MVP

**Goal**: Each feature in the sidebar shows a warning icon when its lifecycle state has a pending developer action; up-to-date features show their normal state icon.

**Independent Test**: Open the Extension Development Host with `test/fixtures/sample-workspace`. Verify 003-planned, 004-specified, 005-empty show a yellow warning icon; 001-complete-feature and 002-in-progress show their standard state icons.

### Tests for User Story 1 ⚠️ Write BEFORE implementation (red phase)

- [X] T008 [US1] Create test/unit/providers/featureTreeItem.test.ts — unit tests for `FeatureTreeItem` constructor icon logic: (a) given a `Feature` with `actionState.needsAction: true`, assert `iconPath` is `ThemeIcon('warning')` with `ThemeColor('list.warningForeground')`; (b) given a `Feature` with `actionState.needsAction: false`, assert `iconPath` equals the value from `STATE_ICONS` for the feature's state; run suite and confirm tests **fail** (red phase, T010 not implemented yet)
- [X] T009 [US1] Create test/integration/fileWatcher.indicator.test.ts — integration test for FR-003: simulate creating a `plan.md` file inside a fixture feature folder (e.g., 004-specified) and call `FeatureTreeProvider.refresh()`; assert that the resulting `FeatureTreeItem` for that feature transitions from the warning icon state to the standard state icon (state advances from Specified → Planned, still needs action but label changes); run and confirm test **fails** (red phase, T010 not implemented yet)

### Implementation for User Story 1

- [X] T010 [US1] Update `FeatureTreeItem` constructor in src/providers/featureTreeItem.ts — when `feature.actionState.needsAction` is `true`, set `this.iconPath` to `new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'))`; otherwise keep the existing `STATE_ICONS.get(feature.state)` logic per data-model.md icon selection; run T008 and T009 and confirm all tests **pass** (green phase)

**Checkpoint**: US1 fully functional — warning icons appear and disappear correctly as files change (auto-refresh via existing FileWatcher)

---

## Phase 4: User Story 2 — "Needs Action" Grouped View (Priority: P2)

**Goal**: Features needing action appear at the top of the flat sidebar list, separated from up-to-date features, so they are visible without scrolling.

**Independent Test**: With 5+ features at mixed states in the fixture workspace, verify that all "needs action" features appear before all "no action" features in the sidebar list, and that after a file change moves a feature out of the action state it drops to its correct position automatically.

### Tests for User Story 2 ⚠️ Write BEFORE implementation (red phase)

- [X] T011 [US2] Add sort-order test to test/integration/featureTreeProvider.test.ts — given a fixture with a mix of "needs action" and "no action" features, assert `getChildren()` returns "needs action" items first; also assert that repeating the call with mutated feature data (needsAction flipped) produces the correct reordered result; run and confirm test **fails** (red phase, T012 not implemented yet)

### Implementation for User Story 2

- [X] T012 [US2] Extend the `sortFeatures` function in src/providers/featureTreeProvider.ts — add a primary sort key: features where `actionState.needsAction === true` sort before those where it is `false`; preserve existing feature-number ascending order within each group per data-model.md sort comparator; run T011 and confirm test **passes** (green phase)

**Checkpoint**: US2 fully functional — action-needed features float to the top automatically

---

## Phase 5: User Story 3 — Tooltip with Pending Action Description (Priority: P3)

**Goal**: Hovering over a feature with an action indicator shows a human-readable description of the specific next step in the tooltip.

**Independent Test**: Hover over `004-specified` in the Extension Development Host sidebar — tooltip shows `"004-specified (Specified)"` followed by `"Next step: Create a plan"`. Hover over `001-complete-feature` — tooltip shows only `"001-complete-feature (Complete)"` with no action suffix.

### Tests for User Story 3 ⚠️ Write BEFORE implementation (red phase)

- [X] T013 [US3] Add tooltip unit tests to test/unit/providers/featureTreeItem.test.ts — (a) given `needsAction: true` with `pendingActionLabel: "Next step: Create a plan"`, assert `tooltip` is a `vscode.MarkdownString` containing both the branch/state text and the pending label; (b) given `needsAction: false`, assert `tooltip` is a plain `string` (not a `MarkdownString`); run suite and confirm new tests **fail** (red phase, T014 not implemented yet)

### Implementation for User Story 3

- [X] T014 [US3] Update `FeatureTreeItem` constructor in src/providers/featureTreeItem.ts — when `feature.actionState.needsAction` is `true`, replace the string `tooltip` with a `vscode.MarkdownString` that appends `\n\n${feature.actionState.pendingActionLabel}` to the existing tooltip text; when `needsAction` is `false`, keep the existing string tooltip per data-model.md tooltip format; run T013 and confirm all tests **pass** (green phase)

**Checkpoint**: US3 fully functional — developers can see the exact next step on hover without opening any file

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature end-to-end and confirm performance, edge-case behaviour, and constitution compliance.

- [X] T015 [P] Run `npm run compile` and confirm zero TypeScript errors with strict mode enabled; run ESLint and confirm zero warnings across all modified and new files (Constitution Gate 1)
- [X] T016 [P] Validate SC-005 and SC-002 in the Extension Development Host with the 20+ feature fixture (T002): confirm the sidebar renders without perceptible delay on activation, and that creating or modifying a file in any fixture feature folder causes its indicator to update within 3 seconds
- [X] T017 [P] Add a comment in src/models/workflowState.ts (near `deriveState`) documenting the empty-file edge case: an empty plan.md is treated as `Planned` state because state derivation is based on file presence, not content — no code change required, comment only (E4 resolution)
- [X] T018 Run the full test suite with `npm test` and confirm all existing tests still pass, all new tests in `actionState.test.ts`, `featureTreeItem.test.ts`, `fileWatcher.indicator.test.ts`, and `featureTreeProvider.test.ts` pass with no regressions (Constitution Gate 2)

---

## Dependencies

```
T001, T002 (fixture setup — parallel)
         ↓
T003 (ActionState interface + ACTION_MESSAGES map)
         ↓
T004 (unit tests — RED) → T005 (deriveActionState — GREEN)
                                   ↓
                     T006 (Feature interface) → T007 (specDiscovery wiring)
                                                         ↓
             ┌───────────────────────────────────────────┤
             ↓                    ↓                      ↓
       T008-T009 (red)       T011 (red)             T013 (red)
             ↓                    ↓                      ↓
           T010 (green)        T012 (green)           T014 (green)
             └──────────── T015, T016, T017, T018 ───────┘
```

US1 (T008–T010), US2 (T011–T012), and US3 (T013–T014) are independent of each other and can run in parallel once T007 is complete.

## Implementation Strategy

**MVP** (T001–T010, 10 tasks): Delivers the core visual indicator with full test-first coverage for P1. Immediately useful to any developer working with multiple features.

**Full delivery**: Add US2 (T011–T012) and US3 (T013–T014) as independent increments — each delivers additional value without depending on the other.

- **[P]**: Can run in parallel (different files, no dependencies)
