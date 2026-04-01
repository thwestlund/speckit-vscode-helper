# Contract: VS Code Extension Manifest (package.json)

**Purpose**: Defines the public contract between the SpecKit Visual Extension and VS Code.
This is the primary external interface — VS Code reads this manifest to discover activation
events, commands, views, menus, settings, and other contributions.

## Activation Events

```jsonc
{
  "activationEvents": [
    "workspaceContains:.specify/init-options.json"
  ]
}
```

The extension activates **only** when a `.specify/init-options.json` file exists in the
workspace. This scoped activation satisfies Constitution Principle IV (no `*` activation).

## Views

```jsonc
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "speckit",
          "title": "SpecKit",
          "icon": "resources/speckit-icon.svg"
        }
      ]
    },
    "views": {
      "speckit": [
        {
          "id": "speckit.featureTree",
          "name": "Features",
          "when": "speckit.active"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "speckit.featureTree",
        "contents": "No SpecKit features found.\n[Create a feature](command:speckit.specifyFeature)",
        "when": "speckit.active && speckit.noFeatures"
      }
    ]
  }
}
```

## Commands

| Command ID | Title | Category | When |
|---|---|---|---|
| `speckit.refreshTree` | Refresh Features | SpecKit | `speckit.active` |
| `speckit.specifyFeature` | Specify Feature | SpecKit | `speckit.active` |
| `speckit.planFeature` | Plan Feature | SpecKit | `speckit.active` |
| `speckit.generateTasks` | Generate Tasks | SpecKit | `speckit.active` |
| `speckit.implementFeature` | Implement Feature | SpecKit | `speckit.active` |
| `speckit.clarifyFeature` | Clarify Feature | SpecKit | `speckit.active` |
| `speckit.analyzeFeature` | Analyze Feature | SpecKit | `speckit.active` |
| `speckit.createChecklist` | Create Checklist | SpecKit | `speckit.active` |
| `speckit.syncExtension` | Sync Extension | SpecKit | `speckit.active` |
| `speckit.openArtifact` | Open Artifact | SpecKit | `speckit.active` |

```jsonc
{
  "contributes": {
    "commands": [
      { "command": "speckit.refreshTree", "title": "Refresh Features", "category": "SpecKit", "icon": "$(refresh)" },
      { "command": "speckit.specifyFeature", "title": "Specify Feature", "category": "SpecKit" },
      { "command": "speckit.planFeature", "title": "Plan Feature", "category": "SpecKit" },
      { "command": "speckit.generateTasks", "title": "Generate Tasks", "category": "SpecKit" },
      { "command": "speckit.implementFeature", "title": "Implement Feature", "category": "SpecKit" },
      { "command": "speckit.clarifyFeature", "title": "Clarify Feature", "category": "SpecKit" },
      { "command": "speckit.analyzeFeature", "title": "Analyze Feature", "category": "SpecKit" },
      { "command": "speckit.createChecklist", "title": "Create Checklist", "category": "SpecKit" },
      { "command": "speckit.syncExtension", "title": "Sync Extension", "category": "SpecKit" },
      { "command": "speckit.openArtifact", "title": "Open Artifact", "category": "SpecKit" }
    ]
  }
}
```

## Context Menus

Context menus are scoped by `TreeItem.contextValue` so only applicable actions appear.

```jsonc
{
  "contributes": {
    "menus": {
      "view/title": [
        { "command": "speckit.refreshTree", "when": "view == speckit.featureTree", "group": "navigation" },
        { "command": "speckit.specifyFeature", "when": "view == speckit.featureTree" }
      ],
      "view/item/context": [
        { "command": "speckit.specifyFeature", "when": "viewItem == feature.new", "group": "speckit@1" },
        { "command": "speckit.clarifyFeature", "when": "viewItem == feature.specified", "group": "speckit@1" },
        { "command": "speckit.planFeature", "when": "viewItem == feature.specified", "group": "speckit@2" },
        { "command": "speckit.generateTasks", "when": "viewItem == feature.planned", "group": "speckit@1" },
        { "command": "speckit.implementFeature", "when": "viewItem == feature.tasksDefined || viewItem == feature.implementing", "group": "speckit@1" },
        { "command": "speckit.analyzeFeature", "when": "viewItem =~ /^feature\\./", "group": "speckit@3" },
        { "command": "speckit.createChecklist", "when": "viewItem =~ /^feature\\./", "group": "speckit@4" },
        { "command": "speckit.openArtifact", "when": "viewItem =~ /^artifact\\./", "group": "inline" }
      ]
    }
  }
}
```

### Context Value Mapping

| TreeItem Type | contextValue | Description |
|---|---|---|
| Feature (New) | `feature.new` | Directory exists, no spec.md |
| Feature (Specified) | `feature.specified` | spec.md exists |
| Feature (Planned) | `feature.planned` | plan.md exists |
| Feature (TasksDefined) | `feature.tasksDefined` | tasks.md exists |
| Feature (Implementing) | `feature.implementing` | tasks.md with some [x] |
| Feature (Complete) | `feature.complete` | All tasks [x] |
| Feature (Unknown) | `feature.unknown` | Unexpected content |
| Artifact | `artifact.{type}` | e.g., `artifact.spec`, `artifact.plan` |

## Settings

```jsonc
{
  "contributes": {
    "configuration": {
      "title": "SpecKit",
      "properties": {
        "speckit.aiAgent": {
          "type": "string",
          "default": "copilot",
          "enum": ["copilot", "claude"],
          "enumDescriptions": [
            "GitHub Copilot (requires GitHub Copilot Chat extension)",
            "Claude (requires Claude for VS Code extension)"
          ],
          "description": "AI agent to use for SpecKit prompts."
        }
      }
    }
  }
}
```

## Tree Item Icons

All icons use VS Code's built-in ThemeIcon to ensure consistency across themes
(Constitution Principle III).

| State | ThemeIcon | Color |
|---|---|---|
| New | `$(file-directory)` | default |
| Specified | `$(file-text)` | default |
| Planned | `$(checklist)` | default |
| TasksDefined | `$(tasklist)` | default |
| Implementing | `$(sync~spin)` | `charts.yellow` |
| Complete | `$(check-all)` | `charts.green` |
| Unknown | `$(question)` | `charts.orange` |
