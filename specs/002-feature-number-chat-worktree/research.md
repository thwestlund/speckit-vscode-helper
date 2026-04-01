# Research: Feature List and Chat UX Improvements

**Feature**: 002-feature-number-chat-worktree  
**Date**: 2026-04-01  
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## Topic 1: Feature number in sidebar label (US1)

**Decision**: Change `FeatureTreeItem` to build its label as `` `${feature.number} ${feature.shortName}` `` when `feature.number` is a non-empty string different from `feature.shortName`; fall back to `feature.shortName` for non-standard directory names where `parseFeatureDirectory` returns the full name as both fields.

**Rationale**: `feature.number` is already populated on every `Feature` object by `parseFeatureDirectory()` in `feature.ts`. The `FeatureTreeItem` constructor currently passes only `feature.shortName` to `super()`. Adding the number prefix is a one-line change. No model changes needed.

**Display format**: `"002 feature-name"` (space separator). This matches the existing `feature.branchName` pattern (`002-feature-name`) and is readable at a glance. A different separator (e.g., `·`) would require a font that renders it clearly; a plain space is universal.

**Alternatives considered**: Showing number in `description` field (right-aligned secondary text) — rejected because `description` is already used for the state label (e.g., "Specified"). Showing number as a badge via `FileDecorationProvider` — rejected as disproportionately complex for a label-only change.

---

## Topic 2: Forcing a new Copilot Chat session (US2)

**Decision**: Invoke `workbench.action.chat.open` with `{ query, isPartialQuery: true, newSession: true }`. If `newSession` is not supported (VS Code < 1.93), fall back silently to the same call without `newSession` — the query is still pre-populated and not auto-sent.

**Rationale**: VS Code 1.93 introduced the `newSession` boolean parameter for `workbench.action.chat.open`. The extension targets VS Code 1.85+, so this parameter cannot be guaranteed. The graceful degradation (falls back to current session) is acceptable: the user still gets the skeleton template, just not necessarily in a new session. The spec assumption states "the VS Code API supports opening new chat sessions programmatically" — this is the best-effort implementation.

**Why not `workbench.action.chat.newChat`**: This internal command exists in some VS Code nightly builds but is not documented as a stable API surface. Using it would be fragile and could break on any VS Code update. The `workbench.action.chat.open` path with `newSession` is the closest to a stable contract.

**`isPartialQuery: true`**: This is preserved from the existing implementation — it pre-populates the chat input without submitting. The spec explicitly requires the message NOT to be auto-sent (FR-003).

**Alternatives considered**: Opening a new VS Code window and sending there — technically possible but would require a multi-step IPC mechanism that is disproportionately complex and fragile.

---

## Topic 3: Skeleton template content (US2)

**Decision**: Use a small hardcoded string constant in `extension.ts` (or the new command handler) — NOT loaded from any `.specify/templates/` file.

**Rationale**: The current `launchPrompt` flow calls `resolveTemplate(step, workspaceRoot)` which first looks for template files under `.specify/templates/`. For the 'specify' step, it locates `spec-template.md` which is the full 140-line specification template — this is what ends up in the chat. The new "Open in Chat" command deliberately bypasses `resolveTemplate` and uses a minimal hardcoded skeleton that satisfies FR-004 and FR-005.

**Skeleton content** (used verbatim as `query`):
```
## User Story 1
As a user... [describe what you want and why]

### Acceptance Criteria
- [ ] [criterion]
- [ ] [criterion]

## User Story 2 *(optional)*
As a user... [describe what you want and why]

### Acceptance Criteria
- [ ] [criterion]
```

This is 13 lines — under the SC-003 limit of 15. It contains zero content from any spec file.

**Alternatives considered**: Loading from a new `.specify/templates/chat-skeleton.md` file — rejected because the spec states "static, hardcoded structure in v1" (Assumptions). Loading from the existing templateResolver with a new 'openInChat' key — would require changes to templateResolver and the workspace template file; unnecessary complexity for a static string.

---

## Topic 4: Running git worktree commands (US3)

**Decision**: Wrap Node.js `child_process.exec` in a `Promise<string>` helper `execGit(args: string, cwd: string)` in `worktreeService.ts`. Parse `git worktree list --porcelain` output to enumerate existing worktrees.

**Rationale**: The extension host is Node.js; `child_process` is available without any additional dependency. `exec` is async (non-blocking on the extension host event loop). VS Code does not provide a first-party git command execution API for worktrees — the closest is `vscode.extensions.getExtension('vscode.git')` to get the Git extension API, but the Git extension API does not expose worktree management. Using `child_process.exec` directly is the standard approach used by many VS Code extensions for git operations.

**`git worktree list --porcelain` output format**:
```
worktree /path/to/main
HEAD abc1234
branch refs/heads/main

worktree /path/to/worktree
HEAD def5678
branch refs/heads/002-feature-name
```
Each worktree block is separated by a blank line. The parser extracts `worktree` (path) and `branch` lines.

**Error handling**: If `exec` rejects (non-zero exit, git not found, branch already checked out elsewhere), the error's `stderr` is extracted and surfaced via `vscode.window.showErrorMessage`. No partial state is left because `git worktree add` is atomic — if it fails, it does not create the directory.

**Alternatives considered**: VS Code Git extension API (`vscode.extensions.getExtension('vscode.git')`) — rejected because it does not expose worktree APIs. Spawning a VS Code integrated terminal — rejected because it cannot capture output or detect completion programmatically.

---

## Topic 5: Opening the worktree in VS Code (US3)

**Decision**: Use `vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true })`.

**Rationale**: Opening a worktree is intended for isolated parallel development — opening in the current window would discard the current workspace state, which would be disruptive (and violate Constitution Principle III: "Non-disruptive updates"). A new window is the correct UX for isolated branches/worktrees. The `vscode.openFolder` command is stable, documented, and available since VS Code 1.0.

**Alternatives considered**: Opening with `forceNewWindow: false` in the current window — rejected; closes current workspace. Using workspace `addFolder` — adds as a multi-root folder, not a clean isolated environment; semantically different and potentially confusing.

---

## Topic 6: Quick Pick flow for worktree selection (US3)

**Decision**: Two-step Quick Pick flow:
1. First pick: `["New Worktree", "Existing Worktree"]` — always shown
2. If "New Worktree": `vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Select Worktree Location', title: 'New Worktree Location' })` → returned folder URI becomes parent; worktree is created at `<selectedParent>/<branchName>`. Then `addWorktree(branchName, resolvedPath)`.
3. If "Existing Worktree": call `listWorktrees()`, filter out the current workspace root, show Quick Pick of `{ label: branchName, description: path }` items; selected item path is opened.

**Dismissal handling**: If the user dismisses any Quick Pick or dialog (returns `undefined`), the command silently exits — no error shown.

**Alternatives considered**: Single-step input box for path — worse UX for existing worktrees (user must know paths). Combining new + existing in one list — confusing to mix "create new" with existing paths.

---

## Topic 7: Impact on existing launchPrompt and context menus (US2)

**Decision**: Add a new command `speckit.openFeatureInChat` alongside existing commands. Do NOT change the existing `launchPrompt` / `specifyFeature` flow — it continues to work as before for the AI workflow commands. The new command replaces the user-facing "Open in Chat" shortcut.

**Rationale**: The existing `specifyFeature`, `planFeature`, etc. commands are AI workflow steps that intentionally include structured prompt context. Changing those would break the AI workflow. The new `openFeatureInChat` is a separate user-initiated action focused on starting a freeform discussion about the feature.

**Context menu placement**: Added with `group: "speckit@0"` so it appears first in the context menu on all feature states (all `viewItem =~ /^feature\./`).
