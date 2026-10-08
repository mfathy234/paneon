import { expandSnippet, usesSelection } from '../shared/snippets'
import type { Snippet } from '../shared/types'
import { saveSettings } from './actions'
import { confirmDialog } from './components/dialogs'
import { snippetDialog } from './components/snippetDialog'
import { toast } from './components/toast'
import { folderOfPane, newId, paneById, projectById, store } from './state'
import { getTerminal } from './terminals'

function setSnippets(snippets: Snippet[]): void {
  store.set((s) => ({ ...s, settings: { ...s.settings, snippets } }))
  void saveSettings({ snippets })
}

export function insertSnippet(snippet: Snippet): boolean {
  const state = store.state
  const pane = paneById(state, state.focusedId)
  const tab = pane?.tabs.find((t) => t.id === pane.activeTabId)
  const project = pane ? projectById(state, pane.projectId) : undefined
  const view = tab ? getTerminal(tab.id) : undefined
  if (!pane || !tab || !project || !view) {
    toast('Open a session first, then insert the snippet.', 'info')
    return false
  }
  if (tab.status === 'exited') {
    toast(`${tab.label} has exited. Restart it before inserting a snippet.`)
    return false
  }
  const selection = view.selection().trim()
  if (usesSelection(snippet.text) && selection === '') {
    toast(`Select some text in the terminal first, then insert '${snippet.name}' again.`, 'info')
    return false
  }
  const folder = folderOfPane(state, pane) ?? project.folder
  const text = expandSnippet(snippet.text, {
    selection,
    branch: state.branches[folder] ?? '',
    project: project.name,
    folder
  })
  const { flattened } = view.insertText(text)
  const note = flattened ? ' Its line breaks were joined because this terminal does not accept pasted lines.' : ''
  toast(`Inserted '${snippet.name}'. Press Enter to send it.${note}`, 'info')
  view.focus()
  return true
}

export async function editSnippet(snippetId?: string): Promise<void> {
  const existing = snippetId ? store.state.settings.snippets.find((s) => s.id === snippetId) : undefined
  const draft = await snippetDialog({
    snippet: existing,
    snippets: store.state.settings.snippets,
    projects: store.state.settings.projects
  })
  if (!draft) return
  const next: Snippet = {
    id: existing?.id ?? newId(),
    name: draft.name.trim(),
    text: draft.text,
    projectId: draft.projectId,
    shortcut: draft.shortcut
  }
  const { snippets } = store.state.settings
  setSnippets(existing ? snippets.map((s) => (s.id === existing.id ? next : s)) : [...snippets, next])
}

export async function deleteSnippet(snippetId: string): Promise<void> {
  const snippet = store.state.settings.snippets.find((s) => s.id === snippetId)
  if (!snippet) return
  const confirmed = await confirmDialog({
    title: `Delete snippet "${snippet.name}"?`,
    body: 'This removes the snippet from Paneon. Text you already inserted into a terminal is not affected.',
    confirmLabel: `Delete "${snippet.name}"`
  })
  if (!confirmed) return
  setSnippets(store.state.settings.snippets.filter((s) => s.id !== snippet.id))
}
