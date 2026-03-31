# SpecKit Visual Extension

A VS Code extension that provides a **live, read-only visual representation** of SpecKit feature workflow states. See all your features, their current states, and launch SpecKit prompts directly from the sidebar — without leaving VS Code.

## Features

- **Feature Tree View** (P1): Activity bar panel showing all SpecKit features with workflow state icons, sorted numerically
- **Live File Watching** (P2): Tree automatically refreshes when SpecKit files are created, modified, or deleted — no manual refresh needed
- **Prompt Launcher** (P3): Right-click any feature to launch the appropriate SpecKit prompt in GitHub Copilot or Claude chat
- **Template Prompts** (P4): Each workflow step provides a structured template, with support for project-level overrides
- **AI Agent Selection** (P5): Choose between GitHub Copilot and Claude via VS Code settings
- **Self-Generation Sync** (P6): Detects changes to `.specify/templates/` and `.github/prompts/` and offers to sync

## Usage

1. Open a workspace that has been initialized with `speckit init` (contains `.specify/init-options.json`)
2. The SpecKit icon appears in the Activity Bar
3. Click to expand the **Features** panel and see all features with their workflow states
4. Right-click any feature for context-menu actions:
   - **New**: Specify Feature
   - **Specified**: Clarify Feature, Plan Feature
   - **Planned**: Generate Tasks
   - **Tasks Defined / Implementing**: Implement Feature
   - **All states**: Analyze Feature, Create Checklist
5. Click any artifact file in the tree to open it

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `speckit.aiAgent` | `"copilot"` \| `"claude"` | `"copilot"` | AI agent to use for SpecKit prompts |
| `speckit.agentPath` | `string` | `""` | Custom path to the AI agent CLI executable (leave empty to use the default) |

### Editing Settings

`defaultSettings.jsonc` (visible in VS Code's default settings viewer) is **read-only** — it is a reference file showing all available settings with their defaults. To change a setting, edit your **user settings** instead:

- **GUI**: Open the Command Palette (`Cmd+Shift+P`) → `Preferences: Open User Settings`
- **JSON**: Open the Command Palette → `Preferences: Open User Settings (JSON)`

Example `settings.json` entry to switch to Claude:

```json
"speckit.aiAgent": "claude"
```

Settings can also be overridden at the workspace level via `.vscode/settings.json` in your project root.

## Requirements

- VS Code 1.85+
- A SpecKit-initialized workspace (`.specify/init-options.json` present)
- For GitHub Copilot prompts: [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=github.copilot-chat)
- For Claude prompts: [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-for-vscode)

## Workflow States

| Icon | State | Condition |
|------|-------|-----------|
| 📁 | New | Feature directory exists, no `spec.md` |
| 📄 | Specified | `spec.md` exists |
| ☑️ | Planned | `plan.md` exists |
| 📋 | Tasks Defined | `tasks.md` exists, no completed tasks |
| 🔄 | Implementing | `tasks.md` with some `[x]` tasks |
| ✅ | Complete | `tasks.md` with all tasks `[x]` |

## Template Resolution Order

The extension resolves prompt templates using the same priority order as the SpecKit CLI:

1. `.specify/templates/overrides/{step}-template.md` (project override)
2. `.specify/presets/<id>/templates/{step}-template.md` (preset)
3. `.specify/extensions/<id>/templates/{step}-template.md` (extension)
4. `.specify/templates/{step}-template.md` (project core)
5. Built-in defaults (bundled with the extension)

## Extension Data

This extension stores **nothing**. All data is read on demand directly from the file system. No telemetry, no secrets, no disk writes.
