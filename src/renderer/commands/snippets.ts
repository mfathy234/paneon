import { bind } from '../../shared/shortcuts'
import { visibleSnippets } from '../../shared/snippets'
import { openSnippets } from '../actions'
import { editSnippet, insertSnippet } from '../snippetActions'
import { paneById, type AppState } from '../state'
import { registerCommands, registerProvider, type Command } from './registry'

function snippetCommands(state: AppState): Command[] {
  const projectId = paneById(state, state.focusedId)?.projectId ?? null
  return visibleSnippets(state.settings.snippets, projectId).map((snippet) => {
    const shortcut = snippet.shortcut === null ? undefined : `Alt+${snippet.shortcut}`
    return {
      id: `snippet:${snippet.id}`,
      title: `Insert "${snippet.name}"`,
      group: 'Snippets',
      keywords: snippet.text,
      shortcut,
      keys: shortcut ? [bind(shortcut)] : undefined,
      scope: 'grid',
      enabled: () => state.panes.length > 0,
      run: () => void insertSnippet(snippet)
    }
  })
}

export function installSnippetCommands(): void {
  registerCommands(
    { id: 'snippet.new', title: 'New snippet…', group: 'Actions', keywords: 'prompt text', run: () => void editSnippet() },
    { id: 'snippet.manage', title: 'Manage snippets', group: 'Actions', keywords: 'prompt text edit delete', run: () => openSnippets() }
  )
  registerProvider(snippetCommands)
}
