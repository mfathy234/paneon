# Changelog

All notable changes to Paneon are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-10-08

### Added

- In-app updates. The installed build checks GitHub Releases 10 seconds after start and every 6 hours, and shows an
  "Update" pill in the top bar. **Update now** downloads in the background while your sessions keep running, then
  **Restart now** (or quitting) installs it and your open sessions reopen. **Later** hides the pill until a newer version
  appears. The portable build only points you to the release page.
- An Updates section in the Theme popover: automatic checks on or off, a status line, **Check now** and **What's new**.
- A What's new dialog after an update, listing every release since the version you had before.

### Fixed

- Taskbar and notifications now show Paneon's own icon and name.

## [0.3.0] - 2026-10-08

### Added

- Resume picker: a New | Resume switch in the quick-pick. Resume lists earlier sessions of Claude Code, Codex CLI and Gemini CLI
  across all projects, newest first and grouped by age, with search, an agent filter, a project filter and a preview of the
  first prompt and the last assistant message. Enter resumes in a new pane, Shift+Enter in the focused pane, Ctrl+R toggles
  New / Resume and Ctrl+Shift+R opens it directly. Sessions that are already open show "open in pane N" and are focused
  instead of started twice.
- Resume entry points in the split-button menu and in every project's menu, plus an empty state per project.
- A muted "resumed" chip in the pane header for the first minute of a session resumed from the picker.
- The `paneon` command: `open`, `.`, `start`, `resume`, `ls`, `sessions`, `add`, `update-agents`, `--help` and `--version`.
  The installer adds it to the user PATH and removes it on uninstall.
- First-run setup with two steps (add a project, check your agents), a `paneon .` tip, and a Getting started item in the
  Theme popover to reopen it.
- Second launches of the app forward their arguments to the running instance.

### Changed

- The project menu entry "Resume session..." now opens the resume picker filtered to that project.

## [0.2.0] - 2026-10-08

### Added

- Paneon, formerly Claude Grid: a grid of real terminals for Claude Code, Codex CLI and Gemini CLI.
- Codex CLI and Gemini CLI sessions with titles, models, context and busy/idle state next to Claude Code.
- The Agents view with installed and latest versions and one-click install and update in a visible shell tab.
- Needs-you alerts: an amber border, taskbar flash and Windows notification when a session finishes or waits on a prompt.
- Optional status-line bridge and ops feed for plan progress, sub-agents, limits and changed files.
- Eight themes with contrast checks and an optional background image.

### Changed

- Renamed from Claude Grid to Paneon; settings are migrated from the old user-data folder on first start.
