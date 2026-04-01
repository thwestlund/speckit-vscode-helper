# Contract: VS Code Extension Manifest Additions (package.json)

**Feature**: 002-feature-number-chat-worktree  
**References**: [data-model.md](../data-model.md), [research.md](../research.md)  
**Purpose**: Documents the two new VS Code contributions required by US2 and US3.

---

## New Commands

Add to the existing `contributes.commands` array:

```jsonc
{
  "command": "speckit.openFeatureInChat",
  "title": "Open in Chat",
  "category": "SpecKit"
},
{
  "command": "speckit.startInWorktree",
  "title": "Start in Worktree",
  "category": "SpecKit"
}
```

---

## New Context Menu Entries

Add to the existing `contributes.menus["view/item/context"]` array:

```jsonc
{
  "command": "speckit.openFeatureInChat",
  "when": "viewItem =~ /^feature\\./",
  "group": "speckit@0"
},
{
  "command": "speckit.startInWorktree",
  "when": "viewItem =~ /^feature\\./",
  "group": "speckit@5"
}
```

**Group ordering rationale**:
- `speckit@0`: "Open in Chat" appears first in the context menu — it is the most frequently used new action
- `speckit@5`: "Start in Worktree" appears last in the speckit group — it is a one-time developer action

---

## No New Activation Events

No changes to `activationEvents`. The extension continues to activate only on `workspaceContains:.specify/init-options.json`.

## No New Settings

No new `contributes.configuration` entries. Worktree path is always user-specified via dialog and never stored.

## No New Views or View Containers

No changes to `views` or `viewsContainers`.
