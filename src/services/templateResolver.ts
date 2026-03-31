import * as vscode from 'vscode';

const BUILT_IN_TEMPLATES: Readonly<Record<string, string>> = {
  specify: `## Feature Specification

**Feature Name**: {feature-name}

### Overview

{overview}

### User Stories

- As a [role], I want to [action] so that [benefit]

### Acceptance Criteria

- [ ] [criterion 1]
- [ ] [criterion 2]

### Out of Scope

- [item]

### Open Questions

- [question]`,

  plan: `## Implementation Plan

**Feature**: {feature-name}

### Technical Context

- **Language/Version**:
- **Primary Dependencies**:
- **Testing**:
- **Performance Goals**:

### Project Structure

\`\`\`text
src/
└── [files to create/modify]
\`\`\`

### Architecture Decisions

- [decision 1]

### Constitution Check

| # | Principle | Status |
|---|-----------|--------|
| I | Code Quality | ✅ PASS |
| II | Testing | ✅ PASS |
| III | UX Consistency | ✅ PASS |
| IV | Performance | ✅ PASS |`,

  tasks: `## Tasks: {feature-name}

**Organization**: Sequential unless marked [P] (parallel)

---

## Phase 1: Setup

- [ ] T001 [description]

## Phase 2: Implementation

- [ ] T002 [description]

## Phase 3: Testing

- [ ] T003 [description]`,

  implement: `## Implement: {feature-name}

Review the tasks.md and execute the next incomplete task.

Focus on:
1. Completing the current in-progress task
2. Following the TDD approach (tests before implementation)
3. Maintaining code quality per the project constitution
4. Marking tasks as [x] when complete`,

  clarify: `## Clarify: {feature-name}

Review spec.md and identify:

1. **Ambiguous requirements**: Any user stories or acceptance criteria that could be interpreted differently
2. **Missing edge cases**: Scenarios not covered by the current specification
3. **Unclear acceptance criteria**: Criteria that lack measurable success conditions
4. **Dependencies**: External systems or prerequisites not yet documented

Provide specific suggestions for each issue found.`,

  analyze: `## Analyze: {feature-name}

Review the current state of this feature:

1. **Artifact inventory**: Which files exist in the feature directory?
2. **Workflow state**: What is the current workflow state based on artifacts?
3. **Progress assessment**: What percentage of tasks are complete?
4. **Blockers**: Are there any identified blockers or concerns?
5. **Next steps**: What are the recommended next actions?`,

  checklist: `## Quality Checklist: {feature-name}

Review the feature against the project constitution:

### Principle I: Code Quality
- [ ] TypeScript strict mode enabled, no \`any\` types
- [ ] ESLint passes with no errors
- [ ] Cyclomatic complexity ≤ 10 per function

### Principle II: Testing Standards
- [ ] Unit tests written for all public APIs
- [ ] Integration tests cover external boundaries
- [ ] Test suite completes in < 30 seconds

### Principle III: UX Consistency
- [ ] UI follows VS Code UX guidelines
- [ ] Keyboard navigation supported
- [ ] No disruptive activation or modal dialogs

### Principle IV: Performance
- [ ] Activation < 500 ms
- [ ] No synchronous I/O on main thread
- [ ] Heap usage < 50 MB`,
};

export async function resolveTemplate(step: string, workspaceRoot: vscode.Uri): Promise<string> {
  // Tier 1: Project override
  const override = await tryReadTemplate(
    vscode.Uri.joinPath(workspaceRoot, `.specify/templates/overrides/${step}-template.md`),
  );
  if (override !== undefined) {
    return override;
  }

  // Tier 2: Project presets
  const presetTemplate = await resolveFromSubdirs(
    vscode.Uri.joinPath(workspaceRoot, '.specify/presets'),
    step,
  );
  if (presetTemplate !== undefined) {
    return presetTemplate;
  }

  // Tier 3: Project extensions
  const extensionTemplate = await resolveFromSubdirs(
    vscode.Uri.joinPath(workspaceRoot, '.specify/extensions'),
    step,
  );
  if (extensionTemplate !== undefined) {
    return extensionTemplate;
  }

  // Tier 4: Project core
  const core = await tryReadTemplate(
    vscode.Uri.joinPath(workspaceRoot, `.specify/templates/${step}-template.md`),
  );
  if (core !== undefined) {
    return core;
  }

  // Tier 5: Built-in default
  return BUILT_IN_TEMPLATES[step] ?? '';
}

async function resolveFromSubdirs(
  parentDir: vscode.Uri,
  step: string,
): Promise<string | undefined> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(parentDir);
  } catch {
    return undefined;
  }

  for (const [name, type] of entries) {
    if (type !== vscode.FileType.Directory) {
      continue;
    }
    const template = await tryReadTemplate(
      vscode.Uri.joinPath(parentDir, name, 'templates', `${step}-template.md`),
    );
    if (template !== undefined) {
      return template;
    }
  }
  return undefined;
}

async function tryReadTemplate(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return undefined;
  }
}
