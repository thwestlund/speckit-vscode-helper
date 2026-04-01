# Feature Specification: Feature List and Chat UX Improvements

**Feature Branch**: `002-feature-number-chat-worktree`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "As a user I want to see the feature number in the list. The right-click open in chat feature is not working as planned. It still sends the message in the chat. I also want it to open in a new chat. And the message is not great as we are currently copying the entire md file. The template we load the chat with should be very barebone skeleton of what we would like the user to input. As a developer, I also want the option to start a feature in an existing or new worktree."

## User Scenarios & Testing

### User Story 1 - Feature Number Visible in List (Priority: P1)

As a user, when I look at the feature list in the sidebar, I want to see the feature number alongside the feature name so I can quickly identify and reference features by their number.

**Why this priority**: The feature number is already inherent in the folder structure. Displaying it is a small, high-value improvement that benefits all users immediately with minimal change required.

**Independent Test**: Open the extension with multiple features present. Verify that each entry in the sidebar list shows its number prefix (e.g., "002") alongside or before the feature name — no configuration needed.

**Acceptance Scenarios**:

1. **Given** the sidebar feature list is open, **When** I view any feature entry, **Then** the feature number (e.g., "002") is visible as part of the label
2. **Given** a feature has number "001", **When** it appears in the list, **Then** it shows "001" before the feature name
3. **Given** two features "001-foo" and "002-bar", **When** viewing the list, **Then** both show their respective numbers in the correct order

---

### User Story 2 - Open Feature in New Chat with Skeleton Template (Priority: P2)

As a user, when I right-click a feature in the sidebar, I want to open it in a **new** Copilot Chat pre-populated with a barebone skeleton template so I can describe my feature without seeing the full spec content pasted into chat.

**Why this priority**: The current behavior — sending the full file content into an existing chat session — is noisy and confusing. This improvement directly addresses the primary workflow of using AI to refine feature specs.

**Independent Test**: Right-click a feature and select "Open in Chat". Verify a new chat opens (not the existing one), pre-populated with a minimal skeleton template, without the message being auto-sent.

**Acceptance Scenarios**:

1. **Given** I right-click a feature in the list, **When** I select "Open in Chat", **Then** a new Copilot Chat session opens (not the current active session)
2. **Given** the new chat opens, **When** I view the chat input area, **Then** it contains only a minimal skeleton with user story heading and acceptance criteria checkboxes — not the full spec file content
3. **Given** the new chat opens, **When** the view loads, **Then** the skeleton message is NOT automatically sent — I retain control to edit and send
4. **Given** an existing chat session is active, **When** I open a feature in chat, **Then** the existing chat session remains unchanged

---

### User Story 3 - Start Feature in Worktree (Priority: P3)

As a developer, when I start working on a feature, I want the option to initialize it in a new or existing git worktree so I can keep its code changes isolated from other ongoing work.

**Why this priority**: Worktree support enables parallel feature development without branch switching. It is developer-focused and purely additive — the existing workflow is unaffected if not used.

**Independent Test**: Right-click a feature and select "Start in Worktree". Verify the user is prompted to choose between creating a new worktree or using an existing one, and that the chosen worktree is opened in VS Code.

**Acceptance Scenarios**:

1. **Given** I right-click a feature, **When** I select "Start in Worktree", **Then** I am prompted to choose between "New Worktree" and "Existing Worktree"
2. **Given** I choose "New Worktree", **When** I confirm a location, **Then** a new git worktree is created at that location for the feature branch and opened in VS Code
3. **Given** I choose "Existing Worktree", **When** I select one from the list of available worktrees, **Then** that worktree folder is opened in VS Code
4. **Given** worktree creation fails (e.g., branch already checked out elsewhere), **When** the error occurs, **Then** I receive a clear, human-readable error message and no partial state is left behind

---

### Edge Cases

- What happens if the feature number cannot be parsed from the folder name (non-standard naming)?
- How does "Open in Chat" behave if Copilot Chat is not installed or unavailable?
- What if the worktree path already exists but is not a valid git worktree?
- What if the feature branch does not yet exist in git (spec folder created but branch not pushed)?

## Requirements

### Functional Requirements

- **FR-001**: The feature sidebar list MUST display the feature number (numeric prefix from the folder name, e.g., "002") as part of each feature's visible label
- **FR-002**: The "Open in Chat" context menu action MUST open a new Copilot Chat session rather than reusing or appending to an existing session
- **FR-003**: The "Open in Chat" action MUST NOT automatically send or submit the message — it MUST pre-populate the chat input with a skeleton template and wait for user action
- **FR-004**: The skeleton chat template MUST contain only a user story heading with placeholder text and an acceptance criteria section with checkbox items — not the full spec file content
- **FR-005**: The skeleton template MUST follow this structure at minimum:
  ```
  ## User Story 1
  As a user... [placeholder]

  ## Acceptance Criteria
  - [ ] [criterion]
  - [ ] [criterion]
  ```
- **FR-006**: The feature sidebar context menu MUST include a "Start in Worktree" option per feature entry
- **FR-007**: The "Start in Worktree" action MUST prompt the user to choose between creating a new worktree or selecting from existing worktrees
- **FR-008**: When "New Worktree" is chosen, the system MUST create a git worktree for the feature branch and open it in VS Code
- **FR-009**: When "Existing Worktree" is chosen, the system MUST list available git worktrees and open the selected one in VS Code
- **FR-010**: Worktree errors (e.g., branch already checked out elsewhere) MUST surface a user-readable error message

### Key Entities

- **Feature**: Identified by a number and name derived from its folder (e.g., "002-feature-name"). Has an associated git branch.
- **Feature List Item**: The UI label shown in the sidebar — must display both the feature number and feature name
- **Chat Skeleton Template**: A minimal markdown structure with user story and acceptance criteria headings used to pre-populate a new chat session
- **Worktree**: A git worktree linked to a feature branch, either newly created or pre-existing

## Success Criteria

### Measurable Outcomes

- **SC-001**: The feature number is visible in the sidebar list without any additional configuration or user interaction
- **SC-002**: Every "Open in Chat" action results in a new chat session — no existing sessions are modified
- **SC-003**: The chat skeleton template contains fewer than 15 lines and includes zero content from the spec file
- **SC-004**: A developer can initialize a feature worktree in 3 or fewer interactions (clicks/keystrokes) from the sidebar
- **SC-005**: All worktree error states display a human-readable explanation within 3 seconds of the failure

## Assumptions

- The Copilot Chat extension is installed and the VS Code API supports opening new chat sessions programmatically
- Git is available in the user's environment and git worktrees are a supported capability
- The feature number is always the numeric prefix of the folder name (e.g., "002" from "002-feature-name")
- The skeleton chat template is a static, hardcoded structure in v1 of this feature (not user-configurable)
- Worktrees are created in a user-specified location; no default path is assumed
- The "Start in Worktree" feature only applies to features that have an associated git branch
