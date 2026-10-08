import { describe, expect, it } from 'vitest'
import {
  CLAUDE_NATIVE_INSTALL,
  NODE_NOTE,
  claudeInstallKind,
  compareSemver,
  joinCommands,
  nodeProblem,
  parseNodeVersion,
  parseVersion,
  planFor,
  sourceLine,
  taskOutcome,
  toolCommand,
  toolState,
  type ToolReport
} from '../../src/shared/agentTools'

const tool = (patch: Partial<ToolReport> & Pick<ToolReport, 'agent'>): ToolReport => ({
  installed: '1.0.0',
  present: true,
  latest: '1.0.0',
  latestFailed: false,
  installKind: patch.agent === 'claude' ? 'native' : null,
  ...patch
})

describe('parseVersion', () => {
  it('reads the Claude Code output', () => {
    expect(parseVersion('claude', '2.1.294 (Claude Code)\n')).toBe('2.1.294')
  })
  it('reads the Codex output, ignoring warnings before it', () => {
    expect(parseVersion('codex', 'WARNING: proceeding, node 22.1.0\ncodex-cli 0.156.1\n')).toBe('0.156.1')
  })
  it('reads the Gemini output, a bare version', () => {
    expect(parseVersion('gemini', '0.9.1\n')).toBe('0.9.1')
    expect(parseVersion('gemini', '(node:123) ExperimentalWarning: x\n0.9.1\n')).toBe('0.9.1')
  })
  it('keeps prerelease tags and falls back to the first semver', () => {
    expect(parseVersion('codex', 'codex-cli 0.157.0-alpha.2')).toBe('0.157.0-alpha.2')
    expect(parseVersion('claude', 'Claude 3.0.1')).toBe('3.0.1')
  })
  it('returns null when there is no version', () => {
    expect(parseVersion('gemini', 'command not found')).toBeNull()
    expect(parseVersion('claude', '')).toBeNull()
  })
  it('parses node versions', () => {
    expect(parseNodeVersion('v24.11.0\n')).toBe('24.11.0')
    expect(parseNodeVersion('nope')).toBeNull()
  })
})

describe('compareSemver', () => {
  it('orders numerically, not as text', () => {
    expect(compareSemver('2.1.9', '2.1.10')).toBe(-1)
    expect(compareSemver('0.156.1', '0.156.1')).toBe(0)
    expect(compareSemver('1.0.0', '0.99.9')).toBe(1)
  })
  it('puts a prerelease before its release', () => {
    expect(compareSemver('1.0.0-alpha', '1.0.0')).toBe(-1)
    expect(compareSemver('1.0.0', '1.0.0-alpha')).toBe(1)
  })
})

describe('toolState', () => {
  it('derives the outcomes', () => {
    expect(toolState(tool({ agent: 'codex', present: false, installed: null }))).toBe('missing')
    expect(toolState(tool({ agent: 'codex', installed: '0.1.0', latest: '0.2.0' }))).toBe('update')
    expect(toolState(tool({ agent: 'codex', installed: '0.2.0', latest: '0.2.0' }))).toBe('current')
    expect(toolState(tool({ agent: 'codex', installed: '0.3.0', latest: '0.2.0' }))).toBe('current')
    expect(toolState(tool({ agent: 'codex', latest: null, latestFailed: true }))).toBe('unknown')
    expect(toolState(tool({ agent: 'codex', installed: null }))).toBe('unknown')
  })
})

describe('claudeInstallKind and toolCommand', () => {
  it('tells native from npm installs by path', () => {
    expect(claudeInstallKind('C:\\Users\\dev\\.local\\bin\\claude.exe')).toBe('native')
    expect(claudeInstallKind('C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.cmd')).toBe('npm')
    expect(claudeInstallKind('C:\\x\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe')).toBe('npm')
    expect(claudeInstallKind(null)).toBeNull()
  })

  it('installs Claude with the native installer and needs no Node', () => {
    expect(toolCommand(tool({ agent: 'claude', present: false, installed: null, installKind: null }))).toEqual({
      action: 'install',
      text: CLAUDE_NATIVE_INSTALL,
      needsNode: false
    })
  })

  it('updates a native Claude with claude update and an npm Claude with npm', () => {
    expect(toolCommand(tool({ agent: 'claude', installKind: 'native' }))).toEqual({
      action: 'update',
      text: 'claude update',
      needsNode: false
    })
    expect(toolCommand(tool({ agent: 'claude', installKind: 'npm' }))).toEqual({
      action: 'update',
      text: 'npm install -g @anthropic-ai/claude-code@latest',
      needsNode: true
    })
  })

  it('uses npm for Codex and Gemini, install and update alike', () => {
    expect(toolCommand(tool({ agent: 'codex', present: false }))).toEqual({
      action: 'install',
      text: 'npm install -g @openai/codex@latest',
      needsNode: true
    })
    expect(toolCommand(tool({ agent: 'gemini' }))).toEqual({
      action: 'update',
      text: 'npm install -g @google/gemini-cli@latest',
      needsNode: true
    })
  })

  it('describes the source of each tool', () => {
    expect(sourceLine(tool({ agent: 'claude' }))).toBe('native installer · claude update')
    expect(sourceLine(tool({ agent: 'claude', installKind: 'npm' }))).toBe('npm @anthropic-ai/claude-code')
    expect(sourceLine(tool({ agent: 'gemini' }))).toBe('npm @google/gemini-cli')
  })
})

describe('nodeProblem', () => {
  it('accepts Node 20 or newer with npm', () => {
    expect(nodeProblem({ node: '20.0.0', npm: '10.1.0' })).toBeNull()
    expect(nodeProblem({ node: '24.11.0', npm: '11.0.0' })).toBeNull()
  })
  it('reports a missing, old or npm-less Node', () => {
    expect(nodeProblem({ node: null, npm: null })).toBe(NODE_NOTE)
    expect(nodeProblem({ node: '18.19.0', npm: '10.0.0' })).toBe(NODE_NOTE)
    expect(nodeProblem({ node: '22.0.0', npm: null })).toBe(NODE_NOTE)
  })
})

describe('planFor and joinCommands', () => {
  const tools = [
    tool({ agent: 'claude', installed: '2.1.294', latest: '2.1.301' }),
    tool({ agent: 'codex', installed: '0.156.1', latest: '0.156.1' }),
    tool({ agent: 'gemini', present: false, installed: null, latest: '0.9.1' })
  ]

  it('plans one tool with an install or update label', () => {
    expect(planFor(tools, ['gemini'])).toEqual({
      label: 'install gemini',
      agents: ['gemini'],
      commands: ['npm install -g @google/gemini-cli@latest']
    })
    expect(planFor(tools, ['claude'])?.label).toBe('update claude')
  })

  it('plans only the tools with an update for Update all', () => {
    expect(planFor(tools, 'updates')).toEqual({ label: 'update claude', agents: ['claude'], commands: ['claude update'] })
    const two = [tools[0], tool({ agent: 'codex', installed: '0.1.0', latest: '0.2.0' }), tools[2]]
    expect(planFor(two, 'updates')).toEqual({
      label: 'update all',
      agents: ['claude', 'codex'],
      commands: ['claude update', 'npm install -g @openai/codex@latest']
    })
  })

  it('returns null when nothing is selected', () => {
    expect(planFor([tools[1]], 'updates')).toBeNull()
  })

  it('joins commands for the shell in use', () => {
    expect(joinCommands(['a', 'b'], 'C:\\Program Files\\PowerShell\\7\\pwsh.exe')).toBe('a; b')
    expect(joinCommands(['a', 'b'], 'cmd.exe')).toBe('a & b')
  })
})

describe('taskOutcome', () => {
  const before = tool({ agent: 'codex', installed: '0.1.0', latest: '0.2.0' })
  it('reports updates and installs', () => {
    expect(taskOutcome(before, tool({ agent: 'codex', installed: '0.2.0' }), 0)).toEqual({
      ok: true,
      text: 'Codex CLI updated to 0.2.0.'
    })
    const missing = tool({ agent: 'gemini', present: false, installed: null })
    expect(taskOutcome(missing, tool({ agent: 'gemini', installed: '0.9.1' }), 0)).toEqual({
      ok: true,
      text: 'Gemini CLI 0.9.1 installed.'
    })
  })
  it('reports a failure with the exit code', () => {
    const result = taskOutcome(before, tool({ agent: 'codex', installed: '0.1.0' }), 1)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('exit code 1')
    expect(taskOutcome(tool({ agent: 'gemini', present: false, installed: null }), undefined, 1).text).toContain('not installed')
  })
})
