# SpecKit Helper

A VS Code extension that brings your [SpecKit](https://github.com/thwestlund/speckit) feature workflow into the sidebar — see all features across all git worktrees, launch prompts, and start new worktrees without leaving VS Code.

## Features

- **Feature Tree View**: Activity bar panel shows all SpecKit features with workflow state icons, sorted numerically. Action indicators highlight features that need your attention.
- **Cross-Worktree Visibility**: Features from every checked-out git worktree are aggregated into one view. Multiple worktrees appear as collapsible group headers labelled by branch name, with the current workspace listed first.
- **Live File Watching**: Tree refreshes automatically when SpecKit files are created, modified, or deleted — no manual refresh needed. Remote worktrees update on explicit refresh only.
- **Prompt Launcher**: Right-click any feature to launch the appropriate SpecKit prompt in GitHub Copilot or Claude chat.
- **Open in Chat**: Open any feature directly in a new chat session with a skeleton template pre-filled.
- **Start in Worktree**: Create a new git worktree for a feature branch (or switch to an existing one) directly from the tree. Branches are created automatically if they don't exist yet.
- **Template Prompts**: Each workflow step uses a structured template. Project-level overrides take priority over built-in defaults.
- **AI Agent Selection**: Choose between GitHub Copilot and Claude via VS Code settings.
- **Self-Generation Sync**: Detects changes to `.specify/templates/` and `.github/prompts/` and offers to sync.

## Getting Started

1. Open a workspace initialized with `speckit init` (contains `.specify/init-options.json`)
2. The SpecKit icon appears in the Activity Bar
3. Click to open the **Features** panel — all features are listed with their current workflow state

> **Note**: The **Start in Worktree** and **Open in Chat** commands work in any git workspace, even without a SpecKit project.

## Context Menu Actions

Right-click any feature in the tree:

| Feature state | Available actions |
|---------------|------------------|
| New | Specify Feature |
| Specified | Plan Feature, Clarify Feature |
| Planned | Generate Tasks |
| Tasks Defined / Implementing | Implement Feature |
| Any state | Analyze Feature, Create Checklist, Open in Chat, Start in Worktree |

Click any artifact file (spec.md, plan.md, etc.) in the tree to open it in the editor.

## Multi-Worktree View

When you have more than one git worktree checked out, features are grouped by branch:

- The **current workspace** appears first, labelled with a house icon and `(current)`
- **Remote worktrees** appear below, labelled by branch name with a source-control icon
- If the same feature number exists in multiple worktrees, only the **highest-state** entry is shown (e.g., `implementing` wins over `specified`)
- Worktrees are scanned at startup and on manual refresh — the file watcher only covers the current workspace

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `speckit.aiAgent` | `"copilot"` \| `"claude"` | `"copilot"` | AI agent to use for SpecKit prompts |

To change a setting, open the Command Palette (`Cmd+Shift+P`) → **Preferences: Open User Settings (JSON)** and add:

```json
"speckit.aiAgent": "claude"
```

## Requirements

- VS Code 1.85+
- A git repository
- A SpecKit-initialized workspace (`.specify/init-options.json`) for the full feature tree
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=github.copilot-chat) for Copilot prompts
- [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-for-vscode) for Claude prompts

## Workflow States

| Icon | State | Condition |
|------|-------|-----------|
| 📁 | New | Feature directory exists, no `spec.md` |
| 📄 | Specified | `spec.md` exists |
| ☑️ | Planned | `plan.md` exists |
| 📋 | Tasks Defined | `tasks.md` exists, no completed tasks |
| 🔄 | Implementing | `tasks.md` with some `[x]` tasks |
| ✅ | Complete | `tasks.md` with all tasks `[x]` |

Features that have a **next action available** are sorted to the top and shown with a warning overlay icon.

## Template Resolution Order

Prompt templates are resolved in this priority order:

1. `.specify/templates/overrides/{step}-template.md` — project override
2. `.specify/presets/<id>/templates/{step}-template.md` — preset
3. `.specify/extensions/<id>/templates/{step}-template.md` — extension
4. `.specify/templates/{step}-template.md` — project core
5. Built-in defaults bundled with the extension

## Privacy

This extension stores **nothing**. All data is read on demand from the local file system. No telemetry, no network calls, no disk writes.

