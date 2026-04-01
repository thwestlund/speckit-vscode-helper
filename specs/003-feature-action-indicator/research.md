# Research: Feature Action Required Indicator

**Feature**: 003-feature-action-indicator  
**Date**: 2026-04-01  
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## Topic 1: VS Code TreeItem visual indicator options

**Decision**: Use `ThemeIcon` with `ThemeColor('list.warningForeground')` on `FeatureTreeItem.iconPath` when action is needed; preserve existing state icon when no action is needed.

**Rationale**: VS Code provides several mechanisms for decoration in tree views:
1. **`ThemeIcon` + `ThemeColor`** — Tints an existing codicon in a semantic color. This is the lightest, fully native approach and already used by the extension (e.g., `Implementing` uses `sync~spin` with `charts.yellow`). Using `warning` + `list.warningForeground` clearly signals "attention needed" without introducing a new visual language.
2. **`vscode.FileDecorationProvider`** — Adds a badge letter and color to any URI-based item. More powerful, but requires registering a provider, associating each feature with a virtual URI, and refreshing decorations independently from the tree refresh cycle. This complexity is not justified for this feature.
3. **Separate "badge" description field** — Using `TreeItem.description` to show a text label ("⚠ Needs action"). The existing `description` is already used for the state label. Replacing it would lose state visibility; appending would make it verbose.
4. **Custom webview** — Entirely out of scope per Constitution Principle III.

**Chosen approach**: Option 1 (`ThemeIcon` + `ThemeColor`). When `needsAction` is true, replace the normal state icon with `new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'))`. The existing `description` continues to show the state label. The `tooltip` is extended to append the pending action label (see Topic 3).

**Alternatives considered**: `FileDecorationProvider` (Topic 1, option 2) — rejected due to disproportionate implementation complexity relative to the visual gain. Could be revisited if badge-count-style indicators are needed in the future.

---

## Topic 2: "Needs action" grouping vs. sorting

**Decision**: Sort "needs action" features to the **top of the existing flat list** rather than splitting into separate tree sections.

**Rationale**:
- **Two named sections** ("Needs Action" / "Up to Date") require parent `TreeItem` nodes with `TreeItemCollapsibleState.Expanded`. This changes the tree structure, breaks existing `contextValue` matching for menus, and requires updating the `getChildren` and `getTreeItem` logic for a new parent node type. This is a significant structural change for a P2 story.
- **Sort to top** requires one comparator function in `FeatureTreeProvider.getChildren`. It preserves the existing flat structure exactly and delivers the goal (action-needed items visible first without scrolling) with minimal code change.
- If a dedicated "Needs Action" group section is desired in the future, it can be added as an upgrade without removing the sort-first approach.

**Chosen approach**: Sort features where `feature.actionState.needsAction === true` before those where it is false, preserving existing sort order within each group (currently sequential by feature number). Empty "Needs Action" section state (US2 AC2) is satisfied implicitly — when no features need action, none appear at the top; the list is simply in sequential order.

**Alternatives considered**: Named parent sections — rejected for implementation complexity above; revisit if users request a visible section header.

---

## Topic 3: Tooltip pending action label format

**Decision**: Append the pending action label to the existing tooltip as a second line, prefixed with "Next step: ".

**Rationale**: The existing tooltip format is `${feature.branchName} (${STATE_LABELS[feature.state]})`. Appending on a new line avoids disrupting existing information and keeps the tooltip compact. VS Code `TreeItem.tooltip` accepts a `vscode.MarkdownString`, which allows multi-line rendering. The format `Next step: Create a plan` is plain, imperative, and aligns with VS Code UX conventions for action prompts (Constitution Principle III).

**Chosen approach**:
```
003-feature-action-indicator (Specified)
Next step: Create a plan
```
When no action is pending, the tooltip remains as-is.

**Alternatives considered**: Inline label in `description` field — rejected because `description` already shows the state label and concatenation would be verbose.

---

## Topic 4: Location of `ActionState` logic

**Decision**: New dedicated module `src/models/actionState.ts`.

**Rationale**: Constitution Principle I mandates single responsibility per module. `workflowState.ts` answers "what state is this feature in?" (state derivation). Adding `deriveActionState` there would give the module a second concern: "does this state require action?". These are related but distinct questions — the action state could in principle change independently (e.g., if new lifecycle steps are added) without changing the core `WorkflowState` enum.

A new 40-line module with a single exported function and a readonly map is the cleanest fit.

**Alternatives considered**: Adding `deriveActionState` to `workflowState.ts` — rejected due to single-responsibility violation. Adding it to `feature.ts` — rejected as `feature.ts` is a data model, not behaviour.

---

## Topic 5: Which `WorkflowState` values require action

**Decision**: The following states are considered "needs action":

| WorkflowState | needsAction | Pending Action Label |
|---|---|---|
| `New` | `true` | `"Next step: Specify this feature"` |
| `Specified` | `true` | `"Next step: Create a plan"` |
| `Planned` | `true` | `"Next step: Generate tasks"` |
| `TasksDefined` | `true` | `"Next step: Start implementation"` |
| `Implementing` | `false` | — |
| `Complete` | `false` | — |
| `Unknown` | `false` | — |

**Rationale**: Each of New, Specified, Planned, and TasksDefined has a well-defined, unambiguous next step that the developer must initiate (FR-008). `Implementing` means the developer is actively executing tasks — no separate prompt is needed. `Complete` needs no action. `Unknown` has no well-defined next step by definition.

Spec FR-007 mandates at minimum Specified/Planned/TasksDefined; including `New` is additive and consistent with FR-008's criterion.

**Alternatives considered**: Excluding `New` (no spec yet) — rejected because the next step ("Specify this feature") is perfectly well-defined and owned by the developer. Including `Implementing` — rejected because the developer is already working; flagging it as "needs action" would create noise.

---

## Topic 6: Impact on existing file watcher

**Decision**: No changes required to `FileWatcher` or its debounce logic.

**Rationale**: The action indicator state is derived from `Feature.state`, which is already recomputed on every `FeatureTreeProvider.refresh()` call. The existing `FileWatcher` already triggers `refresh()` within 150 ms of file system changes, well within the 3-second SC-002 requirement. The indicator will update automatically as a side-effect of the existing watcher triggering a tree refresh.

**Alternatives considered**: A separate watcher for indicator refreshes — rejected as unnecessary given the existing mechanism already covers the requirement.
