# Implementation Plan: SpecKit Visual Extension

**Branch**: `001-speckit-visual-extension` | **Date**: 2026-03-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-speckit-visual-extension/spec.md`

## Summary

Build a VS Code extension that provides a live, read-only tree view of all SpecKit features and their workflow states. The extension discovers features by scanning `specs/` directories, watches the file system for changes, and lets users launch SpecKit prompts (routed to GitHub Copilot or Claude) with step-appropriate templates directly from the tree. The extension stores nothing — all data is read on demand from the file system.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution Principle I)
**Primary Dependencies**: `@types/vscode` (VS Code Extension API 1.85+) — no additional runtime dependencies
**Storage**: N/A — read-only, no persistence (FR-010)
**Testing**: Mocha + `@vscode/test-electron` for integration tests, Mocha + sinon for unit tests
**Target Platform**: VS Code 1.85+ on macOS, Windows, Linux
**Project Type**: VS Code extension
**Performance Goals**: Activation < 500 ms (Constitution IV); tree render < 2 s (SC-001); file-change reflection < 3 s (SC-002)
**Constraints**: < 200 ms activation overhead (SC-005); < 50 MB heap (Constitution IV); zero disk writes; no sync file I/O on main thread
**Scale/Scope**: Typical SpecKit workspace: 1–50 features, each with 2–8 artifacts; single-user local file system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Pre-Design Status |
|---|-----------|------|-------------------|
| I | Code Quality | TypeScript strict mode enabled; no `any`; linter + formatter configured; max cyclomatic complexity 10 | ✅ PASS — project will be scaffolded with strict tsconfig and ESLint from the start |
| II | Testing Standards | Unit tests for all public APIs; integration tests for VS Code API + file system boundaries; test suite < 30 s | ✅ PASS — test tasks will precede implementation tasks; Mocha + vscode-test-electron selected |
| III | UX Consistency | Follow VS Code UX Guidelines; TreeView API only (no custom webviews for P1–P3); keyboard navigable; no disruptive activation | ✅ PASS — all UI uses native TreeView, context menus, and settings; no custom webviews planned |
| IV | Performance | Activation < 500 ms; lazy activation via `workspaceContains:.specify`; no sync I/O; bundled with esbuild | ✅ PASS — activation event scoped; async file ops only; esbuild bundling planned |

**Gate result: ALL PASS — proceed to Phase 0.**

### Post-Design Re-Check (after Phase 1)

| # | Principle | Post-Design Status |
|---|-----------|-------------------|
| I | Code Quality | ✅ PASS — TypeScript strict, ESLint, single-responsibility modules (15 source files, each < 300 lines projected), no `any` in contracts |
| II | Testing Standards | ✅ PASS — test plan covers unit (models, services, agents) and integration (tree, watcher, activation); fixture workspace defined in quickstart.md |
| III | UX Consistency | ✅ PASS — all UI contributions use native TreeView API, ThemeIcon, contextValue-scoped menus; viewsWelcome for empty state; no webviews or modal dialogs |
| IV | Performance | ✅ PASS — `workspaceContains:.specify/init-options.json` activation; async-only file I/O; debounced watcher; esbuild bundling; zero dependencies beyond `@types/vscode` |

**Post-design gate result: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/001-speckit-visual-extension/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── extension.ts              # Activation, disposable registration
├── providers/
│   ├── featureTreeProvider.ts # TreeDataProvider implementation
│   └── featureTreeItem.ts    # TreeItem subclasses (feature, artifact)
├── models/
│   ├── feature.ts            # Feature entity (number, name, state)
│   ├── workflowState.ts      # State derivation logic
│   └── artifact.ts           # Artifact entity
├── services/
│   ├── specDiscovery.ts      # Scan specs/ directory, build feature list
│   ├── fileWatcher.ts        # FileSystemWatcher setup and event routing
│   ├── promptLauncher.ts     # Build and send prompts to chat API
│   └── templateResolver.ts   # Load templates from .specify/templates/ or defaults
├── agents/
│   ├── agentRegistry.ts      # Agent selection and availability checking
│   ├── copilotAgent.ts       # GitHub Copilot adapter
│   └── claudeAgent.ts        # Claude adapter
└── constants.ts              # File names, state mappings, setting keys

test/
├── unit/
│   ├── models/
│   │   ├── feature.test.ts
│   │   ├── workflowState.test.ts
│   │   └── artifact.test.ts
│   ├── services/
│   │   ├── specDiscovery.test.ts
│   │   ├── promptLauncher.test.ts
│   │   └── templateResolver.test.ts
│   └── agents/
│       └── agentRegistry.test.ts
└── integration/
    ├── featureTreeProvider.test.ts
    ├── fileWatcher.test.ts
    └── activation.test.ts
```

**Structure Decision**: Single-project VS Code extension layout. Source in `src/` with models/services/providers separation. Tests in `test/` mirroring source structure. No backend, no frontend — this is a pure extension host project. Driven by Constitution I (single responsibility per module) and III (native VS Code APIs).

## Complexity Tracking

No constitution violations detected. No entries required.
