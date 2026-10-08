import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface FakeVersions {
  claude?: string | null
  codex?: string | null
  gemini?: string | null
}

export interface FakeLatest {
  claude: string
  codex: string
  gemini: string
}

export interface FakeTools {
  dir: string
  pathEntry: string
  commands: { claude: string; codex: string; gemini: string }
  failInstalls(): void
}

const crlf = (lines: string[]): string => `${lines.join('\r\n')}\r\n`

const OUTPUT: Record<keyof FakeLatest, (version: string) => string> = {
  claude: (v) => `${v} (Claude Code)`,
  codex: (v) => `codex-cli ${v}`,
  gemini: (v) => v
}

const PACKAGES: Record<keyof FakeLatest, string> = {
  claude: '@anthropic-ai/claude-code',
  codex: '@openai/codex',
  gemini: '@google/gemini-cli'
}

function cliScript(dir: string, name: keyof FakeLatest): string {
  const state = join(dir, 'state', `${name}.ver`)
  const latest = join(dir, 'latest', `${name}.txt`)
  const lines = [
    '@echo off',
    `if "%1"=="--version" goto version`,
    'if "%1"=="update" goto update',
    'echo fake cli',
    'exit /b 0',
    ':version',
    `type "${state}"`,
    'exit /b 0',
    ':update',
    `set /p V=<"${latest}"`,
    `>"${state}" echo ${OUTPUT[name]('%V%')}`,
    'echo fake update done',
    'exit /b 0'
  ]
  return crlf(lines)
}

function npmScript(dir: string): string {
  const lines = [
    '@echo off',
    'if "%1"=="--version" goto version',
    'if "%1"=="view" goto view',
    'if "%1"=="install" goto install',
    'exit /b 1',
    ':version',
    'echo 10.2.0',
    'exit /b 0',
    ':view'
  ]
  for (const name of Object.keys(PACKAGES) as (keyof FakeLatest)[]) {
    lines.push(`if "%2"=="${PACKAGES[name]}" type "${join(dir, 'latest', `${name}.txt`)}" & exit /b 0`)
  }
  lines.push('exit /b 1', ':install', `if exist "${join(dir, 'fail.txt')}" goto fail`, 'echo fake npm: installing %3')
  for (const name of Object.keys(PACKAGES) as (keyof FakeLatest)[]) {
    lines.push(
      `if "%3"=="${PACKAGES[name]}@latest" copy /y "${join(dir, 'templates', `${name}.cmd`)}" "${join(dir, 'bin', `${name}.cmd`)}" >nul`,
      `if "%3"=="${PACKAGES[name]}@latest" set /p V=<"${join(dir, 'latest', `${name}.txt`)}"`,
      `if "%3"=="${PACKAGES[name]}@latest" >"${join(dir, 'state', `${name}.ver`)}" echo ${OUTPUT[name]('%V%')}`
    )
  }
  lines.push('echo fake npm: added 1 package', 'exit /b 0', ':fail', 'echo npm ERR! fake failure', 'exit /b 1')
  return crlf(lines)
}

export function createFakeTools(dir: string, installed: FakeVersions, latest: FakeLatest): FakeTools {
  const bin = join(dir, 'bin')
  for (const sub of ['bin', 'state', 'latest', 'templates']) mkdirSync(join(dir, sub), { recursive: true })
  const names = Object.keys(PACKAGES) as (keyof FakeLatest)[]
  for (const name of names) {
    writeFileSync(join(dir, 'latest', `${name}.txt`), `${latest[name]}\r\n`)
    writeFileSync(join(dir, 'templates', `${name}.cmd`), cliScript(dir, name))
    const version = installed[name]
    if (version) {
      writeFileSync(join(dir, 'state', `${name}.ver`), `${OUTPUT[name](version)}\r\n`)
      writeFileSync(join(bin, `${name}.cmd`), cliScript(dir, name))
    }
  }
  writeFileSync(join(bin, 'npm.cmd'), npmScript(dir))
  writeFileSync(join(bin, 'node.cmd'), crlf(['@echo off', 'echo v24.1.0']))
  const commands = {
    claude: join(bin, 'claude.cmd'),
    codex: join(bin, 'codex.cmd'),
    gemini: join(bin, 'gemini.cmd')
  }
  return { dir, pathEntry: bin, commands, failInstalls: () => writeFileSync(join(dir, 'fail.txt'), 'x') }
}
