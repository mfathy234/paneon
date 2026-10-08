import type { AgentKind, Project, TabAgent } from './types'

export const AGENTS: AgentKind[] = ['claude', 'codex', 'gemini']

export const AGENT_NAMES: Record<TabAgent, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  shell: 'Shell'
}

export const AGENT_MARKS: Record<AgentKind, string> = { claude: 'C', codex: 'X', gemini: 'G' }

export const CODEX_MARK = { background: '#7e57e0', color: '#ffffff' } as const

export const GEMINI_MARK = { background: '#2f6fe4', color: '#ffffff' } as const

export const isAgent = (value: unknown): value is AgentKind => AGENTS.includes(value as AgentKind)

export const nextAgent = (agent: AgentKind): AgentKind => AGENTS[(AGENTS.indexOf(agent) + 1) % AGENTS.length]

export const agentOf = (project: Pick<Project, 'defaultAgent'> | undefined): AgentKind =>
  isAgent(project?.defaultAgent) ? project.defaultAgent : 'claude'

export const agentLabel = (agent: TabAgent): string =>
  agent === 'claude' ? 'Claude Code' : agent === 'shell' ? 'Shell' : AGENT_NAMES[agent]

export function sessionLabel(agent: TabAgent): string {
  return agent === 'shell' ? 'Shell' : `${AGENT_NAMES[agent]} session`
}
