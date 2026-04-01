# Research: SpecKit Visual Extension

**Feature**: 001-speckit-visual-extension
**Date**: 2026-03-31
**Purpose**: Resolve all technical unknowns identified in the plan's Technical Context.

## R1: VS Code TreeView API for Feature Tree

**Decision**: Use the native `vscode.TreeDataProvider<T>` + `vscode.TreeView` API.

**Rationale**: The VS Code TreeView API is stable (available since VS Code 1.0), fully supports icons, descriptions, context values, badges, and collapsible items. It requires zero dependencies and is the idiomatic way to build sidebar trees. Constitution Principle III (UX Consistency) mandates using VS Code native APIs.

**Alternatives considered**:
- **WebView panel**: More flexible rendering, but heavier (Principle IV — performance), requires HTML/CSS maintenance, loses native keyboard navigation and screen-reader support (Principle III — accessibility). Rejected.
- **Custom Activity Bar icon with WebView**: Overkill for a tree display. Rejected.

**Key API surface**:
- `vscode.window.createTreeView(viewId, { treeDataProvider })` — registers the view
- `TreeDataProvider.getTreeItem(element)` / `getChildren(element?)` — provides tree structure
- `TreeDataProvider.onDidChangeTreeData` — fires to refresh the tree
- `TreeItem.contextValue` — enables scoped context-menu entries in `package.json` menus
- `TreeItem.iconPath` / `ThemeIcon` — for state icons
- `TreeItem.description` — for inline state labels

## R2: FileSystemWatcher for Live Updates

**Decision**: Use `vscode.workspace.createFileSystemWatcher(globPattern)` watching `**/specs/**`.

**Rationale**: Native VS Code API, no dependencies, fires for creates, changes, and deletes including changes made outside VS Code (e.g., git operations). Meets SC-002 (< 3 s reflection).

**Alternatives considered**:
- **chokidar / node fs.watch**: Extra dependency, adds bundle size, duplicates functionality already in VS Code API. Rejected per Constitution IV (dependency adoption) and Technical Decision Framework.
- **Polling with setInterval**: Wasteful, laggy, violates Principle IV (performance). Rejected.

**Implementation notes**:
- Pattern: `**/specs/{*,**/*}` to catch directory creation and file changes at any depth
- Debounce tree refreshes (100–200 ms) to coalesce rapid multi-file operations (e.g., `git checkout`)
- Dispose watcher in `deactivate()` to prevent leaks

## R3: Chat API for Prompt Routing to AI Agents

**Decision**: Use `vscode.commands.executeCommand('workbench.action.chat.open', { query })` to open the chat panel with a pre-filled prompt. For agent routing, prefix the query with the agent's chat participant handle (e.g., `@copilot /speckit.plan ...` or send via the proposed Chat API).

**Rationale**: VS Code's Chat Participant API (proposed in VS Code 1.85+) allows extensions to register chat participants and send messages programmatically. However, since we are routing TO existing participants (Copilot, Claude) rather than registering our own, the simplest approach is to open the chat panel with a pre-constructed prompt string that includes the appropriate `/command` syntax.

**Alternatives considered**:
- **Register a custom chat participant**: The extension would become a chat participant itself. This is appropriate for extensions that answer questions, but our extension is a workflow launcher — it launches prompts, not answers them. Rejected for P1–P5; may revisit for future features.
- **Direct API calls to LLM providers**: Bypasses VS Code's chat UX, violates Principle III (UX consistency), and requires managing auth tokens. Rejected.

**Agent routing strategy**:
- GitHub Copilot: Prompts are sent to the chat panel using `@github` participant or the prompt file reference syntax `/speckit.plan`
- Claude: Prompts include `@claude` participant prefix
- The extension simply constructs the prompt string with the appropriate prefix based on the `speckit.aiAgent` setting.

**Key consideration**: The VS Code Chat API is evolving. The extension should abstract agent routing behind an `AgentAdapter` interface so the routing mechanism can be updated without changing the rest of the codebase.

## R4: Template Resolution Strategy

**Decision**: Follow SpecKit's own 4-tier template resolution order (discovered in `common.sh`).

**Rationale**: Consistency with the SpecKit CLI tooling. Users who customize templates for the CLI should see the same templates in the extension.

**Resolution order** (highest priority first):
1. `.specify/templates/overrides/{name}.md`
2. `.specify/presets/<preset-id>/templates/{name}.md`
3. `.specify/extensions/<ext-id>/templates/{name}.md`
4. `.specify/templates/{name}.md` (core)

**Fallback**: If no project template is found, the extension ships built-in default templates embedded in the extension bundle.

**Template-to-step mapping** (from `.specify/templates/` and `.github/prompts/`):
| Workflow Step | Template | Prompt File |
|---|---|---|
| Specify | spec-template.md | speckit.specify.prompt.md |
| Clarify | — (interactive) | speckit.clarify.prompt.md |
| Plan | plan-template.md | speckit.plan.prompt.md |
| Tasks | tasks-template.md | speckit.tasks.prompt.md |
| Implement | — (code) | speckit.implement.prompt.md |
| Analyze | — (read-only) | speckit.analyze.prompt.md |
| Checklist | checklist-template.md | speckit.checklist.prompt.md |
| Constitution | constitution-template.md | speckit.constitution.prompt.md |
| Tasks→Issues | — (conversion) | speckit.taskstoissues.prompt.md |

## R5: Workflow State Derivation

**Decision**: Derive feature state from file existence in the feature directory (descending priority):

| State | Condition |
|---|---|
| Complete | tasks.md exists AND all tasks marked `[x]` |
| Implementing | tasks.md exists AND some tasks marked `[x]` |
| Tasks Defined | tasks.md exists |
| Planned | plan.md exists |
| Specified | spec.md exists |
| New | Feature directory exists but no spec.md |
| Unknown | Directory exists but contains unexpected content |

**Rationale**: Matches the SpecKit workflow ordering (specify → plan → tasks → implement). State is determined by the highest-stage artifact present. This is consistent with how the bash scripts detect feature progress.

**Implementation note**: Checking task completion status (Complete vs Implementing) requires reading the tasks.md file and counting `[x]` vs `[ ]` markers. This is a lightweight read (regex scan, no parsing needed) but should be async and cached per refresh cycle.

## R6: Activation Strategy

**Decision**: Use `workspaceContains:.specify/init-options.json` as the activation event.

**Rationale**: More specific than `workspaceContains:.specify` (a directory), reducing false positives. The `init-options.json` file is created by `speckit init` and is the definitive marker of a SpecKit-initialized project.

**Alternatives considered**:
- `workspaceContains:.specify` — Matches any workspace with a `.specify` directory, even non-SpecKit ones. Slightly less precise. Acceptable fallback.
- `*` (startup) — Prohibited by Constitution Principle IV.

## R7: Bundling and Extension Packaging

**Decision**: Use esbuild for bundling.

**Rationale**: esbuild is the recommended bundler for VS Code extensions (per official VS Code docs), produces a single-file bundle, supports tree-shaking, and builds in milliseconds. Constitution Principle IV requires bundling.

**Alternatives considered**:
- **webpack**: Heavier configuration, slower builds. esbuild is simpler and faster. Rejected.
- **No bundling**: Prohibited by Constitution Principle IV (bundle size).

## R8: Testing Strategy

**Decision**: Mocha test runner with `@vscode/test-electron` for integration tests.

**Rationale**: `@vscode/test-electron` is the official VS Code extension test runner. It launches a real VS Code instance, enabling integration tests that exercise the TreeView, FileSystemWatcher, and command registration. Mocha is the default test framework in VS Code extension scaffolding.

**Unit tests**: Run directly with Mocha + ts-node, no VS Code instance needed. Test models, services, and template resolution in isolation using sinon stubs for the `vscode` namespace.

**Integration tests**: Run via `@vscode/test-electron`. Test activation, tree rendering, file watcher events, and command execution in a real VS Code instance with a test workspace fixture.

**Coverage**: Use `c8` (Istanbul successor) for code coverage reporting.
