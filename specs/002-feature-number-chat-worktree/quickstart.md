# Quickstart: Feature List and Chat UX Improvements

**Feature**: 002-feature-number-chat-worktree  
**Date**: 2026-04-01

---

## Prerequisites

- VS Code 1.85+ (1.93+ recommended for `newSession` chat support)
- Git available on `$PATH` with worktree support (`git worktree` requires git 2.5+)
- The SpecKit Helper extension loaded in Extension Development Host (F5)
- A workspace with `.specify/init-options.json` and a `specs/` folder containing at least 2 features at mixed states

---

## Manual Smoke Test Checklist

### US1 — Feature Number in Sidebar

1. Open Extension Development Host (F5) with `test/fixtures/sample-workspace`
2. Open the SpecKit sidebar
3. Verify every feature entry shows its number prefix before the name:
   - ✅ `"001 complete-feature"` (not `"complete-feature"`)
   - ✅ `"002 in-progress"` (not `"in-progress"`)
4. Verify `description` still shows the state label (e.g., "Complete")
5. Verify feature sort order is unchanged (001 before 002)

### US2 — Open in Chat with Skeleton

6. Right-click any feature → verify "Open in Chat" appears in the context menu
7. Click "Open in Chat" → a Copilot Chat panel opens (new session ideally, existing as fallback on VS Code < 1.93)
8. Verify the chat input is pre-populated with the skeleton (user story headings, acceptance criteria checkboxes)
9. Verify the message is **NOT** auto-sent (the skeleton is in the input, not in the conversation history)
10. Verify **no spec file content** appears anywhere in the pre-populated message

### US3 — Start in Worktree

11. Right-click any feature → verify "Start in Worktree" appears in the context menu
12. Click "Start in Worktree" → Quick Pick appears with "New Worktree" and "Existing Worktree"
13. **New Worktree path**: Select "New Worktree" → folder chooser opens → pick a parent directory → verify a new VS Code window opens at `<chosen-dir>/<feature-branch-name>`
14. **Existing Worktree path**: If a worktree already exists (see setup below), select "Existing Worktree" → verify the worktree appears in the quick pick → confirm the selected path opens in a new VS Code window
15. **Error path**: With a branch that has a worktree already checked out, attempt "New Worktree" to the same path → verify a friendly error message (not a raw stack trace) is shown

---

## Dev Setup for US3 Manual Testing

To test the "Existing Worktree" path, create a worktree in advance from the terminal:

```bash
# From the main project root
git worktree add ../speckit-test-worktree 001-speckit-visual-extension
```

Then open the Extension Development Host — `listWorktrees()` should return this worktree and show it in the Quick Pick for any feature.

Clean up after testing:
```bash
git worktree remove ../speckit-test-worktree
```

---

## Running Unit Tests

```bash
npm run pretest   # Compile TypeScript tests
npm test          # Run full suite
```

Key new test files for this feature:

| Test file | What it tests |
|---|---|
| `test/unit/providers/featureTreeItem.label.test.ts` | Label includes number prefix; fallback for non-standard dir names |
| `test/unit/services/worktreeService.test.ts` | `listWorktrees` parsing; `addWorktree` success and failure paths (child_process stubbed with sinon) |
| `test/integration/openInChat.test.ts` | `workbench.action.chat.open` invoked with `isPartialQuery: true` and skeleton content; `newSession` passed when supported |

---

## Development Loop

1. Edit files in `src/`
2. Run `npm run compile` (type-check only) or `npm run build` (bundle)
3. Press F5 to reload Extension Development Host
4. Changes to providers/featureTreeItem.ts are immediately reflected in the sidebar on next tree refresh

---

## Key Files Modified by This Feature

| File | Change |
|---|---|
| `src/providers/featureTreeItem.ts` | US1: prefix label with `feature.number` |
| `src/services/worktreeService.ts` | **NEW** — `WorktreeInfo`, `listWorktrees()`, `addWorktree()`, `execGit()` |
| `src/extension.ts` | Register `speckit.openFeatureInChat` and `speckit.startInWorktree`; define `CHAT_SKELETON` constant |
| `src/constants.ts` | Add `openFeatureInChat` and `startInWorktree` to `COMMAND_IDS` |
| `package.json` | New commands and context menu entries for US2 and US3 |
| `test/unit/providers/featureTreeItem.label.test.ts` | **NEW** |
| `test/unit/services/worktreeService.test.ts` | **NEW** |
| `test/integration/openInChat.test.ts` | **NEW** |
