import type { AgentKind } from './types'

export type InstallKind = 'native' | 'npm'
export type ToolState = 'missing' | 'update' | 'current' | 'unknown'

export interface ToolReport {
  agent: AgentKind
  installed: string | null
  present: boolean
  latest: string | null
  latestFailed: boolean
  installKind: InstallKind | null
}

export interface NodeInfo {
  node: string | null
  npm: string | null
}

export interface AgentsReport {
  tools: ToolReport[]
  node: NodeInfo
  checkedAt: number
}

export interface ToolCommand {
  action: 'install' | 'update'
  text: string
  needsNode: boolean
}

export const MIN_NODE_MAJOR = 20
export const NODE_DOWNLOAD_URL = 'https://nodejs.org/en/download'
export const NODE_NOTE = `Needs Node.js ${MIN_NODE_MAJOR}+ - install from nodejs.org`

export const NPM_PACKAGES: Record<AgentKind, string> = {
  claude: '@anthropic-ai/claude-code',
  codex: '@openai/codex',
  gemini: '@google/gemini-cli'
}

export const TOOL_NAMES: Record<AgentKind, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI'
}

export const CLAUDE_NATIVE_INSTALL = 'irm https://claude.ai/install.ps1 | iex'

const SEMVER = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/

const PREFERRED: Record<AgentKind, RegExp> = {
  claude: /^\s*(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s*\(Claude Code\)/m,
  codex: /codex(?:-cli)?\s+v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/i,
  gemini: /^\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s*$/m
}

export function parseVersion(agent: AgentKind, output: string): string | null {
  const preferred = PREFERRED[agent].exec(output)
  if (preferred) return preferred[1]
  return SEMVER.exec(output)?.[1] ?? null
}

export function parseNodeVersion(output: string): string | null {
  return /v?(\d+\.\d+\.\d+)/.exec(output)?.[1] ?? null
}

function parts(version: string): number[] {
  return version.split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0)
}

export function compareSemver(a: string, b: string): number {
  const left = parts(a)
  const right = parts(b)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  const preA = a.includes('-')
  const preB = b.includes('-')
  if (preA === preB) return 0
  return preA ? -1 : 1
}

export function toolState(tool: ToolReport): ToolState {
  if (!tool.present) return 'missing'
  if (tool.installed === null || tool.latest === null) return 'unknown'
  return compareSemver(tool.installed, tool.latest) < 0 ? 'update' : 'current'
}

export function claudeInstallKind(path: string | null): InstallKind | null {
  if (path === null) return null
  const lower = path.toLowerCase()
  if (/\.(cmd|bat|ps1)$/.test(lower) || lower.includes('node_modules')) return 'npm'
  return 'native'
}

export function toolCommand(tool: ToolReport): ToolCommand {
  const action = tool.present ? 'update' : 'install'
  const npm = `npm install -g ${NPM_PACKAGES[tool.agent]}@latest`
  if (tool.agent !== 'claude') return { action, text: npm, needsNode: true }
  if (!tool.present) return { action, text: CLAUDE_NATIVE_INSTALL, needsNode: false }
  if (tool.installKind === 'npm') return { action, text: npm, needsNode: true }
  return { action, text: 'claude update', needsNode: false }
}

export function nodeProblem(info: NodeInfo): string | null {
  if (info.node === null || info.npm === null) return NODE_NOTE
  const major = Number.parseInt(info.node.split('.')[0], 10)
  return Number.isFinite(major) && major >= MIN_NODE_MAJOR ? null : NODE_NOTE
}

export function sourceLine(tool: ToolReport): string {
  if (tool.agent !== 'claude') return `npm ${NPM_PACKAGES[tool.agent]}`
  if (tool.installKind === 'npm') return `npm ${NPM_PACKAGES.claude}`
  return tool.present ? 'native installer · claude update' : 'native installer'
}

export function joinCommands(commands: string[], shellFile: string): string {
  const name = shellFile.replace(/^.*[\\/]/, '').toLowerCase()
  return commands.join(name === 'cmd.exe' || name === 'cmd' ? ' & ' : '; ')
}

export interface TaskPlan {
  label: string
  agents: AgentKind[]
  commands: string[]
}

export function planFor(tools: ToolReport[], selection: AgentKind[] | 'updates'): TaskPlan | null {
  const chosen =
    selection === 'updates' ? tools.filter((t) => toolState(t) === 'update') : tools.filter((t) => selection.includes(t.agent))
  if (chosen.length === 0) return null
  const commands = chosen.map((t) => toolCommand(t))
  const label = chosen.length === 1 ? `${commands[0].action} ${chosen[0].agent}` : 'update all'
  return { label, agents: chosen.map((t) => t.agent), commands: commands.map((c) => c.text) }
}

export interface TaskOutcome {
  ok: boolean
  text: string
}

export function taskOutcome(before: ToolReport, after: ToolReport | undefined, exitCode: number): TaskOutcome {
  const name = TOOL_NAMES[before.agent]
  const version = after?.installed ?? null
  if (after?.present && version !== null) {
    if (!before.present) return { ok: true, text: `${name} ${version} installed.` }
    if (before.installed !== version) return { ok: true, text: `${name} updated to ${version}.` }
    if (exitCode === 0) return { ok: true, text: `${name} is already at ${version}.` }
  }
  const verb = before.present ? 'updated' : 'installed'
  return { ok: false, text: `${name} was not ${verb} (exit code ${exitCode}). The output is in the tab.` }
}
