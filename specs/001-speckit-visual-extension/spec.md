# Feature Specification: SpecKit Visual Extension

**Feature Branch**: `001-speckit-visual-extension`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "This project is a VS Code extension to support the user in the use of SpecKit AI development. The extension should provide live and continuous visual representation of spec ops state. You should be able to see all branches/features, the state of each feature in a tree visualisation. The extension should be able to self-generate in case changes are made to the speckit project. The user should be able to interact with the extension and be used to run prompts. Each step spec/plan/ etc. should have a template prompt that can be used e.g. template for user stories, if you are on that step in the process. Nothing should be stored about the project. This is only about reading speckit files. For prompting the user needs to specify which AI agent is supported. We should include GitHub Copilot and Claude."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Feature Tree (Priority: P1)

As a developer using SpecKit, I want to see a tree view in the VS Code sidebar that lists all SpecKit features/branches and their current workflow state (spec → plan → tasks → implement) so I can instantly understand the progress of every feature without manually browsing files.

**Why this priority**: The tree view is the foundational visual element. Without it, the extension has no purpose. Every other feature (prompting, live updates) builds on top of this view.

**Independent Test**: Can be fully tested by opening a workspace that contains a `.specify/` directory and one or more `specs/` feature folders — the tree should render with correct names and states.

**Acceptance Scenarios**:

1. **Given** a workspace with a `.specify/` directory and `specs/001-my-feature/spec.md`, **When** the extension activates, **Then** a "SpecKit" tree view appears in the sidebar showing feature "001-my-feature" with its current state indicated.
2. **Given** a feature that has `spec.md` and `plan.md` but no `tasks.md`, **When** the user views the tree, **Then** the feature node shows state "Planned" and child nodes for each existing artifact.
3. **Given** no `.specify/` directory in the workspace, **When** VS Code opens, **Then** the SpecKit tree view is hidden and the extension does not activate.
4. **Given** multiple features exist in `specs/`, **When** the user views the tree, **Then** all features are listed in numerical/alphabetical order with their respective states.

---

### User Story 2 - Live File-Watching Updates (Priority: P2)

As a developer, I want the feature tree to update automatically when SpecKit files are created, modified, or deleted so I always see the current state without manually refreshing.

**Why this priority**: A static tree that requires manual refresh would quickly become unreliable. Live updates make the tree trustworthy and are essential for a good user experience alongside the SpecKit workflow.

**Independent Test**: Can be tested by creating or deleting a spec file while the tree is visible and verifying the tree updates within a few seconds.

**Acceptance Scenarios**:

1. **Given** the tree is visible and showing feature "001-my-feature" in state "Specified", **When** the user creates `specs/001-my-feature/plan.md`, **Then** the tree updates to show state "Planned" without the user taking any action.
2. **Given** the tree is visible, **When** a new feature directory `specs/002-new-feature/` with a `spec.md` is created, **Then** the new feature appears in the tree automatically.
3. **Given** a feature's `tasks.md` is deleted, **When** the tree refreshes, **Then** the feature state reverts to the appropriate earlier state.

---

### User Story 3 - Run SpecKit Prompts from Tree (Priority: P3)

As a developer, I want to right-click a feature in the tree (or use a command) to launch the appropriate SpecKit prompt (e.g., `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`) in the chat panel with the correct context pre-filled, so I can advance a feature's workflow without memorizing commands.

**Why this priority**: This is the interactive power of the extension — it turns the tree from read-only into a workflow driver. However, the tree (P1) and live updates (P2) are prerequisites.

**Independent Test**: Can be tested by right-clicking a feature in state "Specified" and verifying that a chat prompt for `/speckit.plan` is opened with the feature's description or branch name pre-filled.

**Acceptance Scenarios**:

1. **Given** a feature in state "Specified", **When** the user right-clicks and selects "Plan Feature", **Then** the chat panel opens with a `/speckit.plan` prompt pre-populated for that feature.
2. **Given** a feature in state "New" (directory exists, no spec.md), **When** the user right-clicks, **Then** the context menu offers "Specify Feature" which opens a `/speckit.specify` prompt.
3. **Given** the user has configured "GitHub Copilot" as their AI agent in settings, **When** they launch a prompt, **Then** the prompt is routed to the GitHub Copilot chat participant.
4. **Given** the user has configured "Claude" as their AI agent, **When** they launch a prompt, **Then** the prompt is routed to the Claude chat participant.

---

### User Story 4 - Template Prompts per Workflow Step (Priority: P4)

As a developer, I want each workflow step (specify, clarify, plan, tasks, implement) to offer a template prompt that guides me through the step — for example, a user-story template when I am at the "specify" step — so I can fill in structured input instead of writing free-form descriptions.

**Why this priority**: Templates improve prompt quality and reduce cognitive load, but the core prompt-launching mechanism (P3) must work first.

**Independent Test**: Can be tested by triggering the "Specify Feature" action and verifying a structured template (with placeholders for user stories, acceptance criteria, etc.) appears in the chat input.

**Acceptance Scenarios**:

1. **Given** the user triggers "Specify Feature" for a new feature, **When** the prompt opens, **Then** it contains a template with placeholders for feature description, user stories, and acceptance criteria.
2. **Given** the user triggers "Plan Feature", **When** the prompt opens, **Then** it contains a template appropriate for planning (technical context, constraints, dependencies).
3. **Given** custom templates exist in the `.specify/templates/` directory, **When** a prompt is launched, **Then** the extension uses the project's templates rather than built-in defaults.

---

### User Story 5 - AI Agent Configuration (Priority: P5)

As a developer, I want to select which AI agent (GitHub Copilot or Claude) the extension uses for prompting through a VS Code setting, so I can use my preferred assistant.

**Why this priority**: Agent selection is a configuration concern that supports the prompting workflow. A reasonable default (GitHub Copilot) can be assumed until the user changes it.

**Independent Test**: Can be tested by changing the AI agent setting and verifying subsequent prompts are sent to the newly selected agent.

**Acceptance Scenarios**:

1. **Given** no AI agent setting is configured, **When** the user launches a prompt, **Then** GitHub Copilot is used as the default agent.
2. **Given** the user sets the AI agent to "Claude" in VS Code settings, **When** they launch a prompt, **Then** the prompt is routed to the Claude chat participant.
3. **Given** the user selects an agent that is not installed, **When** they attempt to launch a prompt, **Then** the extension shows a clear message explaining the required extension is not available.

---

### User Story 6 - Self-Generation on SpecKit Changes (Priority: P6)

As a developer working on the SpecKit extension itself, I want the extension to detect changes to SpecKit's own project files (templates, scripts, prompts) and offer to regenerate or update its own configuration accordingly, so the extension stays in sync with SpecKit evolution.

**Why this priority**: This is a meta-feature specific to the extension's own development lifecycle. It's valuable but not required for day-to-day SpecKit usage by end users.

**Independent Test**: Can be tested by modifying a `.specify/templates/` file and verifying the extension detects the change and offers an update action.

**Acceptance Scenarios**:

1. **Given** a SpecKit template file is modified, **When** the file watcher detects the change, **Then** the extension displays a notification offering to regenerate related configuration.
2. **Given** new SpecKit prompt files are added to `.github/prompts/`, **When** the change is detected, **Then** the extension notifies the user and offers a "Sync" action to reload the window so new prompts take effect; no runtime configuration mutation is performed.
3. **Given** the user dismisses the regeneration notification, **When** they later want to trigger it manually, **Then** a "SpecKit: Sync Extension" command is available in the command palette.

---

### Edge Cases

- What happens when the `specs/` directory exists but contains no feature subdirectories? The tree should display an empty state message (e.g., "No features yet — run /speckit.specify to create one").
- What happens when a feature directory contains unexpected or malformed files? The extension should display the feature with an "Unknown" state and not crash.
- What happens when two VS Code windows open the same workspace? Each window should independently read the file system; no shared state or locking is needed.
- What happens when the user has both GitHub Copilot and Claude extensions installed but selects one that becomes unavailable mid-session? The extension should detect unavailability at prompt time and fall back to an error message, not silently fail.
- What happens when the `.specify/` directory is inside a subdirectory rather than the workspace root? The extension should search upward from the workspace root, consistent with SpecKit's own `find_specify_root` behavior.
- What happens when SpecKit files are changed outside VS Code (e.g., via terminal `git checkout`)? The file watcher should still detect changes and update the tree.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST provide a tree view in the VS Code Activity Bar or Sidebar that displays all SpecKit features discovered under the `specs/` directory.
- **FR-002**: Each feature in the tree MUST display its current workflow state derived from the presence of artifact files (`spec.md`, `plan.md`, `tasks.md`, and implementation markers).
- **FR-003**: The tree MUST update automatically when SpecKit files are created, modified, or deleted, using file-system watching.
- **FR-004**: The extension MUST provide context-menu actions on feature nodes to launch the appropriate SpecKit prompt for the feature's current workflow step.
- **FR-005**: Prompts launched from the extension MUST be routed to the AI agent configured in the user's VS Code settings.
- **FR-006**: The extension MUST support at least two AI agents: GitHub Copilot and Claude.
- **FR-007**: The extension MUST provide a VS Code setting for the user to select their preferred AI agent, defaulting to GitHub Copilot.
- **FR-008**: Each workflow step MUST offer a template prompt that provides structured guidance (placeholders, section headings) appropriate to that step.
- **FR-009**: The extension MUST use templates from the project's `.specify/templates/` directory when available, falling back to built-in defaults.
- **FR-010**: The extension MUST NOT persist, cache, or store any project data. All information MUST be read from the file system on demand or via file watchers.
- **FR-011**: The extension MUST only activate when a `.specify/` directory is detected in the workspace, using a targeted activation event.
- **FR-012**: The extension MUST detect changes to SpecKit project files (templates, scripts, prompts) and display a notification offering to reload the window; the extension MUST NOT mutate any configuration at runtime.
- **FR-013**: The tree view MUST display features in a logical order (numerical by feature number prefix).
- **FR-014**: The extension MUST display child nodes under each feature showing the individual artifacts (spec, plan, tasks, etc.) with their existence status.
- **FR-015**: The extension MUST show an informative empty-state message in the tree when no features exist.
- **FR-016**: The extension MUST handle malformed or incomplete feature directories gracefully, showing them with an "Unknown" state rather than crashing.

### Key Entities

- **Feature**: A SpecKit feature identified by its directory under `specs/` (e.g., `specs/001-my-feature/`). Key attributes: feature number, short name, branch name, current workflow state.
- **Workflow State**: The progress of a feature through SpecKit's lifecycle. Derived from which artifact files exist. States include: New, Specified, Planned, Tasks Defined, Implementing, Complete.
- **Artifact**: An individual SpecKit document within a feature directory (e.g., `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`). Key attributes: file name, existence, last-modified timestamp.
- **AI Agent**: A supported chat agent that can receive prompts. Key attributes: identifier, display name, availability status. Supported agents: GitHub Copilot, Claude.
- **Prompt Template**: A structured text template associated with a specific workflow step. Key attributes: workflow step, template content, source (project-specific or built-in default).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view the full list of SpecKit features and their workflow states within 2 seconds of opening a workspace.
- **SC-002**: The tree view reflects file-system changes (new feature, new artifact, deleted file) within 3 seconds of the change occurring.
- **SC-003**: Users can launch the correct SpecKit prompt for any feature in 2 clicks or fewer (right-click → action).
- **SC-004**: *(Post-launch target — see below)*
- **SC-005**: The extension adds no more than 500ms to VS Code's activation time when a `.specify/` directory is present. *(Aligned with Constitution Principle IV; tighter 200ms target is aspirational — see post-launch targets below.)*
- **SC-006**: The extension consumes zero additional disk space for project data (read-only, no caching or storage).
- **SC-007**: Switching between AI agents requires changing a single setting value — no restart, no additional configuration.
- **SC-008**: *(Post-launch target — see below)*

### Post-Launch Aspirational Targets

*These outcomes require user research or A/B testing to validate and cannot be asserted from code or automated tests.*

- **SC-004-A**: 95% of users can identify a feature's current workflow state from the tree view without consulting documentation.
- **SC-008-A**: Template prompts reduce the time to launch a correctly-structured SpecKit command by at least 50% compared to typing the command and arguments manually.
- **SC-005-A**: The extension adds no more than 200ms to VS Code's activation time for the fastest 90th percentile of machines.

## Assumptions

- Users have the SpecKit workflow already initialized in their workspace (`.specify/` directory exists with standard structure).
- Users have at least one of the supported AI chat extensions (GitHub Copilot Chat or Claude for VS Code) installed and authenticated.
- The SpecKit directory structure follows the conventions established by SpecKit 0.4.0+ (sequential branch numbering, `specs/` directory, standard artifact names).
- The extension targets VS Code 1.85+ which provides stable TreeView, FileSystemWatcher, and Chat Participant APIs.
- The workspace is a local file system (remote workspaces such as SSH or Codespaces may work but are not a primary target for v1).
- Features are identified solely by their directory name under `specs/` — the extension does not need to parse git branches to determine feature identity.
