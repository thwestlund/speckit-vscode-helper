# Quickstart: SpecKit Visual Extension

**Feature**: 001-speckit-visual-extension
**Date**: 2026-03-31

## Prerequisites

- Node.js 18+ and npm
- VS Code 1.85+
- At least one supported AI chat extension:
  - [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) (recommended)
  - [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-for-vscode)

## Setup

```bash
# Clone and install
git checkout 001-speckit-visual-extension
npm install

# Build
npm run compile

# Run tests
npm test
```

## Development Workflow

```bash
# Start extension in debug mode
# Press F5 in VS Code (launches Extension Development Host)

# Run unit tests only
npm run test:unit

# Run integration tests (requires VS Code instance)
npm run test:integration

# Lint
npm run lint

# Bundle for production
npm run package
```

## Project Structure

```
src/
├── extension.ts              # Entry point: activate/deactivate
├── providers/
│   ├── featureTreeProvider.ts # TreeDataProvider for the sidebar
│   └── featureTreeItem.ts    # TreeItem subclasses
├── models/
│   ├── feature.ts            # Feature entity
│   ├── workflowState.ts      # State derivation from artifacts
│   └── artifact.ts           # Artifact entity
├── services/
│   ├── specDiscovery.ts      # Scan specs/ directory
│   ├── fileWatcher.ts        # FileSystemWatcher setup
│   ├── promptLauncher.ts     # Build and send chat prompts
│   └── templateResolver.ts   # Resolve templates (4-tier)
├── agents/
│   ├── agentRegistry.ts      # Agent selection + availability
│   ├── copilotAgent.ts       # GitHub Copilot adapter
│   └── claudeAgent.ts        # Claude adapter
└── constants.ts              # Shared constants

test/
├── unit/                     # Fast tests, no VS Code instance
└── integration/              # Tests requiring VS Code host
```

## Verification Checklist

After implementation, verify each user story independently:

1. **P1 — Feature Tree**: Open a workspace with `.specify/` and `specs/` → tree appears with features and states
2. **P2 — Live Updates**: Create/delete a spec file → tree updates within 3 seconds
3. **P3 — Prompt Launch**: Right-click a feature → select action → chat opens with pre-filled prompt
4. **P4 — Templates**: Launch a prompt → template with placeholders appears
5. **P5 — Agent Config**: Change `speckit.aiAgent` setting → prompts route to the new agent
6. **P6 — Self-Gen**: Modify a `.specify/templates/` file → notification appears offering sync

## Key Configuration

### VS Code Settings

| Setting | Default | Description |
|---|---|---|
| `speckit.aiAgent` | `"copilot"` | AI agent for prompts (`"copilot"` or `"claude"`) |

### Test Workspace Fixture

For integration tests, create a fixture workspace at `test/fixtures/sample-workspace/`:

```
test/fixtures/sample-workspace/
├── .specify/
│   ├── init-options.json
│   └── templates/
│       ├── spec-template.md
│       └── plan-template.md
└── specs/
    ├── 001-complete-feature/
    │   ├── spec.md
    │   ├── plan.md
    │   └── tasks.md          # All [x]
    ├── 002-in-progress/
    │   ├── spec.md
    │   ├── plan.md
    │   └── tasks.md          # Mixed [x] and [ ]
    ├── 003-planned/
    │   ├── spec.md
    │   └── plan.md
    ├── 004-specified/
    │   └── spec.md
    └── 005-empty/             # Directory only, no files
```
