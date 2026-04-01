# Implementation Plan: Feature List and Chat UX Improvements

**Branch**: `002-feature-number-chat-worktree` | **Date**: 2026-04-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-feature-number-chat-worktree/spec.md`

## Summary

Three focused improvements to the SpecKit sidebar and chat integration: (1) surface the feature number already present in the `Feature` model as part of the visible sidebar label; (2) replace the current "open in existing chat with full template content" approach with a new "Open in Chat" command that forces a new chat session and injects only a minimal barebone skeleton; (3) add a "Start in Worktree" command that invokes `git worktree add` or lists existing worktrees via a Quick Pick and opens the result in a new VS Code window. No new external runtime dependencies are required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution Principle I)
**Primary Dependencies**: `@types/vscode` (VS Code Extension API 1.85+); Node.js `child_process` module (already available in extension host) for git CLI invocation
**Storage**: N/A — read-only for US1/US2; git worktree operations mutate the file system but no extension-owned storage
**Testing**: Mocha + `@vscode/test-electron` for integration tests; Mocha + sinon for unit tests (child_process stubbing)
**Target Platform**: VS Code 1.85+ on macOS, Windows, Linux
**Project Type**: VS Code extension (incremental enhancement to feature 001 codebase)
**Performance Goals**: All three commands provide visible feedback within 200 ms (Constitution IV); worktree creation completes or errors within 10 s (git network/disk bound)
**Constraints**: No sync file I/O on main thread; `child_process.exec` calls must be Promise-wrapped; `workbench.action.chat.open` new-session support is VS Code version-dependent — graceful fallback required
**Scale/Scope**: 1–50 features per workspace; worktree operations are one-off developer actions, not bulk operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Pre-Design Status |
|---|-----------|------|-------------------|
| I | Code Quality | TypeScript strict; no `any`; single-responsibility new module for worktree ops; max cyclomatic complexity 10 | ✅ PASS — new `worktreeService.ts` has single purpose; all existing touched modules remain under 300 lines |
| II | Testing Standards | Unit tests for worktree service (with child_process stubs); integration test for new chat command and label rendering | ✅ PASS — unit and integration test tasks planned before implementation tasks |
| III | UX Consistency | Quick Pick for worktree choice; `showOpenDialog` for path; `showErrorMessage` for failures; no modal dialogs; non-disruptive | ✅ PASS — all new UI uses native VS Code idioms; no webviews; no unexpected focus changes |
| IV | Performance | child_process.exec is async (non-blocking); new command has no startup cost; feature number read from already-loaded Feature model | ✅ PASS — no sync I/O; all git ops are async; label change is O(1) per item |

**Gate result: ALL PASS — proceed to Phase 0.**

### Post-Design Re-Check (after Phase 1)

| # | Principle | Post-Design Status |
|---|-----------|-------------------|
| I | Code Quality | ✅ PASS — `worktreeService.ts` ~70 lines, single purpose; `featureTreeItem.ts` change is 1 line; two new commands kept in `extension.ts` which stays under 300 lines; no `any` types |
| II | Testing Standards | ✅ PASS — test tasks for worktreeService parsing, openInChat command, and label unit test appear before their implementation counterparts |
| III | UX Consistency | ✅ PASS — Quick Pick, `showOpenDialog`, `showErrorMessage` are all VS Code standard idioms; "Start in Worktree" opens in a new window (`forceNewWindow: true`) preventing unexpected focus disruption in current session |
| IV | Performance | ✅ PASS — label change zero I/O; chat open async; git operations async with Promise wrapping; no activation overhead added |

**Post-design gate result: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/002-feature-number-chat-worktree/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (package.json manifest additions)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created here)
```

### Source Code Changes (repository root)

```text
# NEW file
src/services/
└── worktreeService.ts        # execGit(), listWorktrees(), addWorktree()

# MODIFIED files
src/providers/
└── featureTreeItem.ts        # US1: prefix label with feature.number

src/extension.ts              # Register speckit.openFeatureInChat and speckit.startInWorktree

package.json                  # New commands + context menu entries

# NEW test files
test/unit/services/
└── worktreeService.test.ts   # Unit tests with child_process stubs

test/unit/providers/
└── featureTreeItem.label.test.ts  # Unit test: label shows number

test/integration/
└── openInChat.test.ts        # Integration: new-session command invoked with skeleton content
```

**Structure Decision**: Single project (Option 1). No new top-level directories. `worktreeService.ts` is isolated in `services/` following the existing pattern (`specDiscovery.ts`, `fileWatcher.ts`). The two new commands are registered inline in `extension.ts` alongside the existing command registrations — no separate command file needed at this scale.

## Complexity Tracking

No constitution violations. No entries required.


## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
