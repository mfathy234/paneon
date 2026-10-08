import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { claudeFallbackDirs, resolveExecutable, splitArgs } from './executables'
import type { AgentKind, SpawnRequest } from '../shared/types'

export interface LaunchSpec {
  file: string
  args: string[]
}

const CODEX_VENDOR = join('@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe')

export const claudeCommand = (): string => process.env.PANEON_CLAUDE_COMMAND || 'claude.exe'

export const codexCommand = (): string => process.env.PANEON_CODEX_COMMAND || 'codex'

export const geminiCommand = (): string => process.env.PANEON_GEMINI_COMMAND || 'gemini'

export function shellCommand(): string {
  if (process.env.PANEON_SHELL) return process.env.PANEON_SHELL
  return resolveExecutable('pwsh.exe') ? 'pwsh.exe' : 'powershell.exe'
}

export function agentCommand(agent: AgentKind): string {
  return agent === 'claude' ? claudeCommand() : agent === 'codex' ? codexCommand() : geminiCommand()
}

export function locateCodexBinary(pathDirs: string[]): string | null {
  for (const dir of pathDirs) {
    if (!dir || !existsSync(join(dir, 'codex.cmd'))) continue
    const nested = join(dir, 'node_modules', '@openai', 'codex', 'node_modules', CODEX_VENDOR)
    const hoisted = join(dir, 'node_modules', CODEX_VENDOR)
    for (const candidate of [nested, hoisted]) if (existsSync(candidate)) return candidate
  }
  return null
}

function resolveCodex(pathDirs: string[]): LaunchSpec | null {
  const command = codexCommand()
  if (process.env.PANEON_CODEX_COMMAND) {
    const file = resolveExecutable(command)
    return file ? { file, args: [] } : null
  }
  const direct = resolveExecutable('codex.exe')
  if (direct) return { file: direct, args: [] }
  const binary = locateCodexBinary(pathDirs)
  if (binary) return { file: binary, args: [] }
  const cmd = resolveExecutable('codex.cmd')
  if (cmd) return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'codex'] }
  return null
}

const GEMINI_BUNDLE = join('node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js')

export function locateGeminiEntry(pathDirs: string[]): LaunchSpec | null {
  for (const dir of pathDirs) {
    if (!dir || !existsSync(join(dir, 'gemini.cmd'))) continue
    const bundle = join(dir, GEMINI_BUNDLE)
    if (!existsSync(bundle)) continue
    const bundled = join(dir, 'node.exe')
    const node = existsSync(bundled) ? bundled : resolveExecutable('node.exe')
    if (node) return { file: node, args: [bundle] }
  }
  return null
}

function resolveGemini(pathDirs: string[]): LaunchSpec | null {
  if (process.env.PANEON_GEMINI_COMMAND) {
    const file = resolveExecutable(geminiCommand())
    return file ? { file, args: [] } : null
  }
  const entry = locateGeminiEntry(pathDirs)
  if (entry) return entry
  if (resolveExecutable('gemini.cmd')) return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'gemini'] }
  return null
}

function geminiArgs(request: Pick<SpawnRequest, 'resume' | 'sessionId'>): string[] {
  if (!request.sessionId) return []
  return request.resume ? ['--resume', request.sessionId] : ['--session-id', request.sessionId]
}

export function agentArgs(request: Pick<SpawnRequest, 'agent' | 'resume' | 'sessionId'>, overridden: boolean): string[] {
  if (overridden) return []
  if (request.agent === 'gemini') return geminiArgs(request)
  if (!request.resume) return []
  if (request.agent === 'claude') return request.sessionId ? ['-r', request.sessionId] : ['--continue']
  return request.sessionId ? ['resume', request.sessionId] : []
}

export function shellArgs(file: string, command?: string): string[] {
  const name = (file.split(/[\\/]/).pop() ?? file).toLowerCase()
  if (command !== undefined) return name === 'cmd.exe' ? ['/d', '/s', '/c', command] : ['-NoLogo', '-Command', command]
  return process.env.PANEON_SHELL ? [] : ['-NoLogo']
}

export function launchSpec(request: SpawnRequest): LaunchSpec | string {
  if (request.agent === 'shell') {
    const command = shellCommand()
    const file = resolveExecutable(command)
    if (!file) return `Shell not found: ${command}`
    return { file, args: shellArgs(file, request.command) }
  }
  const pathDirs = (process.env.PATH ?? '').split(delimiter)
  if (request.agent === 'codex') {
    const base = resolveCodex(pathDirs)
    if (!base) return `Could not find ${codexCommand()}. Install Codex CLI (npm i -g @openai/codex) or set PANEON_CODEX_COMMAND.`
    const overridden = Boolean(process.env.PANEON_CODEX_COMMAND)
    const extra = splitArgs(process.env.PANEON_CODEX_ARGS)
    return { file: base.file, args: [...base.args, ...extra, ...agentArgs(request, overridden)] }
  }
  if (request.agent === 'gemini') {
    const base = resolveGemini(pathDirs)
    if (!base) return `Could not find ${geminiCommand()}. Install Gemini CLI (npm i -g @google/gemini-cli) or set PANEON_GEMINI_COMMAND.`
    const overridden = Boolean(process.env.PANEON_GEMINI_COMMAND)
    const extra = splitArgs(process.env.PANEON_GEMINI_ARGS)
    return { file: base.file, args: [...base.args, ...extra, ...agentArgs(request, overridden)] }
  }
  const command = claudeCommand()
  const file = resolveExecutable(command, claudeFallbackDirs())
  if (!file) return `Could not find ${command}. Install Claude Code or set PANEON_CLAUDE_COMMAND.`
  const args = [...splitArgs(process.env.PANEON_CLAUDE_ARGS), ...agentArgs(request, Boolean(process.env.PANEON_CLAUDE_COMMAND))]
  return { file, args }
}

export const codexHome = (): string => process.env.PANEON_CODEX_HOME ?? join(process.env.USERPROFILE ?? homedir(), '.codex')


export const geminiHome = (): string => process.env.PANEON_GEMINI_HOME ?? join(process.env.USERPROFILE ?? homedir(), '.gemini')
