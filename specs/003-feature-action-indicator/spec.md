# Feature Specification: Feature Action Required Indicator

**Feature Branch**: `003-feature-action-indicator`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "As a developer, I have a hard time keeping up with chat prompts that need my immediate action. When working on several features at the same time, its hard to keep track of the situation. If possible, provide a way to easily see if a chat/feature needs my action"

## User Scenarios & Testing

### User Story 1 - Action Indicator on Features in Sidebar (Priority: P1)

As a developer working on multiple features in parallel, I want to see a clear visual indicator on each feature in the sidebar that tells me whether that feature is waiting for my next action, so I can instantly know where to focus without opening each one.

**Why this priority**: This is the core value of the feature — a glanceable signal in the place developers already look (the sidebar). Without this, everything else is less valuable.

**Independent Test**: Open the sidebar with multiple features at various lifecycle stages. Verify that features with a pending developer action show a visual indicator (e.g., a badge or icon) and those without do not. No additional tooling required.

**Acceptance Scenarios**:

1. **Given** a feature has a spec but no plan, **When** I view the sidebar, **Then** that feature shows a "needs action" indicator
2. **Given** a feature has a plan but no tasks file, **When** I view the sidebar, **Then** that feature shows a "needs action" indicator
3. **Given** a feature has tasks that have not been started, **When** I view the sidebar, **Then** that feature shows a "needs action" indicator
4. **Given** a feature is fully up to date with no outstanding next step, **When** I view the sidebar, **Then** no indicator is shown for that feature
5. **Given** a feature transitions from one lifecycle state to the next, **When** the file system changes, **Then** the indicator updates automatically without requiring a manual refresh

---

### User Story 2 - "Needs Action" Grouped View in Sidebar (Priority: P2)

As a developer juggling several features, I want to see all features that currently need my attention grouped together at the top of the sidebar (or in a dedicated section), so I can triage and act on them without scrolling through the full list.

**Why this priority**: Once individual indicators are in place, grouping the "needs action" features reduces cognitive load further — especially when many features exist.

**Independent Test**: With 5+ features at mixed lifecycle stages, verify that only those needing action appear under a "Needs Action" group or are sorted to the top of the list — all without manual filtering.

**Acceptance Scenarios**:

1. **Given** multiple features exist in the workspace, **When** I view the sidebar, **Then** features needing action appear in a distinct group or at the top of the list, separated from features that do not
2. **Given** no features currently need action, **When** I view the sidebar, **Then** the "Needs Action" group is either hidden or shows a "nothing to do" state
3. **Given** a feature's state changes so it no longer needs action, **When** the change is detected, **Then** it moves out of the "Needs Action" group automatically

---

### User Story 3 - Tooltip or Inline Description of Required Action (Priority: P3)

As a developer, when I see a feature marked as needing action, I want to hover over or expand it to see a brief description of what specific action is needed, so I know exactly what to do without having to open the spec or plan files.

**Why this priority**: The indicator tells me *that* something needs doing; this story tells me *what* needs doing. It reduces time-to-action and is the natural next step after visual indicators exist.

**Independent Test**: Hover over a feature marked as "needs action" and verify a tooltip or inline label appears that describes the pending action (e.g., "Plan not yet created").

**Acceptance Scenarios**:

1. **Given** a feature needs a plan created, **When** I hover over its sidebar entry, **Then** a tooltip or label reads something like "Next step: create a plan"
2. **Given** a feature needs tasks generated, **When** I hover over its sidebar entry, **Then** the tooltip reflects that specific next step
3. **Given** a feature has no pending action, **When** I hover over its sidebar entry, **Then** no action-related tooltip is shown (or shows "Up to date")

---

### Edge Cases

- What happens if a feature folder exists but contains no recognized files at all?
- What if the file system state is ambiguous (e.g., a plan file exists but is empty)?
- What if two features are updated simultaneously — are both indicators refreshed correctly?
- What if the workspace has dozens of features — does the grouping/sorting remain performant?

## Requirements

### Functional Requirements

- **FR-001**: The sidebar feature list MUST display a visual indicator (e.g., badge, icon, or decoration) on each feature entry that currently has a pending developer action; the indicator MUST be visually distinguishable at a glance, without needing to hover or click
- **FR-002**: The system MUST determine "needs action" status based on the presence or absence of expected lifecycle artifacts (spec, plan, tasks files) relative to the feature's current stage
- **FR-003**: The indicator MUST update automatically when the underlying files change, without requiring the developer to manually refresh the sidebar
- **FR-004**: The sidebar MUST provide a way to view features needing action grouped or sorted separately from features that are up to date
- **FR-005**: When a developer hovers over a feature with a "needs action" indicator, the system MUST display a human-readable description of the specific action required (e.g., "Plan not yet created", "Tasks not yet generated")
- **FR-006**: The "needs action" state MUST support at minimum these lifecycle transitions:
  - Spec exists, plan does not → needs plan
  - Plan exists, tasks file does not → needs tasks
  - Tasks file exists with no started or completed tasks → needs implementation start
- **FR-007**: The system MUST NOT mark a feature as "needs action" if its current lifecycle state does not have a well-defined next step owned by the developer

### Key Entities

- **Feature Lifecycle State**: The derived state of a feature based on which artifact files (spec, plan, tasks) are present and their content — used to determine whether developer action is required
- **Action Indicator**: A visual decoration shown in the sidebar next to a feature entry when its lifecycle state requires developer input
- **Pending Action Description**: A short, human-readable label describing the specific next step required for a given feature

## Success Criteria

### Measurable Outcomes

- **SC-001**: A developer can identify all features needing their action without opening any individual feature file — visible from the sidebar alone
- **SC-002**: The action indicator reflects the current state of the workspace within 3 seconds of a file system change
- **SC-003**: At least 3 distinct lifecycle transitions are represented by distinct "needs action" states with specific descriptions
- **SC-004**: Developers can reach the top "needs action" feature and begin acting on it in 2 or fewer interactions (clicks/keystrokes) from the sidebar
- **SC-005**: With 20+ features in the workspace, the sidebar remains responsive and indicators load without perceptible delay

## Assumptions

- "Needs action" is determined purely from the presence, absence, or content of speckit artifact files — live Copilot Chat session state is not monitored (out of scope for v1)
- The speckit lifecycle follows a linear progression: spec → plan → tasks → implementation; features deviating from this order are treated as "no action needed" rather than errored
- The file watcher already used by the extension can be extended to trigger indicator updates without a full re-implementation
- A feature with a completed tasks file (all tasks done) is treated as "up to date" with no pending action
- Mobile or multi-window VS Code scenarios are out of scope; the indicator is per-workspace-window
