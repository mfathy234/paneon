import { AGENT_MARKS, agentLabel } from '../../shared/agents'
import type { AgentKind, TabAgent } from '../../shared/types'
import { h } from '../dom'

export function agentMark(agent: TabAgent, extraClass = ''): HTMLElement | null {
  if (agent === 'shell') return null
  const kind: AgentKind = agent
  return h(
    'span',
    { class: `agent-mark ${kind} ${extraClass}`.trim(), title: agentLabel(kind), 'aria-hidden': 'true' },
    AGENT_MARKS[kind]
  )
}
