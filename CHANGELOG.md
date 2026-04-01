# Changelog

All notable changes to the SpecKit Visual Extension are documented here.

## [0.1.0] - 2026-03-31

### Added

- **Feature Tree View** (US1/P1): Activity bar panel with live feature list, workflow state icons, and artifact children
- **Live File Watching** (US2/P2): Automatic tree refresh when SpecKit files are created, modified, or deleted (150 ms debounce)
- **Prompt Launcher** (US3/P3): Context-menu commands to launch `specify`, `plan`, `tasks`, `implement`, `clarify`, `analyze`, and `checklist` prompts in chat
- **Template Prompts** (US4/P4): 4-tier template resolution order matching SpecKit CLI, with built-in defaults for all 7 workflow steps
- **AI Agent Selection** (US5/P5): `speckit.aiAgent` setting to choose between GitHub Copilot and Claude; unavailable agents show helpful error with install link
- **Self-Generation Sync** (US6/P6): Watches `.specify/templates/`, `.specify/scripts/`, and `.github/prompts/` for changes, offers non-disruptive sync notification
- Natural sort for features supporting both `001-name` and `20260319-143022-name` formats
- Empty-state "No SpecKit features found" message with quick-create link
- Performance guard: logs warning if activation exceeds 500 ms
- Multi-root workspace support via `.specify/init-options.json` detection
