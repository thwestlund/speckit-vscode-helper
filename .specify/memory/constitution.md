<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 (template) → 1.0.0
  Modified principles: N/A (initial adoption)
  Added sections:
    - Core Principles: Code Quality, Testing Standards,
      User Experience Consistency, Performance
    - Technical Decision Framework (new section)
    - Quality Gates (new section)
    - Governance (filled from template)
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (Constitution
      Check section is dynamic)
    - .specify/templates/spec-template.md ✅ compatible (success
      criteria align with performance principle)
    - .specify/templates/tasks-template.md ✅ compatible (phase
      structure supports testing-first workflow)
  Follow-up TODOs: None
-->

# SpecKit Extension Constitution

## Core Principles

### I. Code Quality

All production code MUST meet the following non-negotiable standards:

- **Type safety**: TypeScript strict mode MUST be enabled; `any` is
  prohibited except at documented system boundaries.
- **Single responsibility**: Each module, class, and function MUST
  have one clear purpose. Files exceeding 300 lines MUST be
  evaluated for decomposition.
- **Linting and formatting**: All code MUST pass the project linter
  and formatter with zero warnings before merge. Lint rules MUST
  NOT be disabled inline without a justifying comment.
- **Naming clarity**: Names MUST convey intent. Abbreviations are
  prohibited unless they are industry-standard (e.g., `URL`, `ID`).
- **Minimal complexity**: Cyclomatic complexity per function MUST NOT
  exceed 10. Higher complexity requires documented justification in
  the PR description.
- **No dead code**: Unreachable code, unused imports, and commented-
  out blocks MUST be removed before merge.

**Rationale**: A VS Code extension runs inside the user's editor —
defects directly degrade the developer's workflow. Strict code
quality prevents subtle regressions and keeps the codebase
maintainable as features grow.

### II. Testing Standards

Every feature MUST ship with tests that verify its contract:

- **Unit tests**: All public functions and exported APIs MUST have
  unit tests covering happy path, edge cases, and error conditions.
- **Integration tests**: Features that interact with the VS Code API,
  file system, or external processes MUST include integration tests
  exercising those boundaries.
- **Test-first encouraged**: When practical, tests SHOULD be written
  before implementation (red-green-refactor). Task lists MUST
  include test tasks before corresponding implementation tasks.
- **Coverage threshold**: New code MUST maintain or improve the
  overall test coverage ratio. Pull requests that decrease coverage
  MUST include a justification.
- **Deterministic tests**: All tests MUST be deterministic — no
  flaky tests. Tests depending on timing, network, or randomness
  MUST use controlled doubles or seeded generators.
- **Fast feedback**: The full unit test suite MUST complete in under
  30 seconds on a standard development machine.

**Rationale**: Extensions are difficult to debug in production. A
strong test suite is the primary safety net against shipping broken
functionality to users.

### III. User Experience Consistency

The extension MUST deliver a cohesive, predictable experience that
follows VS Code platform conventions:

- **VS Code idioms**: All UI contributions (commands, views,
  settings, quick picks, notifications) MUST follow the
  [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview).
- **Progressive disclosure**: Features MUST default to simple
  interactions; advanced options are revealed on demand, never
  forced upfront.
- **Error communication**: User-facing errors MUST include a clear
  description of what went wrong and, where possible, a suggested
  next action. Raw stack traces MUST NOT be shown to users.
- **Consistent terminology**: The same concept MUST use the same
  label across commands, settings, documentation, and
  notifications. A terminology glossary MUST be maintained when the
  extension surface exceeds 10 user-facing terms.
- **Accessibility**: All interactive UI MUST be keyboard-navigable.
  Tree views and webview panels MUST support screen readers via
  appropriate ARIA attributes.
- **Non-disruptive updates**: Extension activation, background tasks,
  and file watchers MUST NOT interrupt the user's active editing
  session with unexpected focus changes or modal dialogs.

**Rationale**: Users adopt extensions that feel like natural parts of
VS Code. Inconsistent or surprising UX erodes trust and drives
uninstalls.

### IV. Performance

The extension MUST be responsive and resource-efficient:

- **Activation time**: Extension activation MUST complete in under
  500 ms. Lazy activation events MUST be used — the extension MUST
  NOT activate on `*` (startup).
- **Command responsiveness**: User-initiated commands MUST provide
  visible feedback within 200 ms. Operations exceeding 1 second
  MUST display a progress indicator.
- **Memory footprint**: The extension MUST NOT consume more than
  50 MB of heap memory under normal operation. Long-lived caches
  MUST implement eviction strategies.
- **File I/O**: Large file reads or writes MUST use streaming or
  chunked approaches. Synchronous file system calls on the
  extension host main thread are prohibited.
- **Background work**: CPU-intensive operations MUST be offloaded
  to worker threads or external processes to avoid blocking the
  extension host event loop.
- **Bundle size**: The packaged extension MUST be optimized via
  bundling (e.g., esbuild/webpack). Unused dependencies MUST be
  pruned from the production bundle.

**Rationale**: VS Code extensions share a single extension host
process. A slow or memory-hungry extension degrades the entire
editor experience for the user.

## Technical Decision Framework

These principles MUST guide all technical decisions and
implementation choices:

- **Principle priority**: When principles conflict, resolve in this
  order: Performance > User Experience Consistency > Testing
  Standards > Code Quality. (A performant, user-friendly feature
  with slightly less elegant code is preferable to beautiful code
  that lags.)
- **Dependency adoption**: New dependencies MUST be justified against
  bundle size (Principle IV) and maintenance burden. Prefer the
  VS Code built-in API over third-party libraries when equivalent
  functionality exists.
- **Architecture decisions**: Design choices that affect more than
  three files MUST be documented in the feature's `plan.md` with
  explicit references to which principles drove the decision.
- **Trade-off documentation**: When a principle is intentionally
  relaxed (e.g., complexity exceeds 10 for a justified reason),
  the deviation MUST be recorded in the PR description with the
  principle number and rationale.
- **Technology selection**: Language, framework, and tooling choices
  MUST align with the extension's TypeScript/VS Code API stack.
  Introducing a new runtime (e.g., a native binary) requires a
  constitution amendment.

## Quality Gates

All contributions MUST pass these gates before merge:

- **Gate 1 — Lint & Format**: Zero linter warnings, formatter
  applied. Automated in CI.
- **Gate 2 — Test Suite**: All unit and integration tests pass.
  Coverage does not regress. Automated in CI.
- **Gate 3 — Performance Check**: Activation time and command
  responsiveness validated against thresholds (Principle IV).
  Manual or automated depending on CI capability.
- **Gate 4 — UX Review**: For user-facing changes, at least one
  reviewer MUST verify adherence to Principle III (VS Code idioms,
  error messaging, accessibility).
- **Gate 5 — Constitution Compliance**: The PR author MUST confirm
  in the PR description that all applicable principles have been
  satisfied or deviations documented.

## Governance

This constitution is the authoritative source of project standards.
It supersedes informal conventions, ad-hoc decisions, and
undocumented practices.

- **Amendments**: Any change to this constitution MUST be proposed
  via a pull request with a clear rationale. The amendment MUST
  include updated version number, date, and a sync impact report.
- **Versioning**: The constitution follows semantic versioning:
  - MAJOR: Principle removed, redefined, or priority order changed.
  - MINOR: New principle or section added, or existing guidance
    materially expanded.
  - PATCH: Wording clarifications, typo fixes, non-semantic edits.
- **Compliance review**: At the start of each feature planning cycle
  (`/speckit.plan`), the Constitution Check section MUST be
  populated with gates derived from the active principles.
- **Conflict resolution**: If a technical decision cannot satisfy
  all principles, the Technical Decision Framework priority order
  applies. Unresolvable conflicts MUST be escalated to an
  amendment proposal.
- **Propagation**: When the constitution is amended, all dependent
  templates (`plan-template.md`, `spec-template.md`,
  `tasks-template.md`) MUST be reviewed for alignment within the
  same PR.

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
