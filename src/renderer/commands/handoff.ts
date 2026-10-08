import { AGENTS } from '../../shared/agents'
import { continueIn, continueLabel, sourceAgent } from '../handoffActions'
import { paneById, type AppState } from '../state'
import { registerProvider, type Command } from './registry'

function handoffCommands(state: AppState): Command[] {
  const pane = paneById(state, state.focusedId)
  const source = pane ? sourceAgent(pane.id) : null
  if (!pane || !source) return []
  return AGENTS.filter((agent) => agent !== source).map((agent) => ({
    id: `handoff:${agent}`,
    title: continueLabel(agent),
    group: 'Actions',
    keywords: 'handoff switch agent summary',
    mark: agent,
    run: () => void continueIn(pane.id, agent)
  }))
}

export function installHandoffCommands(): void {
  registerProvider(handoffCommands)
}
