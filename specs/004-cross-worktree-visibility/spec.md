# Feature Specification: Cross-Worktree Feature Visibility

**Feature Branch**: `004-cross-worktree-visibility`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "Cross-worktree feature visibility: The sidebar should aggregate features from ALL git worktrees (not just the current workspace root), so the user can see a feature's state even if it lives on a different worktree/branch."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - All Worktree Features Aggregated in Sidebar (Priority: P1)

As a developer working with multiple git worktrees, I want the SpecKit sidebar to show features from all checked-out worktrees (not just the current one) so I can see the state of every in-flight feature at a glance without switching VS Code windows.

**Why this priority**: This is the entire purpose of the feature. Without aggregating features from other worktrees, nothing else in this spec has value. It is the foundational capability that all other stories build upon.

**Independent Test**: Set up two worktrees in the same repo (e.g., `main` and `004-my-feature`), each with a different `specs/` layout. Open the workspace at the `main` root and verify the sidebar shows features from both worktrees.

**Acceptance Scenarios**:

1. **Given** two worktrees are checked out (current: `main`, other: `004-my-feature`), each with a `specs/` directory, **When** the SpecKit sidebar loads, **Then** features from both worktrees appear in the sidebar
2. **Given** a worktree has no `specs/` directory, **When** the sidebar loads, **Then** that worktree contributes no entries but does not cause an error or blank screen
3. **Given** three worktrees are checked out, **When** the sidebar loads, **Then** all three worktrees' features are discovered and displayed

---

### User Story 2 - Remote Worktree Features Are Visually Distinct (Priority: P2)

As a developer, I want features from other worktrees to be visually grouped and labelled by their branch name so I can clearly distinguish "my current work" from "features on other worktrees" without confusion.

**Why this priority**: Without visual distinction, aggregated features with no provenance would look identical to local ones, potentially leading to opening the wrong file or misreading a feature's state. Clear grouping is critical for usability alongside P1.

**Independent Test**: With two worktrees each holding features, confirm that features from other worktrees appear under a labelled group (e.g., the branch name), visually separate from the current workspace's features.

**Acceptance Scenarios**:

1. **Given** a feature exists in a remote worktree on branch `002-feature-x`, **When** viewed in the sidebar, **Then** it appears under a section or label showing the branch name `002-feature-x`
2. **Given** features from the current workspace and from a remote worktree are both displayed, **When** the user scans the list, **Then** current-workspace features and remote-worktree features are clearly separated in the UI (current workspace group listed first)
3. **Given** a remote worktree is in detached-HEAD state (no branch name), **When** its features appear in the sidebar, **Then** they are labelled with the worktree's filesystem path or a fallback label such as "Detached HEAD"

---

### User Story 3 - Open Files from the Correct Worktree Path (Priority: P3)

As a developer, when I expand a feature from another worktree in the sidebar and open one of its artifacts, I want the file to open from that worktree's filesystem path so I am editing the right file on the right branch.

**Why this priority**: Opening the wrong file is a serious usability defect. If a user unknowingly edits the current-workspace copy of a file that belongs to a feature on another branch, they risk corrupting their work.

**Independent Test**: Expand a feature from a remote worktree in the sidebar and open its `spec.md`. Verify the editor title bar shows the path of the remote worktree, not a path within the current workspace.

**Acceptance Scenarios**:

1. **Given** feature `002-my-feature` exists in a worktree at `/repo/worktrees/002-my-feature/`, **When** I click to open its `spec.md`, **Then** VS Code opens `/repo/worktrees/002-my-feature/specs/002-my-feature/spec.md` — not a file in the current workspace
2. **Given** the remote worktree is accessible, **When** the user opens an artifact, **Then** the file opens successfully without errors
3. **Given** the remote worktree path no longer exists on disk (worktree was removed since last refresh), **When** the user attempts to open a file, **Then** a clear human-readable error message is shown and no file is opened

---

### User Story 4 - Graceful Fallback When Git Is Unavailable (Priority: P4)

As a developer using the extension on a machine without git, or in a workspace where git is not initialised, I want the SpecKit sidebar to continue showing current-workspace features normally — without errors or broken UI — so the extension never regresses on a non-worktree setup.

**Why this priority**: Defensive fallback prevents the extension from degrading an otherwise working workspace. Users who do not use worktrees should see zero impact from this feature.

**Independent Test**: Simulate git being unavailable (mock `listWorktrees` to throw) and verify the sidebar still shows current workspace features with no blocking error message or empty state.

**Acceptance Scenarios**:

1. **Given** `git` is not available or the workspace is not a git repository, **When** the sidebar loads, **Then** features from the current workspace are shown normally with no error modal or broken state
2. **Given** `listWorktrees` throws an unexpected error, **When** the sidebar builds its tree, **Then** the extension falls back to current-workspace-only mode and shows at most a non-blocking notification
3. **Given** git is available but a specific worktree's `specs/` directory is unreadable (e.g., permission error), **When** the sidebar builds its list, **Then** that worktree is skipped silently and all other worktrees are still included

---

### User Story 5 - Manual Refresh Controls Remote Worktree Scanning (Priority: P5)

As a developer, I want the sidebar to only re-scan remote worktrees when I explicitly request a refresh, so the sidebar remains performant and I am not surprised by background file-system access to unrelated branches.

**Why this priority**: Extending the live file-watcher to all worktrees would be expensive and could cause surprising behaviour. Keeping remote refresh under user control ensures performance and predictability.

**Independent Test**: Add a new feature to a remote worktree's `specs/` folder without triggering a manual refresh. Confirm the sidebar does NOT automatically update. Then trigger the refresh and confirm the new feature appears.

**Acceptance Scenarios**:

1. **Given** a new feature folder is created in a remote worktree's `specs/` directory, **When** no manual refresh is triggered, **Then** the sidebar does NOT automatically update to show the new feature
2. **Given** the user clicks the "Refresh" action in the SpecKit sidebar, **When** the refresh completes, **Then** all remote worktrees are re-scanned and the sidebar reflects the latest discovered state
3. **Given** a file changes in the current workspace's `specs/` directory, **When** the live file-watcher fires, **Then** the current workspace's features update immediately but remote worktree features are NOT re-scanned

---

### User Story 6 - Duplicate Feature Numbers Deduplicated or Labelled (Priority: P6)

As a developer who has the same feature number active on both `main` and a feature branch, I want the sidebar to either deduplicate and show the most advanced state, or clearly label both entries by their worktree, so I am never confused by an unexplained duplicate.

**Why this priority**: Deduplication applies only when the same feature number exists in multiple worktrees — a relatively uncommon state. The fallback (showing both entries with labels) is safe and always acceptable.

**Independent Test**: Create feature `003` in two worktrees with different workflow states (e.g., `specified` in one, `in-progress` in another). Confirm the sidebar shows either one deduplicated entry at the higher state, or two clearly labelled entries — but never an unlabelled duplicate.

**Acceptance Scenarios**:

1. **Given** feature `003` exists in the current workspace (state: `specified`) and in a remote worktree (state: `in-progress`), **When** the sidebar loads, **Then** feature `003` is either shown once with the `in-progress` state or shown twice with each entry clearly labelled by its worktree/branch — never shown twice without labels
2. **Given** all occurrences of a feature number have identical workflow states, **When** deduplication is applied, **Then** the feature appears once with no duplicate entry
3. **Given** deduplication shows the "most advanced" entry, **When** the user opens a file from that entry, **Then** the file opened belongs to the worktree where the feature has the most advanced state

---

### Edge Cases

- What happens if two worktrees share the same feature number but different feature names (e.g., `003-auth` vs `003-login`)?
- How does the sidebar behave when a worktree is removed from disk between refreshes (stale entry)?
- What if a worktree's `specs/` directory contains folder names without a numeric prefix (non-standard naming)?
- What if the current workspace IS the primary git worktree — does it still appear in its own "current" group?
- What if the user has more than 20 worktrees checked out simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On sidebar load and on any explicit user-initiated refresh, the extension MUST call `listWorktrees(gitRoot)` to enumerate all currently checked-out git worktrees
- **FR-002**: For each discovered worktree, the extension MUST read that worktree's `specs/` directory (if present) and discover features using the same discovery logic applied to the current workspace
- **FR-003**: Features discovered from a worktree other than the current workspace MUST be visually grouped or labelled by the worktree's branch name in the sidebar
- **FR-004**: Features from the current workspace MUST appear in a distinct group that is listed first, separate from any remote-worktree feature groups
- **FR-005**: When the same feature number is present in multiple worktrees, the extension MUST either (a) show a single deduplicated entry using the most advanced workflow state, or (b) show each entry with a clear per-entry worktree/branch label — showing unlabelled duplicates is NOT permitted
- **FR-006**: Opening (expanding) an artifact (e.g., `spec.md`, `plan.md`, `tasks.md`) from a remote-worktree feature MUST open the file at its absolute path within the remote worktree — not from the current workspace's directory
- **FR-007**: The live file-watcher MUST only watch the current workspace's `specs/` directory — it MUST NOT be extended to watch other worktrees' `specs/` directories
- **FR-008**: Remote worktree features MUST ONLY be refreshed when the user explicitly triggers a refresh (via the sidebar refresh button or equivalent command) — no automatic background refresh for remote worktrees
- **FR-009**: If `listWorktrees` fails for any reason, or if git is unavailable, the extension MUST fall back to current-workspace-only behaviour with no blocking error message or broken UI state
- **FR-010**: Per-worktree read errors (e.g., unreadable `specs/` directory for one worktree) MUST be silently skipped; all other reachable worktrees MUST still be processed
- **FR-011**: A worktree in detached-HEAD state (no branch name) MUST use the worktree's filesystem path or the label "Detached HEAD" as its group/label in the sidebar

### Key Entities

- **WorktreeSource**: Represents a discovered git worktree. Key attributes: filesystem path, branch name (may be undefined for detached HEAD), flag indicating whether it is the current workspace.
- **Feature**: An existing entity now extended to carry a reference to its `WorktreeSource`, enabling the sidebar to label it correctly and open its files from the right path.
- **FeatureGroup**: A UI-level grouping in the sidebar tree. Each worktree with at least one feature contributes one `FeatureGroup` labelled by branch name; the current workspace group is listed first.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All features from all currently checked-out worktrees appear in the sidebar after a single refresh, without any additional configuration or user action beyond the refresh
- **SC-002**: Every feature entry from a remote worktree carries a visible branch or path label — zero unlabelled remote-worktree features appear in the sidebar
- **SC-003**: Opening any file artifact from a remote-worktree feature always opens the file from that worktree's path — no misrouted opens to the current workspace's copy
- **SC-004**: When git is unavailable or `listWorktrees` fails, the sidebar loads with current-workspace features in the same time and with the same feature set as before this feature was introduced — zero regression for non-worktree users
- **SC-005**: A sidebar refresh across 5 actively checked-out worktrees (each with up to 20 features) completes in under 3 seconds on a typical developer machine

## Assumptions

- The `worktreeService.listWorktrees` function already exists and is tested; this feature adds a caller, not a new service implementation
- The current workspace root resolves to one of the detected worktree paths, which is already the existing behaviour
- The feature deduplication key is the numeric prefix extracted from the folder name (e.g., `004` from `004-feature-name`)
- Workflow state ordering for deduplication (most → least advanced): `complete > in-progress > planned > specified > new`
- Opening files in VS Code via absolute filesystem paths is supported by the existing file-open mechanism (no special API required)
- Non-git workspaces and single-worktree repos are the common case; multi-worktree aggregation activates only when additional worktrees are detected, making the feature transparently additive
- Cross-worktree editing, creation, or deletion of features is out of scope; this feature is strictly read-only with respect to remote worktrees

## Out of Scope

- Live file-watching for `specs/` directories in remote worktrees (performance concern, explicitly excluded per feature description)
- Creating, editing, or deleting features in remote worktrees from within the extension
- Support for SCM systems other than git (SVN, Mercurial, etc.)
- Fetching or pulling remote git branches to discover features not yet checked out as worktrees
- Syncing or copying feature artifacts between worktrees
