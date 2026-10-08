import { bind, formatShortcut } from '../../shared/shortcuts'
import { openCompareDialog } from '../compareActions'
import { registerCommands } from './registry'

export function installCompareCommands(): void {
  const keys = bind('Ctrl+Shift+A')
  registerCommands({
    id: 'compare.open',
    title: 'Ask two agents',
    group: 'Actions',
    keywords: 'compare worktree prompt claude codex gemini',
    keys: [keys],
    shortcut: formatShortcut(keys),
    enabled: (state) => state.settings.projects.length > 0,
    run: () => openCompareDialog()
  })
}
