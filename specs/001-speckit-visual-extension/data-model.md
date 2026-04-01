# Data Model: SpecKit Visual Extension

**Feature**: 001-speckit-visual-extension
**Date**: 2026-03-31
**Source**: spec.md Key Entities + research.md state derivation

## Entities

### Feature

Represents a single SpecKit feature discovered in the `specs/` directory.

| Field | Type | Description |
|---|---|---|
| number | string | Numeric or timestamp prefix (e.g., `"001"`, `"20260319-143022"`) |
| shortName | string | Kebab-case name after the prefix (e.g., `"speckit-visual-extension"`) |
| branchName | string | Full directory name = `{number}-{shortName}` |
| directoryPath | string | Absolute path to the feature directory |
| state | WorkflowState | Current workflow state derived from artifacts |
| artifacts | Artifact[] | List of discovered artifact files |

**Identity**: A Feature is uniquely identified by its `branchName` (directory name under `specs/`).

**Relationships**:
- A Feature contains zero or more Artifacts.
- A Feature has exactly one WorkflowState (derived, not stored).

### WorkflowState

An enumeration representing a feature's progress through the SpecKit lifecycle. Derived from the presence/content of artifact files — never stored independently.

| Value | Derivation Rule | Icon (ThemeIcon) |
|---|---|---|
| New | Directory exists, no spec.md | `$(file-directory)` |
| Specified | spec.md exists, no plan.md | `$(file-text)` |
| Planned | plan.md exists, no tasks.md | `$(checklist)` |
| TasksDefined | tasks.md exists, no tasks marked [x] | `$(tasklist)` |
| Implementing | tasks.md exists, some tasks marked [x] | `$(loading~spin)` |
| Complete | tasks.md exists, all tasks marked [x] | `$(check-all)` |
| Unknown | Unexpected directory content | `$(question)` |

**State ordering** (ascending): New < Specified < Planned < TasksDefined < Implementing < Complete.

**Transition rules**:
- State advances when a new artifact file is created matching the next stage.
- State can revert if a file is deleted (e.g., deleting plan.md reverts from Planned to Specified).
- The `Implementing → Complete` transition requires parsing tasks.md checkbox markers.

### Artifact

Represents an individual SpecKit document or directory within a feature.

| Field | Type | Description |
|---|---|---|
| fileName | string | File or directory name (e.g., `"spec.md"`, `"contracts/"`) |
| filePath | string | Absolute path |
| exists | boolean | Whether the file/directory currently exists on disk |
| artifactType | ArtifactType | Category of the artifact |

**ArtifactType enumeration**:

| Value | File Name | Required for State |
|---|---|---|
| Spec | spec.md | Specified |
| Plan | plan.md | Planned |
| Research | research.md | — (supplementary) |
| DataModel | data-model.md | — (supplementary) |
| Contracts | contracts/ | — (supplementary) |
| Quickstart | quickstart.md | — (supplementary) |
| Tasks | tasks.md | TasksDefined |
| Checklist | checklists/ | — (supplementary) |

**Relationships**:
- An Artifact belongs to exactly one Feature.
- ArtifactType determines whether the artifact affects the parent Feature's WorkflowState.

### AIAgent

Represents a configured chat agent that can receive prompts.

| Field | Type | Description |
|---|---|---|
| id | string | Internal identifier (e.g., `"copilot"`, `"claude"`) |
| displayName | string | User-facing name (e.g., `"GitHub Copilot"`, `"Claude"`) |
| chatParticipant | string | VS Code chat participant handle (e.g., `"@github"`, `"@claude"`) |
| available | boolean | Whether the agent's extension is currently installed and active |

**Validation**: The `id` field must match one of the supported agent identifiers. The extension checks availability at prompt-launch time, not at startup.

### PromptTemplate

Represents a structured template associated with a SpecKit workflow step.

| Field | Type | Description |
|---|---|---|
| workflowStep | string | SpecKit command name (e.g., `"specify"`, `"plan"`, `"tasks"`) |
| content | string | Template text with placeholders |
| source | TemplateSource | Where the template was loaded from |

**TemplateSource enumeration**: `ProjectOverride` | `ProjectPreset` | `ProjectExtension` | `ProjectCore` | `BuiltInDefault`

**Resolution order** (highest priority first):
1. `.specify/templates/overrides/{step}-template.md` → `ProjectOverride`
2. `.specify/presets/<id>/templates/{step}-template.md` → `ProjectPreset`
3. `.specify/extensions/<id>/templates/{step}-template.md` → `ProjectExtension`
4. `.specify/templates/{step}-template.md` → `ProjectCore`
5. Embedded in extension bundle → `BuiltInDefault`

## Entity Relationship Diagram

```
┌─────────────┐     contains      ┌───────────┐
│   Feature   │ ────────────────▶ │  Artifact  │
│             │  1            0..*│           │
│ branchName  │                   │ fileName  │
│ state ◄─────┼── derived from ──│ exists    │
└─────────────┘                   └───────────┘
                                       │
                                       │ type determines
                                       ▼
                                ┌──────────────┐
                                │ ArtifactType  │
                                └──────────────┘

┌─────────────┐     routes to    ┌───────────┐
│   AIAgent   │ ◀──────────────  │  Prompt    │
│ id          │                  │  Template  │
│ participant │                  │ step       │
│ available   │                  │ content    │
└─────────────┘                  └───────────┘
```

## State Machine

```
                 spec.md created          plan.md created
  ┌─────┐  ──────────────────▶  ┌───────────┐  ────────────▶  ┌─────────┐
  │ New │                       │ Specified  │                 │ Planned │
  └─────┘  ◀──────────────────  └───────────┘  ◀────────────  └─────────┘
                spec.md deleted          plan.md deleted          │
                                                                  │ tasks.md
                                                                  │ created
                                                                  ▼
  ┌──────────┐  all [x]         ┌──────────────┐  some [x]  ┌─────────────┐
  │ Complete │ ◀────────────── │ Implementing  │ ◀──────── │ TasksDefined │
  └──────────┘                  └──────────────┘            └─────────────┘
       │                              │                           │
       └──────── tasks.md deleted ────┴───────────────────────────┘
                        │
                        ▼
                   ┌─────────┐
                   │ Planned │
                   └─────────┘
```
