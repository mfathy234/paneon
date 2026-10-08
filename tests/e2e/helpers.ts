import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

export interface Sandbox {
  root: string
  userData: string
  projectFolder: string
  sessionsDir: string
  codexHome: string
  geminiHome: string
  claudeHome: string
  openLog: string
  opsDir: string
  notifyLog: string
  pipe: string
}

interface GridHook {
  bufferText(id: string): string
  fontSize(id: string): number
}

export function createSandbox(options: { empty?: boolean } = {}): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'paneon-e2e-'))
  const userData = join(root, 'userData')
  const projectFolder = join(root, 'Smoke Project')
  const sessionsDir = join(root, 'sessions')
  const codexHome = join(root, 'codex-home')
  const geminiHome = join(root, 'gemini-home')
  const claudeHome = join(root, 'claude-home')
  for (const dir of [userData, projectFolder, sessionsDir, codexHome, geminiHome, claudeHome]) mkdirSync(dir, { recursive: true })
  const settings = {
    version: 2,
    projects: [
      { id: 'smoke', name: 'Smoke', folder: projectFolder },
      { id: 'gone', name: 'Missing', folder: join(root, 'does-not-exist') }
    ]
  }
  if (!options.empty) writeFileSync(join(userData, 'settings.json'), JSON.stringify(settings), 'utf8')
  return {
    root,
    userData,
    projectFolder,
    sessionsDir,
    codexHome,
    geminiHome,
    claudeHome,
    openLog: join(root, 'open.log'),
    opsDir: join(root, 'ops'),
    notifyLog: join(root, 'notify.log'),
    pipe: String.raw`\\.\pipe\paneon-e2e-${process.pid}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
}

export async function launchApp(
  sandbox: Sandbox,
  extraEnv: Record<string, string> = {}
): Promise<{ app: ElectronApplication; page: Page }> {
  const env = { ...process.env } as Record<string, string>
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js')],
    env: {
      ...env,
      PANEON_USER_DATA: sandbox.userData,
      PANEON_CLAUDE_COMMAND: 'cmd.exe',
      PANEON_CODEX_COMMAND: 'cmd.exe',
      PANEON_CODEX_HOME: sandbox.codexHome,
      PANEON_GEMINI_COMMAND: 'cmd.exe',
      PANEON_GEMINI_HOME: sandbox.geminiHome,
      PANEON_SHELL: 'cmd.exe',
      PANEON_SESSIONS_DIR: sandbox.sessionsDir,
      PANEON_CLAUDE_HOME: sandbox.claudeHome,
      PANEON_OPS_DIR: sandbox.opsDir,
      PANEON_OPEN_LOG: sandbox.openLog,
      PANEON_NOTIFY_LOG: sandbox.notifyLog,
      PANEON_PIPE: sandbox.pipe,
      ...extraEnv
    }
  })
  const page = await app.firstWindow()
  await page.waitForSelector('html[data-ready="true"]', { timeout: 30_000 })
  return { app, page }
}

export async function activeTermId(page: Page): Promise<string> {
  const id = await page.locator('.term-host.active').first().getAttribute('data-term-id')
  if (!id) throw new Error('No active terminal')
  return id
}

export const bufferText = (page: Page, id: string): Promise<string> =>
  page.evaluate((termId) => (window as unknown as { __grid: GridHook }).__grid.bufferText(termId), id)

export const fontSize = (page: Page, id: string): Promise<number> =>
  page.evaluate((termId) => (window as unknown as { __grid: GridHook }).__grid.fontSize(termId), id)

export const QUIT_BUDGET_MS = 10_000

export async function closeApp(app: ElectronApplication): Promise<number> {
  const started = Date.now()
  const proc = app.process()
  const exited = new Promise<void>((resolve) => proc.once('exit', () => resolve()))
  await app.evaluate(({ app: electronApp }) => electronApp.quit()).catch(() => undefined)
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, QUIT_BUDGET_MS))])
  const elapsed = Date.now() - started
  if (proc.exitCode === null) proc.kill()
  return elapsed
}

export interface CliResult {
  code: number | null
  out: string
  err: string
}

export function runCli(sandbox: Sandbox, args: string[], cwd: string = sandbox.root): Promise<CliResult> {
  const electronPath = require('electron') as unknown as string
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PANEON_PIPE: sandbox.pipe } as Record<string, string>
  return new Promise((resolveResult, reject) => {
    const child = spawn(electronPath, [resolve(__dirname, '../../build/paneon-cli.cjs'), ...args], { cwd, env })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()))
    child.on('error', reject)
    child.on('close', (code) => resolveResult({ code, out: out.trim(), err: err.trim() }))
  })
}
