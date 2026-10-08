import { agentOf, nextAgent } from './agents'
import type { AgentKind, Project } from './types'

export type AgentPreset = 'default' | 'other' | AgentKind
export type AgentOverrides = Record<string, AgentKind>

export function filterProjects(projects: Project[], query: string): Project[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return projects
  const lower = (p: Project): string => p.name.toLowerCase()
  const starts = projects.filter((p) => lower(p).startsWith(needle))
  const contains = projects.filter((p) => !lower(p).startsWith(needle) && lower(p).includes(needle))
  return [...starts, ...contains]
}

export function moveSelection(current: number, delta: number, length: number): number {
  if (length <= 0) return 0
  return (current + delta + length) % length
}

export function pickedAgent(project: Project, overrides: AgentOverrides, preset: AgentPreset): AgentKind {
  const base = agentOf(project)
  if (overrides[project.id]) return overrides[project.id]
  if (preset === 'default') return base
  return preset === 'other' ? nextAgent(base) : preset
}

export function toggleAgent(project: Project, overrides: AgentOverrides, preset: AgentPreset): AgentOverrides {
  return { ...overrides, [project.id]: nextAgent(pickedAgent(project, overrides, preset)) }
}
