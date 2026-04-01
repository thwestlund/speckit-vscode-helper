# Tasks: Feature List and Chat UX Improvements

**Feature**: `002-feature-number-chat-worktree`
**Input**: Design documents from `/specs/002-feature-number-chat-worktree/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Constitution**: All tasks comply with Principle II — test tasks appear **before** their implementation counterparts within each user story phase.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1 / US2 / US3)
- All file paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing test fixture workspace and establish the shared manifest and constant additions that all three user stories depend on.

- [x] T001 Verify fixture workspace at `test/fixtures/sample-workspace/specs/` contains directories 001–005, each with a numeric prefix matching the expected label format
- [x] T002 [P] Add `openFeatureInChat` and `startInWorktree` entries to `COMMAND_IDS` in `src/constants.ts`
- [x] T003 [P] Add `speckit.openFeatureInChat` (group `speckit@0`) and `speckit.startInWorktree` (group `speckit@5`) to `contributes.commands` and `view/item/context` menus in `package.json` per `contracts/vscode-manifest.md`

**Checkpoint**: Fixture verified, command ID constants defined, manifest entries present — user story phases can now proceed.

---

## Phase 2: User Story 1 — Feature Number Visible in Sidebar (Priority: P1) 🎯 MVP

**Goal**: Surface the existing `feature.number` field as a visible prefix on each sidebar label — zero configuration, immediate value.

**Independent Test**: Open `test/fixtures/sample-workspace` in Extension Development Host — every sidebar entry shows `"NNN short-name"` (e.g., `"001 complete-feature"`), not just `"complete-feature"`. The `description` field still shows the state label unchanged.

- [x] T004 [US1] Write unit tests RED — create `test/unit/providers/featureTreeItem.label.test.ts` asserting: (a) standard dir `"002-in-progress"` produces label `"002 in-progress"`; (b) non-standard dir where `number === shortName` produces label `"unknown-dir"` (fallback); run and confirm tests fail RED before any implementation change
- [x] T005 [US1] Implement label prefix GREEN — update `FeatureTreeItem` constructor in `src/providers/featureTreeItem.ts`: change `super(feature.shortName, ...)` label argument to `feature.number !== feature.shortName ? \`${feature.number} ${feature.shortName}\` : feature.shortName`; confirm T004 goes GREEN

**Checkpoint**: User Story 1 complete — feature number visible in sidebar label; T004 GREEN.

---

## Phase 3: User Story 2 — Open Feature in New Chat with Skeleton (Priority: P2)

**Goal**: Replace the noisy full-spec injection into an existing chat session with a new command that opens a fresh Copilot Chat session pre-populated with a minimal barebone skeleton — without auto-sending.

**Independent Test**: Right-click any feature → "Open in Chat" → a new Copilot Chat panel appears pre-populated with only user story heading and acceptance criteria checkboxes; the skeleton is in the input field (not conversation history); the existing chat session is unchanged.

- [x] T006 [US2] Write integration test RED — create `test/integration/openInChat.test.ts` stubbing `vscode.commands.executeCommand` with sinon; assert `workbench.action.chat.open` is invoked exactly once with `{ isPartialQuery: true, newSession: true, query: <string containing "## User Story 1" and "### Acceptance Criteria"> }`; run and confirm RED (command not yet registered)
- [x] T007 [US2] Add `CHAT_SKELETON` constant — define the hardcoded 13-line skeleton string in `src/constants.ts` (exact content from `data-model.md`: `## User Story 1` heading, placeholder, `### Acceptance Criteria`, two checkbox items, optional US2 section)
- [x] T008 [US2] Register `speckit.openFeatureInChat` command GREEN — in `src/extension.ts`, add `context.subscriptions.push(vscode.commands.registerCommand(COMMAND_IDS.openFeatureInChat, () => vscode.commands.executeCommand('workbench.action.chat.open', { query: CHAT_SKELETON, isPartialQuery: true, newSession: true })))`; confirm T006 goes GREEN

**Checkpoint**: User Story 2 complete — "Open in Chat" opens a new session with the skeleton template; T006 GREEN.

---

## Phase 4: User Story 3 — Start Feature in Worktree (Priority: P3)

**Goal**: Let developers open a feature branch in an isolated git worktree (new or pre-existing) via a two-step Quick Pick — without disturbing the current workspace.

**Independent Test**: Right-click a feature → "Start in Worktree" → Quick Pick shows exactly `["New Worktree", "Existing Worktree"]`; selecting either path completes without error and opens the target directory in a new VS Code window (`forceNewWindow: true`); a git failure shows a human-readable error message.

- [x] T009 [US3] Write unit tests RED — create `test/unit/services/worktreeService.test.ts` with sinon stubs for `child_process.exec`; tests: (a) `listWorktrees` parses multi-block porcelain output and marks `isCurrentWorkspace` correctly; (b) `listWorktrees` returns `[]` for empty/unexpected output without throwing; (c) `addWorktree` resolves on zero-exit exec; (d) `addWorktree` rejects with trimmed stderr string on non-zero exit; run and confirm RED
- [x] T010 [US3] Create `src/services/worktreeService.ts` GREEN — implement `WorktreeInfo` interface (`path`, `branch`, `isCurrentWorkspace`); `execGit(args: string, cwd: string): Promise<string>` wrapping `child_process.exec`; `listWorktrees(gitRoot: string): Promise<WorktreeInfo[]>` parsing `git worktree list --porcelain` output; `addWorktree(branch: string, targetPath: string, gitRoot: string): Promise<void>` running `git worktree add`; confirm T009 goes GREEN
- [x] T011 [US3] Register `speckit.startInWorktree` command GREEN — in `src/extension.ts`, implement handler: (1) Quick Pick `["New Worktree", "Existing Worktree"]`; (2a) "New Worktree" → `showOpenDialog({ canSelectFolders: true })` → `path.join(parent, feature.branchName)` → `addWorktree(...)` → `vscode.openFolder(uri, { forceNewWindow: true })`; (2b) "Existing Worktree" → `listWorktrees(gitRoot)` → filter `isCurrentWorkspace=false` → Quick Pick → `vscode.openFolder`; `showErrorMessage` on any rejection

**Checkpoint**: User Story 3 complete — worktree Quick Pick command works end-to-end; T009 GREEN.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Compilation correctness, full test suite validation, and manual smoke verification.

- [x] T012 Run `npm run compile` — resolve any TypeScript strict-mode errors across `src/constants.ts`, `src/providers/featureTreeItem.ts`, `src/extension.ts`, `src/services/worktreeService.ts`
- [x] T013 Run `npm test` — confirm all suites pass: `featureTreeItem.label.test.ts`, `worktreeService.test.ts`, `openInChat.test.ts` all GREEN; no regressions in existing test suite
- [x] T014 Manual smoke test — execute quickstart.md steps 1–15 in Extension Development Host: verify numbers visible in sidebar, skeleton pre-populates chat without auto-send, worktree Quick Pick appears and opens new window, error path shows human-readable message

---

## Dependencies

```
T001 → T002, T003          (Phase 1 can parallelize after T001)

T002 → T004 → T005         (US1 chain)
T002 → T006 → T007 → T008  (US2 chain; T003 also feeds T008 for manifest)
T002 → T009 → T010 → T011  (US3 chain)
T003 → T008                 (manifest must exist for command to appear in context menu)
T003 → T011                 (same for US3 command)

T005, T008, T011 → T012 → T013 → T014  (Polish)
```

User stories US1, US2, and US3 are **independently deliverable** — they touch different files and have no runtime dependency on each other.

---

## Parallel Execution Examples

### Phase 1 — after T001

| Parallel track A | Parallel track B |
|---|---|
| T002 — `src/constants.ts` | T003 — `package.json` |

### US2 and US3 — across stories (two developers)

| Developer A (US2) | Developer B (US3) |
|---|---|
| T006 — write integration test | T009 — write unit tests |
| T007 — add CHAT_SKELETON | T010 — create worktreeService.ts |
| T008 — register command | T011 — register command |

---

## Implementation Strategy

| Increment | Tasks | Deliverable |
|---|---|---|
| **MVP (US1 only)** | T001–T003, T004–T005, T012 | Feature numbers visible in sidebar; single-line change |
| **Increment 2 (US2)** | T006–T008 | "Open in Chat" with skeleton and new session |
| **Increment 3 (US3)** | T009–T011 | "Start in Worktree" Quick Pick flow |
| **Polish** | T012–T014 | Compile clean, full test suite GREEN, smoke verified |

**Recommended MVP**: Deliver US1 first — one line changed in `featureTreeItem.ts`, high visual impact, zero risk.
