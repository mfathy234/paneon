<p align="center">
  <img src="src/renderer/assets/logo.svg" width="96" height="96" alt="Paneon logo: a 2 by 2 grid with one lit pane">
</p>

<h1 align="center">Paneon</h1>

<p align="center"><strong>One window for all your AI coding agents.</strong></p>

<p align="center">
  A Windows desktop app that puts Claude Code, OpenAI Codex CLI and Google Gemini CLI side by side in a grid of
  large, readable terminals, one per task, with live status, plan progress and needs-you alerts.
</p>

<p align="center">
  <img src="docs/screenshots/grid.png" alt="Paneon showing four sessions in a 2 by 2 grid: Claude Code, Codex CLI and Gemini CLI on four demo projects">
</p>

## Features

- **A grid of real terminals.** 1 to 6+ panes laid out automatically, each a full terminal (xterm.js on `node-pty`) with tabs for more agent sessions or a shell. Maximize any pane, zoom text per project.
- **Three agents, one workflow.** Pick a project and its default agent starts in that folder without a prompt. Switch agent per session with the split **New session** button (Claude / Codex / Gemini) or Tab in the quick-pick.
- **Know what each session is doing.** Busy and idle state, session names, model, context gauge, cost and git changes in a one-line strip under every pane header. A pane that finishes or waits on a permission prompt gets an amber border, a taskbar flash and a Windows notification.
- **Plans and sub-agents at a glance.** With the optional ops feed, panes show plan progress and a drawer of running sub-agents; a details panel shows context, limits, changed files and the last build and test result.
- **Resume where you left off.** Open panes come back on the next start, each agent resumes its own session id. The **Resume** picker (Ctrl+Shift+R) lists earlier sessions of all three agents across your projects, newest first, with search, an agent filter, a project filter and a preview of the first prompt and the last reply.
- **A `paneon` command.** Run `paneon .` in any folder to add it as a project and start its agent, `paneon resume --last` to pick up the newest session, or `paneon ls` to list your projects, all from the terminal you already have open.
- **A short first run.** On a fresh install a two-step setup adds your first project and shows which agent CLIs are installed. It stays closed once you dismiss it and can be reopened from the Theme popover.
- **Install and update the agents.** The **Agents** view shows the installed and latest version of each CLI and runs the install or update in a visible shell tab.
- **Themes.** Eight themes (Grid Dark, Nord, Tokyo Night, Catppuccin Mocha, Solarized Dark, Gruvbox Dark, GitHub Light, Solarized Light) with contrast checks, plus an optional background image.
- **Local only.** No account, no telemetry, nothing leaves your machine.

| Focus a pane and open its details | Sub-agents drawer |
|---|---|
| ![A maximized pane with the details panel open](docs/screenshots/focus-details.png) | ![A pane with the sub-agents drawer open](docs/screenshots/agents-drawer.png) |

| Projects | Agents |
|---|---|
| ![The projects view](docs/screenshots/projects.png) | ![The agents view with install and update buttons](docs/screenshots/agents.png) |

![The theme picker open over the grid](docs/screenshots/themes.png)

| Resume picker | First run |
|---|---|
| ![The resume picker listing sessions of all three agents with a preview of the selected one](docs/screenshots/resume-picker.png) | ![The Set up Paneon dialog with two steps, add a project and install your agents](docs/screenshots/onboarding.png) |

![A PowerShell window running paneon ls, paneon start and paneon sessions next to the Paneon grid. The image is a composite of a real app screenshot and the real output of those commands.](docs/screenshots/cli.png)

| Update available | What's new after an update |
|---|---|
| ![The Update 0.4.1 pill in the top bar with its popover: release notes, Update now and Later](docs/screenshots/update.png) | ![The What's new dialog listing the changes since the previous version](docs/screenshots/whats-new.png) |

## Supported agents

| Agent | Command | Install | Resume | Session titles and status |
|---|---|---|---|---|
| Claude Code | `claude.exe` | Native installer (`irm https://claude.ai/install.ps1 \| iex`) or npm | `claude -r <id>` | From Claude's session registry in `~/.claude/sessions` |
| Codex CLI | `codex` | `npm i -g @openai/codex` | `codex resume <id>` | From rollout files in `~/.codex/sessions` |
| Gemini CLI | `gemini` | `npm i -g @google/gemini-cli` | `gemini --resume <id>` | From chat files in `~/.gemini/tmp`; busy/idle from terminal activity |

Paneon only reads the agents' own folders. It never writes to `~/.codex` or `~/.gemini`.

## Install

1. Download `Paneon-Setup-<version>.exe` (installer) or `Paneon-Portable-<version>.exe` from the [latest release](https://github.com/mfathy234/paneon/releases/latest).
2. Run it. The builds are not code signed, so Windows SmartScreen may show "Windows protected your PC": choose **More info**, then **Run anyway**.

Requirements: Windows 10 or 11 (x64). Node.js 20+ is only needed for installing Codex and Gemini through the Agents view.

The installer also puts the `paneon` command on your user PATH (open a new terminal after installing) and removes it again on uninstall. The portable build does not touch your PATH: run `Paneon-Portable-<version>.exe` directly, or copy it somewhere and add that folder to your PATH yourself. Arguments given to the portable exe are forwarded to the running Paneon, but its answers appear as a toast in the app instead of in the terminal.

## Updates

The installed build (`Paneon-Setup-<version>.exe`) updates itself from GitHub Releases:

- 10 seconds after start and every 6 hours it checks for a newer release. An **Update 0.4.1** pill appears in the top bar, right of the session counts.
- **Update now** downloads in the background (the pill shows the progress) while your sessions keep running. When it is ready the pill says **Restart to update**: **Restart now** installs it and your open sessions reopen, or choose **When I quit** and it installs the next time you close Paneon.
- **Later** hides the pill until a newer version than the one you dismissed is found. A failed download shows **Update failed** with **Try again** and **Open GitHub**.
- The Theme popover has an **Updates** section: turn automatic checks off, see when Paneon last checked, **Check now** and **What's new**.
- After an update Paneon shows **What's new** once, with the changes of every version since the one you had (read from the bundled `CHANGELOG.md`). A fresh install shows the setup instead.

The portable build (`Paneon-Portable-<version>.exe`) cannot replace itself: it tells you a new version exists and opens the release page. Development runs never check.

Updates are not code signed, like the installer itself. Paneon verifies the downloaded file against the SHA-512 in the release's `latest.yml` and does not require a publisher signature.

Version 0.3.0 and older have no updater: install 0.4.0 manually once, later versions arrive in the app.

## First run

On a fresh install Paneon opens **Set up Paneon** with two steps: add a project (a folder picker) and install your agents (it shows which CLIs it found and has an **Open Agents** button). **Skip** or **Done** closes it for good; **Getting started** in the Theme popover reopens it. You can also do the steps by hand:

1. Open **Projects** (top bar) and add a project: a name and a folder. Choose each project's default agent.
2. Sign in once to each agent you use, in any terminal: `claude`, `codex`, `gemini`. Paneon never handles your credentials.
3. Press **Ctrl+N** (or click a project) to start a session. If an agent is not installed, open **Agents** and click **Install**.

Tip: run `paneon .` in any folder to open it in Paneon.

## Using it

### Shortcuts

| Keys | Action |
|---|---|
| Ctrl+N | New session. Quick-pick: type to filter, arrows, Enter, Esc; **Tab** cycles Claude, Codex, Gemini for the highlighted project |
| Ctrl+Shift+N | Same quick-pick, preset to the agent after each project's default |
| Ctrl+Shift+R | Open the picker in **Resume** mode. Inside the picker, **Ctrl+R** toggles New / Resume, **Tab** cycles the agent filter, Enter resumes in a new pane, Shift+Enter resumes in the focused pane (after a confirmation if that tab is a running agent) |
| Ctrl+Enter, double-click header | Maximize or restore the focused pane |
| Esc | Restore the grid (while a Claude pane is busy, Esc goes to Claude instead) |
| Ctrl+Alt+Left / Right | Focus the previous / next pane |
| Ctrl+wheel, Ctrl+=, Ctrl+-, Ctrl+0 | Zoom the focused pane (10-28, default 15), remembered per project |
| Ctrl+click on a link | Open it in the browser |
| Ctrl+C with a selection, Ctrl+V | Copy and paste |
| Shift+Enter | Newline in the Claude prompt |

### Layout

| Panes | Layout |
|---|---|
| 1 | one full pane |
| 2 | side by side |
| 3 | 2 on top, 1 wide pane below |
| 4 | 2 x 2 |
| 5-6 | 3 x 2 |
| 7+ | 3 columns, the grid scrolls |

### Resuming a session

Press **Ctrl+Shift+R**, choose **Resume a session...** in the split-button menu, or choose **Resume in <project>...** in a project's menu in the sidebar. The list shows up to 50 sessions from Claude Code, Codex CLI and Gemini CLI for your projects, newest first, grouped as Today, Yesterday, This week and Older. Each row shows the agent, title, project, age and message count, and **open in pane N** when the session is already running (Enter then focuses that pane instead of starting a second copy). The right side previews the selected session: agent and model, folder, start and last activity, the first prompt and the last assistant message. A resumed pane carries a muted **resumed** chip for its first minute or until you type into it. Sessions are read from the agents' own folders, are loaded in the background and cached by file size and modification time.

### The paneon command

`paneon` talks to the running app over a local named pipe (`\\.\pipe\paneon-<user>`) and starts Paneon first if it is not running. Nothing stays in the background when Paneon is closed. It prints to the terminal you ran it in and exits non-zero on errors.

| Command | What it does |
|---|---|
| `paneon` or `paneon open` | Open Paneon, or bring it to the front |
| `paneon .` | Add the current folder as a project if it is new (name = folder name, default agent Claude) and start its default agent in a new pane |
| `paneon start <project\|path> [--agent claude\|codex\|gemini] [--here]` | Start a session; a path is added as a project if it is new. `--here` opens it as a tab in the focused pane when that pane belongs to the project |
| `paneon resume [project] [--last] [--agent <agent>]` | Open the resume picker for a project (default: the project of the current folder), or with `--last` resume the newest matching session |
| `paneon ls` | List projects with their default agent, folder and open session count |
| `paneon sessions [project]` | List earlier sessions: agent, title, last activity, short id |
| `paneon add <path> [--name <name>]` | Add a project |
| `paneon update-agents` | Update the installed agents in a visible shell tab |
| `paneon --help`, `paneon --version` | Usage and version |

```
PS C:\work\acme-web> paneon start billing-api --agent codex
billing-api: started Codex in pane 3
PS C:\work\acme-web> paneon resume --last --agent claude
Resumed 'Add dark mode toggle' (Claude Code) in pane 4
```

### Closing

Closing a pane or removing a project asks for confirmation that names the session or project, then stops the whole process tree. Quitting stops all terminals but remembers which panes were open.

### The Agents view

Open **Agents** in the top bar. Each row shows the installed version (`<cli> --version`), the latest version (`npm view`, cached for 30 minutes, checked in the background at start) and a state: not installed, update available or up to date. **Install** and **Update** run the exact command, shown by **Show command**, in a new visible shell tab named like `update codex`, in the focused pane (or a new pane titled Agents). When the tab's process exits the versions are re-checked and a toast reports the result. **Update all** runs the updates one after another in one tab.

| Agent | Install | Update |
|---|---|---|
| Claude Code | `irm https://claude.ai/install.ps1 \| iex` | `claude update` (native install) or `npm install -g @anthropic-ai/claude-code@latest` (npm install) |
| Codex CLI | `npm install -g @openai/codex@latest` | same |
| Gemini CLI | `npm install -g @google/gemini-cli@latest` | same |

npm-based commands need Node.js 20+; without it the row shows "Needs Node.js 20+" with a link instead of a button. Nothing runs until you click.

## Status-line bridge and ops feed (opt-in)

Both are optional and off until you turn them on.

**Live session info (status-line bridge).** Claude Code runs a status-line command with the session as JSON on stdin. The Theme popover toggle **Show live session info** installs a small script (`%APPDATA%\Paneon\bin\statusline-bridge.js`, run with `node`) as `statusLine` in `~/.claude/settings.json`. It first shows a confirmation naming that file and your current status line. The previous value is kept in `bin\bridge-state.json` and a full copy in `settings.json.paneon-backup`; turning the toggle off restores it (a status line you changed after install is left alone). The script saves each payload to `%APPDATA%\Paneon\status\<session_id>.json` and then runs your previous status line with the same input, so it keeps working. A settings file that is not valid JSON is reported and never touched. This is the only file Paneon edits outside its own folder.

**Ops feed.** A Claude Code mod can write a snapshot of each session to `%APPDATA%\paneon\ops\<sessionId>.json` (the legacy `%APPDATA%\claude-grid\ops` folder is read too). Paneon only reads these files: it polls every second, keeps the last good parse of a file that is mid-write, ignores unknown fields and needs only `v`, `sessionId` and `updatedAt`. A snapshot belongs to the pane whose Claude session id matches. With a snapshot, the strip shows plan progress and running sub-agents, the **agents** toggle opens the drawer, and on a maximized pane the strip opens the details panel. Without one, panes fall back to the status-line data.

## Data and privacy

Everything is in the Electron user-data folder, `%APPDATA%\Paneon` for the installed app:

- `settings.json`: projects, theme, notification toggles, sidebar state and the open-panes workspace.
- `bin\` and `status\`: the status-line script and the saved status payloads (only when the live toggle was used; files older than 7 days are removed).

Paneon has no telemetry and makes no network calls except the Agents view looking up the latest CLI versions (`npm view`, or the npm registry when npm is missing). Agent session files are only read. Upgrading from Claude Grid 0.1: on first start Paneon copies `settings.json` and the status folder from `%APPDATA%\claude-grid` (the old folder is never deleted) and, if the live toggle was on, re-points the status line it installed. If `~/.claude/settings.json` was changed since, it is left alone and a toast explains how to turn the toggle off and on again.

## Build from source

```bash
npm install
npm run dev          # development with hot reload
npm run build        # type-check and build into out/
npm run package      # unsigned Windows installer and portable exe in release/
npm run icons        # regenerate build/icon.ico and build/icon.png from src/renderer/assets/logo.svg
npm run screenshots  # regenerate docs/screenshots from fake demo projects
```

Requirements: Windows, Node 24. The Electron binary downloads on first use. `npm run package` writes `release/Paneon-Setup-<version>.exe` and `release/Paneon-Portable-<version>.exe`.

## Testing

```bash
npm test             # unit tests (vitest), then the Electron end-to-end tests (Playwright)
npm run test:unit
npm run test:e2e
```

The end-to-end tests launch the built app with a temporary user-data folder and fake agent commands, so they never touch your real settings or agent folders.

| Variable | Effect |
|---|---|
| `PANEON_CLAUDE_COMMAND`, `PANEON_CODEX_COMMAND`, `PANEON_GEMINI_COMMAND` | Replace an agent's command. Resume arguments are not added when set. |
| `PANEON_CLAUDE_ARGS`, `PANEON_CODEX_ARGS`, `PANEON_GEMINI_ARGS` | Arguments for that command, space separated or a JSON array. |
| `PANEON_SHELL` | Replaces the shell used by Shell tabs and Agents-view commands. |
| `PANEON_USER_DATA` | Use another user-data folder (also skips the Claude Grid migration unless `PANEON_LEGACY_USER_DATA` is set). |
| `PANEON_LEGACY_USER_DATA` | Folder to migrate old Claude Grid settings from. |
| `PANEON_SESSIONS_DIR` | Read Claude session files from another folder. |
| `PANEON_CLAUDE_HOME` | Use another folder instead of `%USERPROFILE%\.claude`. |
| `PANEON_CODEX_HOME`, `PANEON_GEMINI_HOME` | Read Codex or Gemini sessions from another folder. |
| `PANEON_OPS_DIR` | Read ops snapshots from this folder only. |
| `PANEON_PIPE` | Name of the named pipe the `paneon` command uses (default `\\.\pipe\paneon-<user>`); set it to run a second, isolated instance. |
| `PANEON_EXE`, `PANEON_APP_ARGS` | The `paneon` command: program and JSON array of arguments used to start the app when no pipe answers (default: the Paneon exe itself). |
| `PANEON_UPDATE_START_DELAY_MS`, `PANEON_UPDATE_INTERVAL_MS` | Tests: delay of the first update check and the gap between checks (default 10 s and 6 h). |
| `PANEON_TEST_UPDATER`, `PANEON_TEST_UPDATER_SCRIPT`, `PANEON_TEST_UPDATER_LOG` | Tests: `fake` replaces the GitHub updater with a scripted one (JSON script) and logs `quitAndInstall` calls to the file. |
| `PANEON_APP_VERSION` | Tests: the version the app reports (the e2e runs report the package version). |
| `PANEON_OPEN_LOG`, `PANEON_NOTIFY_LOG` | Tests: append open-in-editor and notification requests to a file instead of acting on them. |

## Project layout

```
src/shared     types, agents, settings schema, layout, session matching, status-line and ops-feed parsing,
               agent install/update logic, needs-you state machine, themes, contrast, resume index and
               session details, command-line parsing and command handling
src/main       window, pty manager, agent launch, settings store, user-data migration, watchers, status-line bridge,
               agent version checks, resume lists and the cross-project session index, git, notifications,
               command-line pipe server and runner, IPC
src/preload    typed bridge exposed as window.gridApi
src/renderer   app shell, sidebar, grid, pane, quick-pick, resume picker, onboarding, projects and agents views,
               theme picker, dialogs, command host
build          icons, the paneon launcher (paneon.cmd, paneon-cli.cjs) and the installer PATH script
tests/unit     vitest
tests/e2e      Playwright _electron tests (temp user-data, fake agent commands, the paneon command over a test pipe)
tests/screenshots  the harness behind docs/screenshots
scripts        icon generation
```

## Notes

- `node-pty` is the Microsoft package (1.1.0). Its Windows prebuilds are N-API, so they load in Electron without a compiler.
- The xterm WebGL renderer is used when available; xterm 6 has no canvas addon, so the fallback is the DOM renderer.
- Releases are built by GitHub Actions from a `v*` tag. The GitHub release body is the matching `CHANGELOG.md` section, and the same text is embedded in `latest.yml` so the in-app notes match.

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Mohamed Fathy
