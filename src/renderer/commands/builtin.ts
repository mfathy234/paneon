import { AGENTS, AGENT_NAMES, agentOf } from '../../shared/agents'
import { bind, formatShortcut } from '../../shared/shortcuts'
import {
  addTab,
  closePane,
  focusRelative,
  openDetails,
  openPaneFolder,
  openQuickPick,
  openResumePicker,
  openWhatsNew,
  openOnboarding,
  runUpdateAction,
  showPaneDiff,
  showView,
  startSession,
  toggleMaximize,
  toggleSidebar,
  toggleThemePicker,
  focusPane
} from '../actions'
import { derivePanes } from '../derive'
import { paneById, store, type AppState } from '../state'
import { registerCommands, registerProvider, type Command } from './registry'

const hasPane = (state: AppState): boolean => paneById(state, state.focusedId) !== undefined

const withKeys = (text: string): Pick<Command, 'keys' | 'shortcut'> => ({
  keys: [bind(text)],
  shortcut: formatShortcut(bind(text))
})

function focusedAction(id: string, title: string, run: (paneId: string) => unknown, keywords?: string): Command {
  return {
    id,
    title,
    group: 'Actions',
    keywords,
    enabled: hasPane,
    run: () => {
      const paneId = store.state.focusedId
      if (paneId) void run(paneId)
    }
  }
}

export function installBuiltinCommands(): void {
  registerCommands(
    { id: 'session.new', title: 'New session', group: 'Actions', ...withKeys('Ctrl+N'), run: () => openQuickPick() },
    {
      id: 'session.new-other',
      title: 'New session with the next agent',
      group: 'Actions',
      ...withKeys('Ctrl+Shift+N'),
      searchOnly: true,
      run: () => openQuickPick('other')
    },
    { id: 'session.resume', title: 'Resume a session', group: 'Actions', ...withKeys('Ctrl+Shift+R'), run: () => openResumePicker() },
    {
      id: 'pane.maximize',
      title: 'Maximize or restore the pane',
      group: 'Actions',
      ...withKeys('Ctrl+Enter'),
      scope: 'grid',
      enabled: hasPane,
      run: () => toggleMaximize()
    },
    {
      id: 'pane.next',
      title: 'Focus the next pane',
      group: 'Actions',
      ...withKeys('Ctrl+Alt+ArrowRight'),
      scope: 'grid',
      searchOnly: true,
      enabled: hasPane,
      run: () => focusRelative(1)
    },
    {
      id: 'pane.previous',
      title: 'Focus the previous pane',
      group: 'Actions',
      ...withKeys('Ctrl+Alt+ArrowLeft'),
      scope: 'grid',
      searchOnly: true,
      enabled: hasPane,
      run: () => focusRelative(-1)
    },
    focusedAction('pane.vscode', 'Open in VS Code', (id) => openPaneFolder(id, 'vscode'), 'editor folder'),
    focusedAction('pane.explorer', 'Open in Explorer', (id) => openPaneFolder(id, 'explorer'), 'folder files'),
    focusedAction('pane.terminal', 'Open a terminal here', (id) => addTab(id, 'shell'), 'shell tab'),
    focusedAction('pane.diff', 'Show git diff', showPaneDiff, 'changes'),
    focusedAction('pane.details', 'Show pane details', openDetails, 'context limits files'),
    focusedAction('pane.close', 'Close the pane', closePane, 'stop session'),
    { id: 'view.sidebar', title: 'Toggle the sidebar', group: 'Actions', run: () => toggleSidebar() },
    { id: 'view.projects', title: 'Open Projects', group: 'Actions', keywords: 'snippets folders', run: () => showView('projects') },
    { id: 'view.agents', title: 'Open Agents', group: 'Actions', keywords: 'install update cli', run: () => showView('agents') },
    { id: 'view.usage', title: 'Open Usage', group: 'Actions', keywords: 'tokens cost limits history', run: () => showView('usage') },
    { id: 'view.grid', title: 'Back to the grid', group: 'Actions', searchOnly: true, run: () => showView('grid') },
    { id: 'app.theme', title: 'Choose a theme', group: 'Actions', keywords: 'colors background', run: () => toggleThemePicker(true) },
    { id: 'app.updates', title: 'Check for updates', group: 'Actions', run: () => runUpdateAction('check') },
    { id: 'app.whats-new', title: "Show what's new", group: 'Actions', searchOnly: true, run: () => openWhatsNew() },
    { id: 'app.setup', title: 'Open Getting started', group: 'Actions', searchOnly: true, run: () => openOnboarding() }
  )
  registerProvider(sessionCommands)
  registerProvider(projectCommands)
}

function sessionCommands(state: AppState): Command[] {
  return derivePanes(state).map((view) => ({
    id: `session:${view.pane.id}`,
    title: `${view.index + 1} · ${view.title}`,
    group: 'Sessions',
    hint: view.project?.name,
    mark: view.agent === 'shell' ? undefined : view.agent,
    run: () => focusPane(view.pane.id)
  }))
}

function projectCommands(state: AppState): Command[] {
  return state.settings.projects.flatMap((project) =>
    AGENTS.map((agent): Command => ({
      id: `project:${project.id}:${agent}`,
      title: `Start ${AGENT_NAMES[agent]} in ${project.name}`,
      group: 'Projects',
      mark: agent,
      searchOnly: agent !== agentOf(project),
      run: () => void startSession(project.id, agent)
    }))
  )
}
