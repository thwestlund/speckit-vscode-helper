# Tasks: SpecKit Visual Extension

**Input**: Design documents from `/specs/001-speckit-visual-extension/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `test/` at repository root
- Paths follow the project structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and base configuration

- [x] T001 Initialize Node.js project with package.json including name "vscode-speckit", engines.vscode "^1.85.0", main "dist/extension.js", and dev dependencies (@types/vscode, typescript, esbuild, eslint, mocha, sinon, c8, @vscode/test-electron) in package.json
- [x] T002 Create tsconfig.json with strict mode enabled, target ES2022, module NodeNext, outDir "dist", rootDir "src", and declaration true per Constitution Principle I
- [x] T003 [P] Configure ESLint with @typescript-eslint/parser and recommended rules, Prettier integration, max cyclomatic complexity 10 in .eslintrc.json
- [x] T004 [P] Configure esbuild bundler script in esbuild.config.mjs — external: ["vscode"], format: cjs, platform: node, bundle: true, minify for production per research.md R7
- [x] T005 [P] Create .vscodeignore to exclude test/, src/, node_modules/, .specify/, specs/, *.map, .eslintrc.json, tsconfig.json from VSIX package
- [x] T006 Create package.json contributes section with activationEvents (workspaceContains:.specify/init-options.json), viewsContainers (speckit activity bar with resources/speckit-icon.svg), views (speckit.featureTree with when: speckit.active), viewsWelcome, all 10 commands, context menus with contextValue scoping, and speckit.aiAgent configuration setting per contracts/vscode-manifest.md
- [x] T007 [P] Create resources/speckit-icon.svg — simple activity bar icon placeholder (24x24 monochrome SVG)
- [x] T008 Create src/constants.ts with ARTIFACT_FILES map (fileName→ArtifactType), STATE_ICONS map (WorkflowState→ThemeIcon per data-model.md icon table), COMMAND_IDS object (all 10 command IDs from contracts/vscode-manifest.md), SETTING_KEYS object (aiAgent key), and CONTEXT_KEYS object (active, noFeatures)
- [x] T009 [P] Create .vscode/launch.json with "Run Extension" and "Extension Tests" configurations, and .vscode/tasks.json with compile and watch tasks per quickstart.md dev workflow
- [x] T010 [P] Create test fixture workspace at test/fixtures/sample-workspace/ with .specify/init-options.json, .specify/templates/ (spec-template.md, plan-template.md), and specs/ containing 5 feature directories (001-complete-feature with all [x] tasks.md, 002-in-progress with mixed tasks.md, 003-planned with spec.md+plan.md, 004-specified with spec.md only, 005-empty as directory only) per quickstart.md fixture specification

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] TT001 [P] Write unit tests for `WorkflowState` in test/unit/models/workflowState.test.ts — cover all 7 `deriveState()` paths (no artifacts→New, spec→Specified, plan→Planned, tasks present→TasksDefined, mixed [x]→Implementing, all [x]→Complete, edge cases) and `STATE_ORDER` membership; confirm GREEN
- [x] TT002 [P] Write unit tests for `parseFeatureDirectory()` in test/unit/models/feature.test.ts — cover standard prefix, timestamp prefix, multi-word kebab, and non-standard (fallback) cases; confirm GREEN

- [x] T011 [P] Create src/models/artifact.ts — export Artifact interface (fileName, filePath, exists, artifactType) and ArtifactType enum (Spec, Plan, Research, DataModel, Contracts, Quickstart, Tasks, Checklist) with their corresponding file names per data-model.md
- [x] T012 [P] Create src/models/workflowState.ts — export WorkflowState enum (New, Specified, Planned, TasksDefined, Implementing, Complete, Unknown), STATE_ORDER array for ascending comparison, and deriveState(artifacts: Artifact[]): WorkflowState function implementing the state machine from data-model.md (checks tasks.md checkbox markers for Implementing/Complete distinction) per research.md R5
- [x] T013 Create src/models/feature.ts — export Feature interface with fields: number (string), shortName (string), branchName (string), directoryPath (string), state (WorkflowState), artifacts (Artifact[]), and parseFeatureDirectory(dirName: string): {number, shortName} helper per data-model.md
- [x] T014 Create src/services/specDiscovery.ts — export discoverFeatures(specsDir: vscode.Uri): Promise<Feature[]> that reads the specs/ directory with vscode.workspace.fs.readDirectory(), iterates subdirectories, checks artifact file existence with vscode.workspace.fs.stat(), builds Artifact arrays, derives WorkflowState, and returns Feature objects per research.md R5
- [x] T015 Create src/extension.ts — export activate(context: vscode.ExtensionContext) that sets speckit.active context key via vscode.commands.executeCommand('setContext'), locates .specify/ root in workspace folders, finds adjacent specs/ directory, and export deactivate() stub per research.md R6 and contracts/vscode-manifest.md activation

**Checkpoint**: Foundation ready — models can represent features, discovery can scan the file system

---

## Phase 3: User Story 1 — View Feature Tree (Priority: P1) 🎯 MVP

**Goal**: Sidebar tree view showing all SpecKit features with their workflow states and artifact children

**Independent Test**: Open a workspace with `.specify/` and `specs/` → tree appears with features in correct states and order

### Tests for User Story 1

- [x] TT003 [US1] Unit tests for `FeatureTreeItem` icon and tooltip logic in test/unit/providers/featureTreeItem.test.ts — verify `iconPath` and `tooltip` based on `actionState.needsAction` (overlaps with feature 003 test coverage; tests are GREEN)
- [x] TT004 [US1] Integration tests for `FeatureTreeProvider` sort order and `getChildren` in test/integration/featureTreeProvider.test.ts — verify feature listing and ordering (overlaps with feature 003; tests are GREEN)

### Implementation for User Story 1

- [x] T016 [US1] Create src/providers/featureTreeItem.ts — export FeatureTreeItem class (extends vscode.TreeItem, collapsibleState: Collapsed, contextValue: "feature.{state}", iconPath: ThemeIcon from STATE_ICONS, description: state label) and ArtifactTreeItem class (extends vscode.TreeItem, contextValue: "artifact.{type}", command: speckit.openArtifact for existing artifacts, grayed icon for missing) per contracts/vscode-manifest.md context value mapping and icon table
- [x] T017 [US1] Create src/providers/featureTreeProvider.ts — export FeatureTreeProvider implementing vscode.TreeDataProvider<FeatureTreeItem | ArtifactTreeItem> with private _onDidChangeTreeData EventEmitter, getTreeItem(element), getChildren(element?) returning feature list at root or artifact children for a feature, and refresh() method that fires the change event after re-running specDiscovery per research.md R1
- [x] T018 [US1] Wire FeatureTreeProvider into src/extension.ts — instantiate FeatureTreeProvider, register via vscode.window.createTreeView('speckit.featureTree', {treeDataProvider}), register speckit.refreshTree command calling provider.refresh(), set speckit.noFeatures context key based on discovered feature count
- [x] T019 [P] [US1] Implement feature sorting in src/providers/featureTreeProvider.ts — sort features by numeric prefix using natural sort (handle both "001" zero-padded and "20260319-143022" timestamp formats) so features appear in chronological/numerical order per FR-013
- [x] T020 [US1] Implement empty-state and error handling in src/providers/featureTreeProvider.ts — update speckit.noFeatures context key to trigger viewsWelcome message when no features found (FR-015), catch errors during discovery and return features with WorkflowState.Unknown for malformed directories (FR-016)

**Checkpoint**: User Story 1 complete — tree view displays features with states, sorted, with empty-state handling

---

## Phase 4: User Story 2 — Live File-Watching Updates (Priority: P2)

**Goal**: Tree view automatically refreshes when SpecKit files are created, modified, or deleted

**Independent Test**: Create or delete a spec file while tree is visible → tree updates within 3 seconds without manual refresh

### Tests for User Story 2

- [x] TT005 [US2] Integration test for file-change indicator in test/integration/fileWatcher.indicator.test.ts — verifies state transition on artifact creation (overlaps with feature 003; tests are GREEN)
- [x] TT006 [US2] Unit test for `debounce()` in test/unit/services/fileWatcher.test.ts — assert coalesced callback invocation using fake timers (sinon); confirm GREEN

### Implementation for User Story 2

- [x] T021 [US2] Create src/services/fileWatcher.ts — export setupSpecsWatcher(specsDir: vscode.Uri, onChanged: () => void): vscode.Disposable that creates vscode.workspace.createFileSystemWatcher with RelativePattern for **/specs/**/* glob, registers onDidCreate/onDidChange/onDidDelete handlers calling a debounced onChanged callback per research.md R2
- [x] T022 [US2] Add debounce utility in src/services/fileWatcher.ts — export debounce<T>(fn: (...args: T[]) => void, delayMs: number) function that coalesces rapid file-system events (e.g., git checkout creating many files) into a single callback after 150 ms quiet period
- [x] T023 [US2] Wire FileWatcher into src/extension.ts — call setupSpecsWatcher() with the discovered specs/ URI and FeatureTreeProvider.refresh as the callback, push returned Disposable into context.subscriptions for cleanup in deactivate()

**Checkpoint**: User Story 2 complete — tree reflects file changes automatically

---

## Phase 5: User Story 3 — Run SpecKit Prompts from Tree (Priority: P3)

**Goal**: Right-click a feature to launch the appropriate SpecKit prompt in the chat panel

**Independent Test**: Right-click a feature in state "Specified" → select "Plan Feature" → chat opens with /speckit.plan prompt pre-populated

### Tests for User Story 3

- [x] TT007 [US3] Unit tests for `agentRegistry` in test/unit/agents/agentRegistry.test.ts — verify `getAgent()` returns correct adapter, `checkAvailability()` returns false when extension missing (stub `vscode.extensions.getExtension`); confirm GREEN
- [x] TT008 [US3] Unit tests for `promptLauncher` in test/unit/services/promptLauncher.test.ts — verify `launchPrompt()` reads setting, builds query from template, calls `workbench.action.chat.open` (stub `vscode.commands.executeCommand`); confirm GREEN

### Implementation for User Story 3

- [x] T024 [US3] Create src/agents/agentRegistry.ts — export AgentAdapter interface with buildPrompt(step: string, featureName: string): string method, export AGENTS Map<string, AgentAdapter> keyed by agent id ("copilot", "claude"), export getAgent(id: string): AgentAdapter function, export listAgents(): AIAgent[] per data-model.md AIAgent entity
- [x] T025 [P] [US3] Create src/agents/copilotAgent.ts — export CopilotAgent class implementing AgentAdapter with chatParticipant "@github", buildPrompt() returning "@github /speckit.{step} {featureName}" format using the prompt file reference syntax per research.md R3
- [x] T026 [P] [US3] Create src/agents/claudeAgent.ts — export ClaudeAgent class implementing AgentAdapter with chatParticipant "@claude", buildPrompt() returning "@claude /speckit.{step} {featureName}" format per research.md R3
- [x] T027 [US3] Create src/services/promptLauncher.ts — export launchPrompt(step: string, feature: Feature): Promise<void> that reads speckit.aiAgent setting via vscode.workspace.getConfiguration('speckit'), retrieves the AgentAdapter from agentRegistry, calls buildPrompt(), and executes vscode.commands.executeCommand('workbench.action.chat.open', { query }) per research.md R3
- [x] T028 [US3] Register all 7 workflow commands in src/extension.ts — speckit.specifyFeature, speckit.planFeature, speckit.generateTasks, speckit.implementFeature, speckit.clarifyFeature, speckit.analyzeFeature, speckit.createChecklist — each extracting the Feature from the TreeItem argument and calling promptLauncher.launchPrompt() with the corresponding step name per contracts/vscode-manifest.md command table
- [x] T029 [P] [US3] Register speckit.openArtifact command in src/extension.ts — extract filePath from ArtifactTreeItem argument and open the file via vscode.window.showTextDocument(vscode.Uri.file(filePath)) per contracts/vscode-manifest.md

**Checkpoint**: User Story 3 complete — context menu actions launch prompts routed to the configured AI agent

---

## Phase 6: User Story 4 — Template Prompts per Workflow Step (Priority: P4)

**Goal**: Each workflow step provides a structured template prompt with placeholders

**Independent Test**: Launch "Specify Feature" → chat input contains structured template with placeholder sections for user stories, acceptance criteria

### Tests for User Story 4

- [x] TT009 [US4] Unit tests for `templateResolver` in test/unit/services/templateResolver.test.ts — verify 4-tier resolution order: project override, preset, extension, project default, built-in fallback; stub `vscode.workspace.fs.readFile`; confirm GREEN

### Implementation for User Story 4

- [x] T030 [US4] Create src/services/templateResolver.ts — export resolveTemplate(step: string, workspaceRoot: vscode.Uri): Promise<string> implementing 4-tier resolution order: (1) .specify/templates/overrides/{step}-template.md, (2) .specify/presets/*/templates/{step}-template.md, (3) .specify/extensions/*/templates/{step}-template.md, (4) .specify/templates/{step}-template.md, with fallback to built-in default per research.md R4 and data-model.md TemplateSource enum
- [x] T031 [US4] Define built-in default templates as string constants in src/services/templateResolver.ts — one per workflow step (specify, plan, tasks, implement, clarify, analyze, checklist) with appropriate placeholder structure (e.g., specify template includes feature description, user stories, acceptance criteria placeholders) per research.md R4 template-to-step mapping
- [x] T032 [US4] Integrate templateResolver into src/services/promptLauncher.ts — call resolveTemplate(step, workspaceRoot) before building the prompt, append resolved template content to the chat query string so the AI agent receives structured guidance

**Checkpoint**: User Story 4 complete — prompts include structured templates from project or built-in defaults

---

## Phase 7: User Story 5 — AI Agent Configuration (Priority: P5)

**Goal**: VS Code setting to select the AI agent; default is GitHub Copilot

**Independent Test**: Change speckit.aiAgent to "claude" → next prompt routes to Claude participant

### Tests for User Story 5

- [x] TT010 [US5] Integration test for unavailable-agent error path in test/unit/services/promptLauncher.test.ts — verify `showErrorMessage` is called with the correct extension ID when `checkAvailability()` returns false; confirm GREEN

### Implementation for User Story 5

- [x] T033 [US5] Implement agent availability checking in src/agents/agentRegistry.ts — export checkAvailability(agentId: string): boolean that maps agent IDs to required VS Code extension identifiers (copilot → "github.copilot-chat", claude → "anthropic.claude-for-vscode") and checks via vscode.extensions.getExtension() per data-model.md AIAgent.available field
- [x] T034 [US5] Add unavailable-agent error handling in src/services/promptLauncher.ts — before launching prompt, call checkAvailability(); if false, show vscode.window.showErrorMessage() with agent name and required extension identifier, offering "Open Extensions" action that runs workbench.extensions.search command per FR-005 and edge case specification

**Checkpoint**: User Story 5 complete — agent setting works, unavailable agents show clear error

---

## Phase 8: User Story 6 — Self-Generation on SpecKit Changes (Priority: P6)

**Goal**: Detect changes to SpecKit project files and offer to sync extension configuration

**Independent Test**: Modify a .specify/templates/ file → notification appears offering regeneration

### Tests for User Story 6

- [x] TT011 [US6] Integration test for project watcher notification in test/integration/projectWatcher.test.ts — verify `showInformationMessage` fires within 3 s of a `.specify/templates/` file change (stub watcher event); confirm GREEN

### Implementation for User Story 6

- [x] T035 [US6] Add setupProjectWatcher() in src/services/fileWatcher.ts — export function that creates a secondary vscode.workspace.createFileSystemWatcher watching .specify/templates/**, .specify/scripts/**, and .github/prompts/** patterns, returns Disposable per FR-012
- [x] T036 [US6] Create speckit.syncExtension command handler in src/extension.ts — scans .github/prompts/ directory for prompt files, compares against registered commands, shows vscode.window.showInformationMessage() with "Sync Now" and "Dismiss" buttons per US6 acceptance scenarios
- [x] T037 [US6] Wire project watcher to sync notification in src/extension.ts — connect setupProjectWatcher() callback to show non-disruptive vscode.window.showInformationMessage("SpecKit project files changed", "Sync Now", "Dismiss"), invoke speckit.syncExtension on "Sync Now" selection, push watcher disposable into context.subscriptions

**Checkpoint**: User Story 6 complete — SpecKit project changes trigger sync offer

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Quality, performance, and packaging improvements across all stories

- [x] T038 [P] Add activation performance guard in src/extension.ts — wrap activate() body with performance.now() timing, log warning via OutputChannel if activation exceeds 500 ms per Constitution Principle IV and SC-005
- [x] T039 [P] Add .specify/ root discovery in src/extension.ts — iterate all vscode.workspace.workspaceFolders, search for .specify/init-options.json using vscode.workspace.fs.stat, supporting multi-root workspaces and subdirectory locations per edge case specification
- [x] T040 [P] Create README.md with extension description, features list, usage instructions, configuration table (speckit.aiAgent setting), requirements (VS Code 1.85+, supported AI extensions), and screenshots placeholder
- [x] T041 [P] Create CHANGELOG.md with initial v0.1.0 entry listing all 6 user stories as features
- [x] T042 Run quickstart.md verification checklist — validate all 6 user stories per quickstart.md verification steps (P1 tree, P2 live updates, P3 prompts, P4 templates, P5 agent config, P6 self-gen)
- [x] T043 Run esbuild production bundle and verify VSIX package builds successfully with reasonable size (< 500 KB) per research.md R7
- [x] T044 [P] Validate SC-001: in Extension Development Host with 20+ feature fixture, confirm the SpecKit sidebar is fully populated within 2 seconds of workspace activation (time from activation event to first `getChildren()` response)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start immediately after Phase 2
  - US2 (Phase 4): Can start after Phase 2 (independent of US1, but US1 provides the tree to refresh)
  - US3 (Phase 5): Depends on US1 (needs tree items for context menu actions)
  - US4 (Phase 6): Depends on US3 (needs prompt launcher to embed templates into)
  - US5 (Phase 7): Depends on US3 (needs agent registry used by prompt launcher)
  - US6 (Phase 8): Depends on US2 (needs file watcher infrastructure)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only → **MVP complete after this phase**
- **US2 (P2)**: Foundation only (but practically validates better with US1 tree)
- **US3 (P3)**: Depends on US1 (tree items for context menus)
- **US4 (P4)**: Depends on US3 (prompt launcher to integrate templates into)
- **US5 (P5)**: Depends on US3 (agent registry used by prompt launcher)
- **US6 (P6)**: Depends on US2 (file watcher infrastructure)

### Within Each User Story

- Models before services
- Services before providers/commands
- Core implementation before integration wiring

### Parallel Opportunities

- Setup: T003, T004, T005, T007, T009, T010 can all run in parallel (different files)
- Foundational: T011 and T012 can run in parallel (different model files)
- US3: T025 and T026 can run in parallel (independent agent adapters)
- Polish: T038, T039, T040, T041 can all run in parallel (different files)
- US2 and US3 can start in parallel after Foundation (US2 watches files, US3 adds commands)
- US4 and US5 can run in parallel after US3 (both modify different files)

---

## Parallel Example: Setup Phase

```text
# Sequential (required first)
T001 → T002

# Then parallel
T003 ─┐
T004 ─┤
T005 ─┤─── all can run simultaneously
T007 ─┤
T009 ─┤
T010 ─┘

# Then sequential (depend on T001/T002)
T006 (needs package.json contributes)
T008 (needs project structure for constants)
```

## Parallel Example: After Foundation

```text
# Foundation complete (T011–T015)

# US1 starts immediately
T016 → T017 → T018
T019 (parallel, after T017)
T020 (after T018)

# US2 can start in parallel with US1
T021 → T023 (wire up)
T022 (parallel with T021)

# US3 starts after US1 complete
T024 → T027 → T028
T025 ─┐ (parallel agent adapters)
T026 ─┘
T029 (parallel with T028)

# US4 + US5 in parallel after US3
T030 → T031 → T032   (US4)
T033 → T034           (US5)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP!
3. Add User Story 2 → Test independently → reliable tree
4. Add User Story 3 → Test independently → interactive workflow
5. Add User Story 4 → Test independently → guided prompts
6. Add User Story 5 → Test independently → agent flexibility
7. Add User Story 6 → Test independently → self-generation
8. Each story adds value without breaking previous stories
