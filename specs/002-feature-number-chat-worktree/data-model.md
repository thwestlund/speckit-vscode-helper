# Data Model: Feature List and Chat UX Improvements

**Feature**: 002-feature-number-chat-worktree  
**Date**: 2026-04-01  
**References**: [research.md](research.md), [spec.md](spec.md)

---

## US1: Modified — `FeatureTreeItem` label (src/providers/featureTreeItem.ts)

**Change**: The `super()` call in the `FeatureTreeItem` constructor changes from using `feature.shortName` alone to a prefixed label.

**Label construction logic**:
```
label = (feature.number && feature.number !== feature.shortName)
  ? `${feature.number} ${feature.shortName}`
  : feature.shortName
```

**Examples**:

| `feature.number` | `feature.shortName` | Rendered label |
|---|---|---|
| `"002"` | `"feature-name"` | `"002 feature-name"` |
| `"001"` | `"speckit-visual-extension"` | `"001 speckit-visual-extension"` |
| `"unknown-dir"` | `"unknown-dir"` | `"unknown-dir"` (fallback: number === shortName) |

**No other fields change**. `description` continues to show the state label. `tooltip` continues to show `branchName (state)`. `contextValue` unchanged.

---

## US2: New command — `speckit.openFeatureInChat`

**Where registered**: `extension.ts` alongside existing command registrations.

**Behaviour**:
1. Builds the skeleton query string (hardcoded constant — see below)
2. Calls `vscode.commands.executeCommand('workbench.action.chat.open', { query: CHAT_SKELETON, isPartialQuery: true, newSession: true })`
3. No return value; errors bubble via VS Code's standard command rejection path

**Skeleton constant** (`CHAT_SKELETON` — defined at module level in `extension.ts` or extracted to `constants.ts`):
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

**Package.json additions**:
```jsonc
// commands array
{
  "command": "speckit.openFeatureInChat",
  "title": "Open in Chat",
  "category": "SpecKit"
}

// view/item/context menus
{
  "command": "speckit.openFeatureInChat",
  "when": "viewItem =~ /^feature\\./",
  "group": "speckit@0"
}
```

---

## US3: New service — `WorktreeInfo` and `worktreeService.ts`

### `WorktreeInfo` interface

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Absolute filesystem path of the worktree |
| `branch` | `string \| undefined` | Branch name (short ref, e.g., `"002-feature-name"`); `undefined` for detached HEAD worktrees |
| `isCurrentWorkspace` | `boolean` | `true` if this worktree path matches the current VS Code workspace root |

### Exported functions

**`execGit(args: string, cwd: string): Promise<string>`**
- Wraps `child_process.exec` in a Promise; resolves with `stdout`; rejects with a trimmed `stderr` string on non-zero exit
- Not exported from the public module surface of the extension — internal helper only

**`listWorktrees(gitRoot: string): Promise<WorktreeInfo[]>`**
- Runs `git worktree list --porcelain` in `gitRoot`
- Parses the porcelain output by splitting on blank lines, extracting `worktree` and `branch` fields from each block
- Marks the entry whose path equals the current VS Code workspace root folder as `isCurrentWorkspace: true`
- Returns an empty array on parse error (non-throwing)

**`addWorktree(branch: string, targetPath: string, gitRoot: string): Promise<void>`**
- Runs `git worktree add "<targetPath>" "<branch>"` in `gitRoot`
- Rejects with a human-readable error string extracted from `stderr` on failure

### US3: New command — `speckit.startInWorktree`

**Where registered**: `extension.ts`.

**Flow**:
```
1. Quick Pick: ["New Worktree", "Existing Worktree"]
   └── dismissed → return (no error)

2a. "New Worktree" selected:
    showOpenDialog({ canSelectFolders: true }) → parentUri
    └── dismissed → return
    targetPath = path.join(parentUri.fsPath, feature.branchName)
    addWorktree(feature.branchName, targetPath, gitRoot)
    └── rejects → showErrorMessage(err)
    vscode.openFolder(Uri.file(targetPath), { forceNewWindow: true })

2b. "Existing Worktree" selected:
    listWorktrees(gitRoot) → worktrees (filter isCurrentWorkspace=false)
    └── empty list → showInformationMessage("No other worktrees found")
    Quick Pick from worktrees: label=branch ?? path, description=path
    └── dismissed → return
    vscode.openFolder(Uri.file(selected.path), { forceNewWindow: true })
```

**Package.json additions**:
```jsonc
// commands array
{
  "command": "speckit.startInWorktree",
  "title": "Start in Worktree",
  "category": "SpecKit"
}

// view/item/context menus
{
  "command": "speckit.startInWorktree",
  "when": "viewItem =~ /^feature\\./",
  "group": "speckit@5"
}
```

---

## No new persisted entities

All changes are in-memory or delegate to git and the file system. No extension-owned storage is introduced.

---

## `COMMAND_IDS` additions (src/constants.ts)

```ts
openFeatureInChat: 'speckit.openFeatureInChat',
startInWorktree:   'speckit.startInWorktree',
```
