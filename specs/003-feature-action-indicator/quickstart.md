# Quickstart: Feature Action Required Indicator

**Feature**: 003-feature-action-indicator  
**Date**: 2026-04-01

---

## Prerequisites

- VS Code 1.85+ with the SpecKit Helper extension loaded in Extension Development mode
- A workspace with a `specs/` folder containing multiple feature directories at different lifecycle stages (spec-only, plan-only, tasks with no tasks started, etc.)
- The existing `test/fixtures/sample-workspace/` fixture covers states: complete, implementing, tasks-defined, planned, specified — ideal for manual smoke testing

---

## Running the Existing Test Fixture

The fixtures at `test/fixtures/sample-workspace/specs/` already represent a range of states:

| Fixture folder | State derived | Expected indicator |
|---|---|---|
| `001-complete-feature/` | Complete (all tasks done) | No indicator |
| `002-in-progress/` | Implementing | No indicator |
| `003-planned/` | Planned (plan.md exists, no tasks.md) | ⚠ "Next step: Generate tasks" |
| `004-specified/` | Specified (spec.md only) | ⚠ "Next step: Create a plan" |
| `005-empty/` | New (no artifacts) | ⚠ "Next step: Specify this feature" |

---

## Manual Smoke Test Checklist

### US1 — Visual Indicator

1. Open the Extension Development Host (F5) with the `test/fixtures/sample-workspace` as the workspace
2. Open the SpecKit sidebar panel
3. Verify:
   - `004-specified` and `005-empty` show a yellow/warning icon
   - `003-planned` shows a yellow/warning icon
   - `001-complete-feature` and `002-in-progress` show their normal state icons (no warning)
4. Hover over `004-specified` → tooltip shows `"004-specified (Specified)\nNext step: Create a plan"`
5. Hover over `001-complete-feature` → tooltip shows `"001-complete-feature (Complete)"` (no action suffix)

### US2 — Sort Order

6. Verify that features with ⚠ indicators appear **above** features without in the sidebar list (regardless of feature number order)

### US3 — Auto-update on File Change

7. In the Extension Development Host workspace, create a new file `specs/004-specified/plan.md` (any content)
8. Within 3 seconds, verify the ⚠ indicator disappears from `004-specified` in the sidebar (state advances to Planned, but still needs action → indicator remains but label changes)
9. Create `specs/004-specified/tasks.md` with content `- [ ] Task one`
10. Within 3 seconds, verify the ⚠ label on `004-specified` reads "Next step: Start implementation"
11. Modify `tasks.md` to `- [x] Task one` (check off the task)
12. Within 3 seconds, verify the ⚠ indicator on `004-specified` disappears (state = Complete)

---

## Running Unit Tests

```bash
npm run pretest        # Compile TypeScript test files
npm test               # Run all Mocha tests via @vscode/test-electron
```

Key unit test file for this feature: `test/unit/models/actionState.test.ts`

Expected test output:
```
ActionState
  deriveActionState
    ✓ New → needsAction true, label includes "Specify"
    ✓ Specified → needsAction true, label includes "plan"
    ✓ Planned → needsAction true, label includes "tasks"
    ✓ TasksDefined → needsAction true, label includes "implementation"
    ✓ Implementing → needsAction false, label undefined
    ✓ Complete → needsAction false, label undefined
    ✓ Unknown → needsAction false, label undefined
```

---

## Development Loop

1. Make code changes in `src/`
2. Run `npm run compile` (type-check) or `npm run build` (bundle)
3. Press F5 to reload the Extension Development Host
4. The file watcher in the host will hot-refresh the sidebar on file changes automatically

---

## Key Files Modified by This Feature

| File | Change |
|---|---|
| `src/models/actionState.ts` | **NEW** — `ActionState` interface, `deriveActionState()`, `ACTION_MESSAGES` |
| `src/models/feature.ts` | Add `actionState: ActionState` field to interface |
| `src/services/specDiscovery.ts` | Populate `actionState` via `deriveActionState(state)` in `buildFeature()` |
| `src/providers/featureTreeItem.ts` | Warning icon + extended tooltip when `needsAction` |
| `src/providers/featureTreeProvider.ts` | Sort comparator puts `needsAction` features first |
| `test/unit/models/actionState.test.ts` | **NEW** — 7 unit tests (one per `WorkflowState`) |
| `test/integration/featureTreeProvider.test.ts` | Extended — sort order assertion |
