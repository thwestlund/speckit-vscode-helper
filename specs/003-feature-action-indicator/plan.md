# Implementation Plan: Feature Action Required Indicator

**Branch**: `003-feature-action-indicator` | **Date**: 2026-04-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-feature-action-indicator/spec.md`

## Summary

Extend the existing SpecKit VS Code extension sidebar to show a visual "needs action" indicator on each feature whose lifecycle state has a well-defined pending developer step (Specify → Plan → Tasks → Implement). A new `ActionState` model is derived from the existing `WorkflowState` and attached to each `Feature`. The `FeatureTreeItem` is updated to reflect the indicator visually and expose the pending action label as a tooltip suffix. Features needing action are sorted to the top of the sidebar list. No new external dependencies are required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution Principle I)
**Primary Dependencies**: `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies; all visual indicator capabilities are native to the TreeItem and ThemeIcon APIs
**Storage**: N/A — read-only; no persistence
**Testing**: Mocha + `@vscode/test-electron` for integration tests; Mocha + sinon for unit tests
**Target Platform**: VS Code 1.85+ on macOS, Windows, Linux
**Project Type**: VS Code extension (incremental enhancement to feature 001 codebase)
**Performance Goals**: Indicator updates within 3 s of file change (SC-002); sidebar remains responsive with 20+ features (SC-005)
**Constraints**: < 50 MB heap (Constitution IV); no sync file I/O on main thread; indicator logic must not block tree rendering; debounce already in place via `FileWatcher`
**Scale/Scope**: 1–50 features per workspace; indicator derived entirely from already-loaded `Feature.state` — zero extra I/O per feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Pre-Design Status |
|---|-----------|------|-------------------|
| I | Code Quality | TypeScript strict; no `any`; single-responsibility modules; max cyclomatic complexity 10; no dead code | ✅ PASS — `ActionState` will live in a new dedicated module; changes to existing files are additive with no structural widening |
| II | Testing Standards | Unit tests for `deriveActionState` (all states); integration test for sorted indicators in tree | ✅ PASS — `workflowState` tests already exist and will be extended; new `actionState.test.ts` unit file planned |
| III | UX Consistency | VS Code idioms only (ThemeIcon + ThemeColor for decoration; no modal ops); keyboard navigable; tooltip per spec | ✅ PASS — all changes use native TreeItem API; no webviews, no modal dialogs, no focus stealing |
| IV | Performance | Indicator derived from already-loaded `Feature.state` — zero extra I/O; sort is O(n) over small n | ✅ PASS — no new file reads; sort added in `getChildren` which already iterates the list |

**Gate result: ALL PASS — proceed to Phase 0.**

### Post-Design Re-Check (after Phase 1)

| # | Principle | Post-Design Status |
|---|-----------|-------------------|
| I | Code Quality | ✅ PASS — `actionState.ts` is a new, single-purpose module (~40 lines); all modified files remain well under 300 lines; no new `any` types introduced |
| II | Testing Standards | ✅ PASS — unit test file `actionState.test.ts` covers all 7 `WorkflowState` values; integration test covers sort order in provider |
| III | UX Consistency | ✅ PASS — `ThemeIcon('warning')` with `ThemeColor('list.warningForeground')` is the VS Code-standard pattern for attention items in tree views; tooltip suffix preserves existing information |
| IV | Performance | ✅ PASS — `deriveActionState` is a pure synchronous O(1) map lookup per feature; sort is O(n log n) over ≤ 50 features; no additional I/O |

**Post-design gate result: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/003-feature-action-indicator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created here)
```

### Source Code Changes (repository root)

```text
# NEW file
src/models/
└── actionState.ts         # ActionState interface + deriveActionState() + ACTION_MESSAGES map

# MODIFIED files
src/models/
└── feature.ts             # Add actionState: ActionState field to Feature interface
                           # Add actionState population in parseFeatureDirectory (via specDiscovery)

src/services/
└── specDiscovery.ts       # Populate feature.actionState when building Feature objects

src/providers/
├── featureTreeItem.ts     # Use action-aware icon and append pending label to tooltip
└── featureTreeProvider.ts # Sort needs-action features to top in getChildren

# NEW test file
test/unit/models/
└── actionState.test.ts    # Unit tests for deriveActionState (all 7 WorkflowState values)

# MODIFIED test file
test/integration/
└── featureTreeProvider.test.ts  # Add scenario: action-needed features appear before others
```

**Structure Decision**: Single project (Option 1). No new top-level directories. The `actionState.ts` module is kept separate from `workflowState.ts` per single-responsibility (Constitution Principle I): `workflowState.ts` answers "what state is this feature in?" while `actionState.ts` answers "does this state require developer action, and what is that action?".

## Complexity Tracking

No constitution violations. No entries required.

