# Data Model: Feature Action Required Indicator

**Feature**: 003-feature-action-indicator  
**Date**: 2026-04-01  
**References**: [research.md](research.md), [spec.md](spec.md)

---

## New: `ActionState` (src/models/actionState.ts)

Represents whether a feature's current lifecycle state requires immediate developer action and, if so, what that action is.

**Fields**

| Field | Type | Description |
|---|---|---|
| `needsAction` | `boolean` | `true` if the feature state has a well-defined pending developer step |
| `pendingActionLabel` | `string \| undefined` | Human-readable description of the next step; `undefined` when `needsAction` is `false` |

**Derivation rules** (pure function of `WorkflowState`, no I/O)

| WorkflowState | needsAction | pendingActionLabel |
|---|---|---|
| `New` | `true` | `"Next step: Specify this feature"` |
| `Specified` | `true` | `"Next step: Create a plan"` |
| `Planned` | `true` | `"Next step: Generate tasks"` |
| `TasksDefined` | `true` | `"Next step: Start implementation"` |
| `Implementing` | `false` | `undefined` |
| `Complete` | `false` | `undefined` |
| `Unknown` | `false` | `undefined` |

**Validation rules**
- `pendingActionLabel` MUST be `undefined` when `needsAction` is `false`
- `pendingActionLabel` MUST be a non-empty string when `needsAction` is `true`
- Derivation MUST cover all 7 `WorkflowState` values exhaustively

---

## Modified: `Feature` (src/models/feature.ts)

The existing `Feature` interface gains one new read-only field.

**Added field**

| Field | Type | Description |
|---|---|---|
| `actionState` | `ActionState` | Derived action state for this feature; computed once per feature build in `specDiscovery.ts` |

**Field population**: `actionState` is computed by calling `deriveActionState(state)` immediately after `deriveState(...)` in `buildFeature()` within `specDiscovery.ts`. This keeps `Feature` objects as self-contained snapshots with no deferred computation.

---

## Modified: `FeatureTreeItem` visual logic (src/providers/featureTreeItem.ts)

The `FeatureTreeItem` constructor is updated to reflect action state without changing the class's existing API surface.

**Icon selection logic**

```
if feature.actionState.needsAction:
  iconPath = ThemeIcon('warning', ThemeColor('list.warningForeground'))
else:
  iconPath = STATE_ICONS.get(feature.state)   // existing behaviour
```

**Tooltip format**

```
// needsAction = false (existing behaviour)
"003-feature-action-indicator (Specified)"

// needsAction = true (extended)
"003-feature-action-indicator (Specified)\nNext step: Create a plan"
```

The tooltip becomes a `vscode.MarkdownString` to support the line break.

---

## Modified: Feature list sort order (src/providers/featureTreeProvider.ts)

The existing `sortFeatures` function (or `getChildren` sort) is extended to place "needs action" features before "no action needed" features within the flat list, preserving sequential order within each group.

**Sort comparator logic**

```
compare(a, b):
  if a.actionState.needsAction && !b.actionState.needsAction → a comes first
  if !a.actionState.needsAction && b.actionState.needsAction → b comes first
  else → preserve original order (feature number ascending)
```

---

## State Transitions

The action state is a derived read-only projection of `WorkflowState`. It does not persist and is recomputed on every tree refresh. Below is the full lifecycle showing when indicator state changes:

```
New (⚠ action)
  → [spec.md created] →
Specified (⚠ action)
  → [plan.md created] →
Planned (⚠ action)
  → [tasks.md created] →
TasksDefined (⚠ action)
  → [first task checked off] →
Implementing (no action)
  → [all tasks checked off] →
Complete (no action)
```

---

## No New Entities

This feature does not introduce new persisted entities, file formats, or database tables. All changes are in-memory projections derived from existing file-system state already read by `specDiscovery.ts`.
