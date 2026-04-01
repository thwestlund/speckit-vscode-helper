# Implementation Plan: Cross-Worktree Feature Visibility

**Branch**: `004-cross-worktree-visibility` | **Date**: 2026-04-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-cross-worktree-visibility/spec.md`

## Summary

The SpecKit sidebar currently only reads `{currentWorkspaceRoot}/specs/`. This feature extends it to aggregate features from **all checked-out git worktrees**, grouped in the tree by branch name, so developers can see every in-flight feature's state from a single window.

**Technical approach**: A new `WorktreeAggregator` service calls the existing `listWorktrees()`, discovers features from each worktree's `specs/` directory in parallel, deduplicates by numeric feature prefix (keeping highest state), and returns typed `FeatureGroup[]`. A new `WorktreeGroupItem` tree node provides the branch-level header. The live file-watcher is unchanged — it continues watching only the current workspace.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode  
**Primary Dependencies**: VS Code Extension API 1.85+, `child_process.exec` (already used via `worktreeService.ts`)  
**Storage**: Filesystem only — reads `specs/` directories via `vscode.workspace.fs`  
**Testing**: Mocha + `@vscode/test-electron`; unit tests use real fixtures or DI (`ExecFn` pattern)  
**Target Platform**: VS Code desktop (macOS, Linux, Windows)  
**Project Type**: VS Code extension  
**Performance Goals**: Sidebar refresh across 5 worktrees × 20 features each completes in under 3 seconds (SC-005)  
**Constraints**: No sync I/O on extension host main thread; no new runtime dependencies; bundle size must not regress  
**Scale/Scope**: Up to 20 worktrees (beyond that a non-blocking warning is shown per SC-005)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Assessment | Status |
|------|-----------|------------|--------|
| Gate 1 | **Code Quality** — TypeScript strict, no `any`, cyclomatic ≤10 per function | `WorktreeAggregator` logic is straightforward map/filter/reduce. `FeatureTreeProvider` will grow but stays ≤300 lines by extracting aggregation to its own service. No `any` needed at any boundary. | ✅ PASS |
| Gate 2 | **Testing** — unit tests for all public APIs, integration tests for VS Code API boundaries | New public APIs: `findGitRoot`, `aggregateFeatures`, `deduplicateByNumber`, `WorktreeGroupItem`. All require unit tests. `WorktreeGroupItem` rendering requires integration test. | ✅ PASS (tests required) |
| Gate 3 | **Performance** — no sync I/O, activation ≤500ms, commands ≤200ms visible feedback | All worktree discovery and `specs/` reads are parallel `Promise.all`. No sync calls. Sidebar refresh shows existing VS Code progress implied by tree update — no new progress indicator unless >1s. | ✅ PASS |
| Gate 4 | **UX Consistency** — VS Code idioms, accessible, non-disruptive | `WorktreeGroupItem` is a standard `vscode.TreeItem` with `Collapsed` state. Branch label follows existing naming convention. No modal dialogs. Graceful fallback to current-workspace-only on git failure. | ✅ PASS |
| Gate 5 | **Constitution Compliance** — deviations documented | No deviations. `worktreeService.ts` reused without modification. Feature is transparently additive — single-worktree users see identical behaviour. | ✅ PASS |

**Post-Design Re-check**: Updated after Phase 1 artifacts generated. No violations found.

## Project Structure

### Documentation (this feature)

```text
specs/004-cross-worktree-visibility/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── feature.ts             # MODIFIED: add worktreeSource: WorktreeInfo field
│   ├── featureGroup.ts        # NEW: FeatureGroup interface { worktree, features }
│   ├── artifact.ts            # unchanged
│   ├── workflowState.ts       # unchanged (STATE_ORDER used for deduplication)
│   └── actionState.ts         # unchanged
├── services/
│   ├── worktreeAggregator.ts  # NEW: findGitRoot(), aggregateFeatures(), deduplicateByNumber()
│   ├── worktreeService.ts     # unchanged (listWorktrees/addWorktree already complete)
│   ├── specDiscovery.ts       # MODIFIED: accept worktreeSource param, attach to Feature
│   ├── fileWatcher.ts         # unchanged (watches current workspace only)
│   └── promptLauncher.ts      # unchanged
├── providers/
│   ├── worktreeGroupItem.ts   # NEW: WorktreeGroupItem extends vscode.TreeItem
│   ├── featureTreeProvider.ts # MODIFIED: use WorktreeAggregator, render group nodes
│   └── featureTreeItem.ts     # unchanged
├── agents/                    # unchanged
├── constants.ts               # unchanged (no new commands)
└── extension.ts               # MODIFIED: pass workspaceRoot.fsPath as gitRoot to provider

test/
├── unit/
│   ├── models/
│   │   └── featureGroup.test.ts          # NEW: TT-FG
│   ├── services/
│   │   └── worktreeAggregator.test.ts    # NEW: TT-WA
│   └── providers/
│       └── worktreeGroupItem.test.ts     # NEW: TT-WGI
├── integration/
│   └── multiWorktree.test.ts             # NEW: TT-MW (requires real fixture)
└── fixtures/
    └── sample-workspace/
        └── specs/               # EXTENDED: add fixtures for multi-worktree scenarios
```

**Structure Decision**: Single-project layout (existing). New code adds one service file, one model file, one provider file. No new runtime or framework. All existing files modified in-place.
