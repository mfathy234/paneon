<p align="center">
  <img src="src/renderer/assets/logo.svg" width="96" height="96" alt="Paneon logo: a 2 by 2 grid with one lit pane">
</p>

<h1 align="center">Paneon</h1>

<p align="center"><strong>One window for all your AI coding agents.</strong></p>

<p align="center">Website: <a href="https://paneon.pages.dev">https://paneon.pages.dev</a></p>

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
- **Arrange panes your way.** Move a pane to any position from the **Move pane** button in its header or from the keyboard, so the wide bottom pane holds the session you want. Switch panes with **Ctrl+Tab** or jump straight to one with **Ctrl+1** to **Ctrl+9**.
- **Resume where you left off.** Open panes come back on the next start, each agent resumes its own session id. The **Resume** picker (Ctrl+Shift+R) lists earlier sessions of all three agents across your projects, newest first, with search, an agent filter, a project filter and a preview of the first prompt and the last reply.
- **A command palette.** **Ctrl+K** searches your open sessions, actions, projects, snippets and layouts in one list and runs what you pick from the keyboard.
- **Saved layouts.** Save the current panes under a name and bring the same setup back later, resuming each agent's session, from the **Layouts** menu, the palette or `paneon open <layout>`.
- **Prompt snippets.** Keep short prompts with `{{selection}}`, `{{branch}}`, `{{project}}` and `{{folder}}` variables and insert one into the focused terminal with **Alt+1** to **Alt+9**, typed but not sent.
- **Ask two agents.** Send one prompt to two agents at once, each optionally in its own git worktree, watch them side by side and keep one, keep both or diff them.
- **Continue in another agent.** Hand a session over to Codex, Gemini or Claude with an editable summary of the goal, the files touched, what is done and left, the last error and the recent output.
- **Usage.** Tokens per day by agent, tokens and Claude Code cost by project and agent, and a history of your 5 hour and weekly limits, read from the agents' own folders.
- **A `paneon` command.** Run `paneon .` in any folder to add it as a project and start its agent, `paneon resume --last` to pick up the newest session, `paneon open <layout>` to bring a saved layout back, or `paneon ls` to list your projects, all from the terminal you already have open.
- **A short first run.** On a fresh install a two-step setup adds your first project and shows which agent CLIs are installed. It stays closed once you dismiss it and can be reopened from the Theme popover.
- **Install and update the agents.** The **Agents** view shows the installed and latest version of each CLI and runs the install or update in a visible shell tab. Choose per agent whether sessions start with full access, on by default for Claude Code and Codex.
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
| ![The Update 0.5.1 pill in the top bar with its popover: release notes, Update now and Later](docs/screenshots/update.png) | ![The What's new dialog listing the changes since the previous version](docs/screenshots/whats-new.png) |

| Command palette | Saved layouts |
|---|---|
| ![The command palette filtered by "re", with sessions, actions and projects](docs/screenshots/palette.png) | ![The Layouts menu with two saved layouts, each with Open, Rename and Delete](docs/screenshots/layouts.png) |

| Ask two agents | Continue in another agent |
|---|---|
| ![Two agents answering the same prompt side by side under a Compare header, each in its own worktree, with Keep A, Keep B, Keep both and Diff A vs B](docs/screenshots/compare.png) | ![The Continue in Codex dialog with an editable summary of the session](docs/screenshots/handoff.png) |

| Prompt snippets | Usage |
|---|---|
| ![The Snippets tab of the Projects view with the Edit snippet dialog open](docs/screenshots/snippets.png) | ![The Usage view with tokens per day by agent, limit history and tables by project and by agent](docs/screenshots/usage.png) |

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

- 10 seconds after start and every 6 hours it checks for a newer release. An **Update 0.5.1** pill appears in the top bar, right of the session counts.
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
| Ctrl+K, Ctrl+Shift+P | Command palette: type to filter, Up and Down, **Tab** next group, Enter runs, Esc closes |
| Ctrl+Shift+A | Ask two agents |
| Alt+1 to Alt+9 | Insert the snippet with that number into the focused terminal, without pressing Enter |
| Ctrl+N | New session. Quick-pick: type to filter, arrows, Enter, Esc; **Tab** cycles Claude, Codex, Gemini for the highlighted project |
| Ctrl+Shift+N | Same quick-pick, preset to the agent after each project's default |
| Ctrl+Shift+R | Open the picker in **Resume** mode. Inside the picker, **Ctrl+R** toggles New / Resume, **Tab** cycles the agent filter, Enter resumes in a new pane, Shift+Enter resumes in the focused pane (after a confirmation if that tab is a running agent) |
| Ctrl+Enter, double-click header | Maximize or restore the focused pane |
| Esc | Restore the grid (while a Claude pane is busy, Esc goes to Claude instead) |
| Ctrl+Tab, Ctrl+Shift+Tab | Focus the next / previous pane (also Ctrl+Alt+Right / Left) |
| Ctrl+1 to Ctrl+9 | Focus pane 1 to 9 |
| Ctrl+Shift+Alt+Left / Right | Move the focused pane one position earlier / later |
| Ctrl+Shift+Alt+Home / End | Move the focused pane to the first / last position |
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

Panes fill the layout in order. To change which session sits where, click **Move pane** in a pane's header and pick a position, or use Ctrl+Shift+Alt+Left / Right; the order is saved with the workspace.

### Resuming a session

Press **Ctrl+Shift+R**, choose **Resume a session...** in the split-button menu, or choose **Resume in <project>...** in a project's menu in the sidebar. The list shows up to 50 sessions from Claude Code, Codex CLI and Gemini CLI for your projects, newest first, grouped as Today, Yesterday, This week and Older. Each row shows the agent, title, project, age and message count, and **open in pane N** when the session is already running (Enter then focuses that pane instead of starting a second copy). The right side previews the selected session: agent and model, folder, start and last activity, the first prompt and the last assistant message. A resumed pane carries a muted **resumed** chip for its first minute or until you type into it. Sessions are read from the agents' own folders, are loaded in the background and cached by file size and modification time.

### Command palette

Press **Ctrl+K** (or Ctrl+Shift+P) anywhere in the window, also while a terminal has focus. Paneon takes Ctrl+K before the terminal sees it, because agents rarely use it on Windows; set `"paletteShortcut": "Ctrl+Alt+P"` in `settings.json` to use another key (Ctrl or Alt plus one key, and Ctrl+Shift+P keeps working). The list has five groups: **Sessions** (switch to an open pane), **Actions**, **Projects** (`Start Codex in billing-api`), **Snippets** and **Layouts**. The filter is fuzzy and also matches session titles. Up and Down move through every row, **Tab** jumps to the next group, **Enter** runs the row and **Esc** closes. With an empty filter the commands you ran last come first under **Recent**. The palette, the menus and the keyboard shortcuts read one command list, so a new action shows up in all three.

### Saved layouts

**Layouts** in the top bar lists your saved layouts. **Save current layout...** asks for a name and stores, for every pane in order, its project, its tabs (agent, label and session id), the active tab and the text size. **Open** adds the layout's panes. When panes are already open Paneon asks first: **Replace with <name>** stops the open sessions (their files stay on disk), **Add alongside** keeps them running, **Cancel** does nothing. Tabs that have a session id resume it (`claude -r <id>`, `codex resume <id>`, `gemini --resume <id>`), the others start fresh, and a session that is already open in the grid starts fresh instead of running twice. Panes whose project was removed are skipped and reported. **Rename** and **Delete** are in the same list, and Delete names the layout in its confirmation. The two panes of an **Ask two agents** comparison are saved as plain panes without session ids, because their worktrees are temporary. From a terminal, `paneon layouts` lists them and `paneon open <layout>` opens one (see below).

### Snippets

Projects has a **Snippets** tab for short prompts. A snippet has a name, a text, a scope (all projects or one project) and an optional shortcut from **Alt+1** to **Alt+9**; a shortcut cannot be used twice in scopes that overlap. **Edit** and **Delete** are on each row, and Delete names the snippet in its confirmation. The text can use these variables:

| Variable | Replaced with |
|---|---|
| `{{selection}}` | the text selected in the focused terminal (the snippet is not inserted if nothing is selected) |
| `{{branch}}` | the current git branch of the pane |
| `{{project}}` | the project name |
| `{{folder}}` | the pane's folder |

Press the shortcut or choose `Insert "<name>"` in the palette to type the text into the focused terminal **without pressing Enter**, so you can read and edit it first. Multi-line text is sent as a bracketed paste when the program in the terminal has turned that on, which Claude Code, Codex CLI and Gemini CLI do, so no line runs on its own; in a terminal that has not, the lines are joined into one and a toast says so. Control characters are removed from the text.

### Ask two agents

**Ask two agents...** (Ctrl+Shift+A, the split-button menu or the palette) opens a dialog with a project, an agent for **A** and one for **B** (default Claude and Codex), a prompt and the option **Start each in its own git worktree**, which is on when the project is a git repository with at least one commit. With it on, Paneon runs `git worktree add -b compare/<id>-a ../<repo>-compare-<id>-a HEAD` (and the same for `b`) so the two agents cannot overwrite each other; git errors show in the dialog and nothing is left behind. Both agents start with the prompt as their first message: `claude "<prompt>"`, `codex "<prompt>"` and `gemini --prompt-interactive=<prompt>`, passed as one argument without a shell. A Codex or Gemini that is installed only as an npm `.cmd` shim cannot take a prompt safely and reports that instead.

The two panes sit side by side under a shared **Compare** header with the prompt, marked **A** and **B**, with these buttons below:

- **Keep A** and **Keep B** close the other pane after a confirmation that names it, then offer to remove its worktree and branch. If that worktree has uncommitted files or commits of its own Paneon says so and keeps it unless you confirm.
- **Keep both** unlinks the two panes and leaves the worktrees alone.
- **Diff A vs B** opens a shell tab with `git diff compare/<id>-a compare/<id>-b`, or `git diff --no-index` between the two folders when either has uncommitted files (that diff also lists the worktrees' `.git` pointer files).

A comparison survives a restart: the pair, the prompt and the worktree folders are saved with the open panes.

### Continue in another agent

The pane menu (the three dots) and the palette offer **Continue in Codex**, **Gemini** or **Claude**, whichever the pane is not. Paneon builds a summary from what it knows: the session title as **Goal**, **Files touched** from `git diff HEAD --numstat` and untracked files, **What's done** and **What's left** from the ops feed's plan and last build or test result, **Last error** (a failed check, else the last line of the terminal that looks like an error) and the last 40 lines of terminal output without colours. You can edit all of it before **Start <agent> with this** opens a new pane in the same folder with the text as the first message. The pane you continued from keeps running, and the new one shows a muted **from <agent>** chip. The summary is limited to 6000 characters.

### Usage

**Usage** in the top bar shows what your agents used over **Today** (per hour), **7 days** or **30 days** (per day). Everything is read from the agents' own folders, off the interface thread and cached by file size and modification time:

- Claude Code: `~/.claude/projects`, the `usage` of each assistant message (streamed messages count once). Tokens are input, output and cache writes; cache reads are listed apart.
- Codex CLI: `~/.codex/sessions`, the running `token_count` totals turned into amounts per hour. Tokens are uncached input plus output; cached input is listed apart.
- Gemini CLI: `~/.gemini/tmp/*/chats`, the token counts of each reply (uncached input, output, thoughts and tool tokens).

The chart stacks the three agents and switches between **Tokens** and **Cost**. **By project** assigns each session to the project whose folder contains its working folder (anything else is **Other**) and shows sessions, tokens, cost and the busiest agent; **By agent** shows sessions, tokens, cache reads and cost. Paneon never invents a price: cost is shown only for Claude Code sessions that reported one through **Show live session info**, which Paneon keeps per session in `usage-history.json` so it stays after the status files are cleaned up (it is counted on the day the cost last changed). Codex and Gemini show `n/a`. The same file keeps a history of the 5 hour and weekly limit readings (a new one when a percentage changes or after 15 minutes, newest 3000 kept), drawn as **Limit usage**; it starts on the day you turn the live info on. When a folder is missing, a range is empty or no cost was reported, the view says so instead of showing a blank chart.

### The paneon command

`paneon` talks to the running app over a local named pipe (`\\.\pipe\paneon-<user>`) and starts Paneon first if it is not running. Nothing stays in the background when Paneon is closed. It prints to the terminal you ran it in and exits non-zero on errors.

| Command | What it does |
|---|---|
| `paneon` or `paneon open` | Open Paneon, or bring it to the front |
| `paneon open <layout> [--replace\|--alongside]` | Open a saved layout (a name, in any case, or with dashes for spaces). When panes are open it asks in the app unless you give `--replace` (stop them first) or `--alongside` (keep them) |
| `paneon layouts` | List saved layouts with their pane counts and projects |
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

**Start with full access** under each agent decides whether new sessions skip the agent's approval prompts. It is on for Claude Code and Codex CLI and off for Gemini CLI until you change it, and applies to sessions started after the change. Paneon passes the agent's own flag:

| Agent | Flag |
|---|---|
| Claude Code | `--dangerously-skip-permissions` |
| Codex CLI | `--dangerously-bypass-approvals-and-sandbox` (no sandbox either) |
| Gemini CLI | `--yolo` |

With it on the agent edits files and runs commands without asking, so turn it off for folders you do not trust.

## Status-line bridge and ops feed (opt-in)

Both are optional and off until you turn them on.

**Live session info (status-line bridge).** Claude Code runs a status-line command with the session as JSON on stdin. The Theme popover toggle **Show live session info** installs a small script (`%APPDATA%\Paneon\bin\statusline-bridge.js`, run with `node`) as `statusLine` in `~/.claude/settings.json`. It first shows a confirmation naming that file and your current status line. The previous value is kept in `bin\bridge-state.json` and a full copy in `settings.json.paneon-backup`; turning the toggle off restores it (a status line you changed after install is left alone). The script saves each payload to `%APPDATA%\Paneon\status\<session_id>.json` and then runs your previous status line with the same input, so it keeps working. A settings file that is not valid JSON is reported and never touched. This is the only file Paneon edits outside its own folder.

**Ops feed.** A Claude Code mod can write a snapshot of each session to `%APPDATA%\paneon\ops\<sessionId>.json` (the legacy `%APPDATA%\claude-grid\ops` folder is read too). Paneon only reads these files: it polls every second, keeps the last good parse of a file that is mid-write, ignores unknown fields and needs only `v`, `sessionId` and `updatedAt`. A snapshot belongs to the pane whose Claude session id matches. With a snapshot, the strip shows plan progress and running sub-agents, the **agents** toggle opens the drawer, and on a maximized pane the strip opens the details panel. Without one, panes fall back to the status-line data.

## Data and privacy

Everything is in the Electron user-data folder, `%APPDATA%\Paneon` for the installed app:

- `settings.json`: projects, theme, notification toggles, sidebar state, the open-panes workspace, saved layouts, snippets and the palette key.
- `usage-history.json`: the last cost of each Claude Code session that reported one and the 5 hour and weekly limit readings, for the Usage view (written only when the live session info is on).
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
               session details, command-line parsing and command handling, command palette matching, layouts, snippets,
               comparison and handoff helpers, usage parsing and aggregation
src/main       window, pty manager, agent launch, settings store, user-data migration, watchers, status-line bridge,
               agent version checks, resume lists and the cross-project session index, git, notifications,
               command-line pipe server and runner, git worktrees for comparisons, usage scan and history, IPC
src/preload    typed bridge exposed as window.gridApi
src/renderer   app shell, sidebar, grid, pane, quick-pick, resume picker, onboarding, projects and agents views,
               command registry and palette, layouts menu, snippets, comparison pair, handoff and usage views,
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
