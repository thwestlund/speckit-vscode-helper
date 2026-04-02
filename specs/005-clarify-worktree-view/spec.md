# Feature Specification: Clarify Worktree-Origin View

**Feature Branch**: `005-clarify-worktree-view`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "The last changes where we made all worktrees carry their own state for each feature is confusing and needs rethinking. As a user, I want clear visualisation of what tree a worktree is originating from and I only want 1 representation of a specific feature state in the specific tree. Lets say 002 originates from main, it should be a child and that child will have the up-to-date representation of its state, which should be clearly visible."

## Clarifications

### Session 2026-04-02

- Q: How should state updates in remote (non-current) worktrees be detected? → A: Manual refresh only — preserve spec-004 P5 behaviour; no background file-watching of remote worktree directories
- Q: How should ownership be resolved when two non-current worktrees both contain the same feature folder? → A: Match by branch name suffix — the worktree whose branch name ends with the feature folder name (e.g. `vscode-speckit-extension-002-add-auth` ends with `002-add-auth`) claims ownership; branch names follow the convention `{project-name}-{feature-number}-{feature-name}`
- Q: What should a single-worktree setup look like in the sidebar? → A: Same grouped structure as multi-worktree — one top-level group with the current branch name as heading, features as children
- Q: Should the current workspace's worktree group be visually distinguished from remote worktree groups? → A: Yes — the current workspace group carries a distinct visual treatment (e.g. bold label, dedicated icon, or "(current)" suffix) in addition to being listed first
- Q: What is the canonical term for the worktree that owns a feature? → A: "home worktree" — avoids collision with git's reserved term "origin"; used consistently throughout the spec

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Features Grouped Under Their Home Worktree (Priority: P1)

As a developer working with multiple git worktrees, I want the sidebar to group features under their home worktree — shown as a clearly labelled parent node — so I can instantly see which branch owns each feature without ambiguity.

**Why this priority**: This is the fundamental UX shift requested. Without a clear parent-child structure (worktree → features), all other improvements in this spec are moot. It directly replaces the current confusing model where each worktree replicates state for all features.

**Independent Test**: Set up two worktrees (e.g., `main` and `002-my-feature`). Open SpecKit. Verify the sidebar shows two labelled groups — one per worktree — each containing only the features whose `specs/` folder lives in that worktree's checkout. Feature `002` appears only under the worktree where its branch is checked out.

**Acceptance Scenarios**:

1. **Given** two worktrees are checked out — `main` (with `specs/001-foo`) and `002-my-feature` (with `specs/002-my-feature`) — **When** the SpecKit sidebar loads, **Then** the sidebar shows exactly two top-level groups: `main` containing `001-foo` and `002-my-feature` containing `002-my-feature`
2. **Given** a feature folder exists only in worktree `A`, **When** I view worktree `B`'s group, **Then** that feature does NOT appear under worktree `B`
3. **Given** a single worktree is active (no additional worktrees), **When** the sidebar loads, **Then** the sidebar shows exactly one top-level group labelled with the current branch name, with features as children — the same visual structure as the multi-worktree layout

---

### User Story 2 - Each Feature Shows Its Own Authoritative State (Priority: P2)

As a developer, when I look at a feature listed under its home worktree group, I want its current workflow state (e.g., "Specified", "Planned", "In Progress") to be visible directly on the item so I can assess progress at a glance without opening any files.

**Why this priority**: Without visible state on the feature item, the grouping from P1 alone still forces users to expand nodes to determine progress. State visibility is the direct antidote to the "confusing" symptom described in the request.

**Independent Test**: With a worktree that has features in different states (e.g., one with only `spec.md`, another with `plan.md`, another with `tasks.md`), open the sidebar and verify that each feature item directly shows its workflow state (badge, icon, or label) without requiring any expansion or hover.

**Acceptance Scenarios**:

1. **Given** feature `002` has `spec.md` and `plan.md` but no `tasks.md`, **When** it appears under its worktree group in the sidebar, **Then** it displays a state label such as "Planned" visible without expanding the item
2. **Given** feature `003` has `spec.md` only, **When** shown in the sidebar, **Then** it displays "Specified" (or equivalent state) on the item directly
3. **Given** a feature's underlying files change on disk, **When** the sidebar refreshes, **Then** the displayed state updates to reflect the latest state from that feature's home worktree

---

### User Story 3 - Worktree Group Label Identifies the Branch Clearly (Priority: P3)

As a developer, I want each worktree group in the sidebar to display its branch name prominently so I know exactly which branch I am looking at when scanning across multiple worktrees.

**Why this priority**: The group label is useless if it only shows a filesystem path or an opaque identifier. Branch name is the most meaningful label in a feature-branch workflow. This is an incremental improvement on top of P1.

**Independent Test**: Check out three worktrees on branches `main`, `002-add-auth`, and `004-payment-flow`. Open the sidebar and confirm that the three group headings display `main`, `002-add-auth`, and `004-payment-flow` respectively.

**Acceptance Scenarios**:

1. **Given** a worktree is on branch `002-add-auth`, **When** its group appears in the sidebar, **Then** the group heading shows `002-add-auth` as the primary label
2. **Given** a worktree is in detached-HEAD state (no branch name), **When** its group appears, **Then** the label falls back to the worktree's short filesystem path or "Detached HEAD"
3. **Given** the current workspace worktree is `main`, **When** multiple groups are shown, **Then** the `main` group appears first in the list AND carries a distinct visual treatment (e.g. bold label, unique icon, or "(current)" annotation) that makes it immediately identifiable as the active workspace

---

### User Story 4 - No Feature Appears in More Than One Group (Priority: P4)

As a developer, I want to see each feature exactly once — under its home worktree — with no duplicates across groups, so the sidebar is not cluttered and I never read conflicting state representations of the same feature.

**Why this priority**: The user explicitly described the previous model (each worktree carrying its own state for every feature) as "confusing". Eliminating cross-group duplication is the direct fix. It follows naturally from P1 but is stated explicitly as a hard constraint.

**Independent Test**: With two worktrees, each having an overlapping `specs/` folder layout (e.g., both have `specs/001-foo` on disk), verify that `001-foo` appears under only one group — its home worktree — and NOT in both.

**Acceptance Scenarios**:

1. **Given** two worktrees both have a `specs/001-foo` directory on disk, **When** the sidebar renders, **Then** `001-foo` appears under exactly one group — the worktree whose branch name ends with `001-foo` wins; if neither or both branch names match by suffix, the current workspace worktree takes precedence, then first `git worktree list` order
2. **Given** I scan the entire sidebar, **When** all groups are expanded, **Then** the same feature number never appears more than once across all groups
3. **Given** a feature is removed from one worktree but still exists in another, **When** the sidebar refreshes, **Then** it appears only in the worktree where it still exists

---

### Edge Cases

- What happens when a worktree is listed by `git worktree list` but its directory no longer exists on disk (e.g., manually deleted)? The group should be omitted silently, and no error state should appear in the sidebar.
- What happens when two different worktrees both have a `specs/002-foo` folder? The deduplication rule (see Assumptions) determines which worktree claims ownership; neither is dropped silently without a deterministic winner.
- What happens when a worktree has a `specs/` folder with no recognised feature directories (empty or unstructured)? The worktree group is still shown with an empty or "No features" placeholder to indicate the group was scanned.
- What happens when git reports a worktree but the branch name cannot be determined? The fallback label rule from User Story 3's second scenario applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sidebar MUST organise features into groups, where each group represents exactly one checked-out git worktree
- **FR-002**: Each worktree group MUST be labelled with its branch name as the primary identifier
- **FR-003**: Each feature MUST appear in exactly one group — determined first by suffix-match (the worktree whose branch name ends with the feature folder name, using the branch naming convention `{project-name}-{feature-number}-{feature-name}`), then by current-workspace priority, then by `git worktree list` order as a final tie-breaker
- **FR-004**: The same feature MUST NOT appear in more than one group simultaneously
- **FR-005**: Each feature item MUST display its current workflow state (e.g., "Specified", "Planned") as a directly visible label or indicator without requiring any interaction to see it
- **FR-006**: The workflow state shown for a feature MUST be derived from the files present in that feature's home worktree, not from any other worktree
- **FR-007**: The current workspace's worktree group MUST be listed first among all groups
- **FR-008**: When a worktree is in detached-HEAD state, its group MUST display a fallback label (short filesystem path or "Detached HEAD")
- **FR-009**: When a worktree directory no longer exists on disk, its group MUST be omitted from the sidebar without showing an error state
- **FR-010**: A single-worktree setup MUST render with the identical grouped structure as a multi-worktree setup — one top-level group node labelled with the current branch name, features as its children; no flat list fallback
- **FR-011**: Remote worktree scanning and state updates MUST only occur on an explicit manual user-triggered refresh; no background file-watching of remote worktree directories is performed
- **FR-012**: The current workspace's worktree group MUST carry a distinct visual treatment (e.g. bold label, dedicated icon, or "(current)" annotation) that differentiates it from remote worktree groups at a glance

### Key Entities

- **Worktree Group**: A top-level sidebar node representing one git worktree checkout. Identified by its branch name (or fallback label). Contains zero or more Feature Items.
- **Feature Item**: A sidebar leaf node representing one feature, shown as a child of its home Worktree Group. Carries the feature number, name, and current workflow state.
- **Home Worktree**: The specific git worktree checkout that contains a feature's `specs/<feature-folder>/` directory and is the canonical source of truth for that feature's workflow state.
- **Workflow State**: The computed status of a feature (e.g., Specified, Planned, In Progress, Complete) derived from the presence of specific artifact files (`spec.md`, `plan.md`, `tasks.md`) within that feature's directory in its home worktree.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with 3 active worktrees can identify which worktree owns any given feature within 5 seconds of opening the sidebar — without opening any files
- **SC-002**: No feature appears under more than one worktree group; the sidebar is free of duplicate feature entries in 100% of tested multi-worktree configurations
- **SC-003**: A developer can read the current workflow state of any feature directly from the sidebar item without expanding nodes or hovering — validated by a task-completion test where 100% of participants identify the state correctly on first look
- **SC-004**: The sidebar renders correctly and without error in a single-worktree setup, confirming zero regression from the previous single-worktree behaviour
- **SC-005**: When a feature's state changes on disk in the **current workspace** worktree, the sidebar reflects the updated state via live file-watching with no manual action required. When a feature's state changes in a **remote** worktree, the sidebar reflects the updated state only after the user manually triggers a refresh — no stale state remains after that refresh.

## Assumptions

- Features are assigned to a worktree by the filesystem location of their `specs/<feature-folder>/` directory. A feature belongs to the worktree whose checkout contains that folder on disk.
- When two worktrees both have the same feature folder on disk, ownership is resolved by this priority chain: (1) the worktree whose branch name ends with the feature folder name — branch names follow the convention `{project-name}-{feature-number}-{feature-name}`, so `vscode-speckit-extension-002-add-auth` ends with `002-add-auth`; (2) the current workspace's worktree if no suffix match is found; (3) first entry in `git worktree list` order as the final deterministic tie-breaker.
- Workflow state is computed as it was previously — from the set of artifact files present (`spec.md`, `plan.md`, `tasks.md`, etc.) — and this computation remains local to each feature's home worktree.
- The feature's branch name is the primary human-readable label for each worktree group. The branch is already available from the existing `git worktree list` integration built in feature 004.
- This feature redesigns the visual tree model only. Actions available on feature items (e.g., Open in Chat, Start in Worktree from feature 002) are preserved as-is and are out of scope for this spec.
- Mobile or web-based VS Code environments are out of scope; this targets desktop VS Code only.
