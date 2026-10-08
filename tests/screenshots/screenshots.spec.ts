import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { createFakeTools } from '../support/fakeTools'
import { closeApp, createSandbox, launchApp, runCli, type Sandbox } from '../e2e/helpers'
import { CLAUDE_IDS, composeCliImage, writeHistory, type CliRun } from './resumeFixtures'

const OUT = resolve(__dirname, '../../docs/screenshots')
const DEMO_ROOT = 'C:\\paneon-demo'
const SCRIPT = resolve(__dirname, 'demo-agent.cjs')
const SIZE = { width: 1600, height: 1000 }

const PROJECTS = [
  { id: 'acme-web', name: 'acme-web', defaultAgent: 'claude' },
  { id: 'billing-api', name: 'billing-api', defaultAgent: 'claude' },
  { id: 'mobile-shell', name: 'mobile-shell', defaultAgent: 'codex' },
  { id: 'docs-site', name: 'docs-site', defaultAgent: 'gemini' }
] as const

const folder = (name: string): string => join(DEMO_ROOT, name)

function seed(sandbox: Sandbox, withFolders: boolean): void {
  if (withFolders) for (const p of PROJECTS) mkdirSync(folder(p.name), { recursive: true })
  const settings = { version: 2, projects: PROJECTS.map((p) => ({ ...p, folder: folder(p.name) })) }
  writeFileSync(join(sandbox.userData, 'settings.json'), JSON.stringify(settings), 'utf8')
}

function demoEnv(): Record<string, string> {
  const node = process.execPath
  return {
    PANEON_CLAUDE_COMMAND: node,
    PANEON_CLAUDE_ARGS: JSON.stringify([SCRIPT, 'claude']),
    PANEON_CODEX_COMMAND: node,
    PANEON_CODEX_ARGS: JSON.stringify([SCRIPT, 'codex']),
    PANEON_GEMINI_COMMAND: node,
    PANEON_GEMINI_ARGS: JSON.stringify([SCRIPT, 'gemini'])
  }
}

async function resize(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }, size) => {
    const window = BrowserWindow.getAllWindows()[0]
    window.setContentSize(size.width, size.height)
    window.center()
  }, SIZE)
}

function writeClaudeSession(sandbox: Sandbox, project: string, name: string, status: string): void {
  const now = Date.now()
  writeFileSync(
    join(sandbox.sessionsDir, `${project}.json`),
    JSON.stringify({
      pid: process.pid,
      sessionId: CLAUDE_IDS[project] ?? `sess-${project}`,
      cwd: folder(project),
      name,
      nameSource: 'user',
      status,
      startedAt: now + 1000,
      updatedAt: now + 1000
    }),
    'utf8'
  )
}

function writeOps(sandbox: Sandbox): void {
  const now = Date.now()
  mkdirSync(sandbox.opsDir, { recursive: true })
  const snapshot = {
    v: 1,
    sessionId: CLAUDE_IDS['acme-web'],
    cwd: folder('acme-web'),
    updatedAt: now,
    ended: false,
    model: 'claude-opus-5-5',
    orchestrate: true,
    plan: { title: 'Dark mode toggle', done: 3, total: 6 },
    agents: [
      { id: 'a1', description: 'Read the settings components', type: 'worker', model: 'claude-haiku-4-5', status: 'done', startedAt: now - 60_000, finishedAt: now - 46_000, tokens: 12_000, tools: 3 },
      { id: 'a2', description: 'Unit tests for ThemeToggle', type: 'worker', model: 'claude-sonnet-5-5', status: 'running', startedAt: now - 48_000, tokens: 0, tools: 7, lastStep: 'Bash npm test -- ThemeToggle' },
      { id: 'a3', description: 'Persist the choice in localStorage', type: 'worker', model: 'claude-haiku-4-5', status: 'running', startedAt: now - 9000, tools: 2, lastStep: 'Edit src/context/theme.tsx' },
      { id: 'task-4', description: 'Review the diff', status: 'waiting' }
    ],
    advisor: { status: 'done', verdict: 'OK with notes', note: 'check the contrast of the toggle in light mode', description: 'Review plan' },
    context: { percent: 41, tokens: 82_000, window: 200_000, stage: 'fine' },
    compactions: 1,
    cache: { phase: 'warm', leftMs: 2_820_000, hitPercent: 96 },
    limits: [
      { kind: 'five_hour', percentUsed: 62, resetsAt: new Date(now + 100 * 60_000).toISOString() },
      { kind: 'seven_day', percentUsed: 18, resetsAt: new Date(now + 4 * 86_400_000).toISOString() }
    ],
    files: [
      { path: 'src/components/ThemeToggle.tsx', kind: 'A', by: 'claude-sonnet-5-5', at: now },
      { path: 'src/context/theme.tsx', kind: 'M', by: 'claude-sonnet-5-5', at: now },
      { path: 'src/components/Settings.tsx', kind: 'M', by: 'claude-sonnet-5-5', at: now }
    ],
    checks: [
      { kind: 'build', target: 'acme-web', ok: true, summary: 'Build succeeded', at: now - 120_000 },
      { kind: 'test', target: 'acme-web', ok: true, summary: '41 passed  0 failed', at: now - 60_000 }
    ]
  }
  writeFileSync(join(sandbox.opsDir, `${CLAUDE_IDS['acme-web']}.json`), JSON.stringify(snapshot), 'utf8')
}

function writeCodex(sandbox: Sandbox): void {
  const id = '019aaaaa-0000-7000-8000-00000000d3a0'
  const dir = join(sandbox.codexHome, 'sessions', '2026', '10', '08')
  mkdirSync(dir, { recursive: true })
  const lines = [
    { type: 'session_meta', payload: { id, cwd: folder('mobile-shell'), timestamp: new Date(Date.now() + 1000).toISOString() } },
    { type: 'event_msg', payload: { type: 'user_message', message: 'Fix the flaky login test' } },
    { type: 'event_msg', payload: { type: 'agent_message', message: 'Replacing the sleep with a wait on the session ready event.' } },
    { type: 'event_msg', payload: { type: 'task_started' } },
    { type: 'turn_context', payload: { model: 'gpt-5.6-sol' } },
    { type: 'event_msg', payload: { type: 'token_count', info: { last_token_usage: { total_tokens: 64000 }, model_context_window: 200000 } } }
  ]
  writeFileSync(join(dir, `rollout-2026-10-08T12-00-00-${id}.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8')
  writeFileSync(
    join(sandbox.codexHome, 'session_index.jsonl'),
    JSON.stringify({ id, thread_name: 'Fix flaky login test', updated_at: new Date().toISOString() }) + '\n',
    'utf8'
  )
}

async function writeGemini(sandbox: Sandbox, page: Page): Promise<void> {
  const settingsPath = join(sandbox.userData, 'settings.json')
  const sessionId = await expect
    .poll(() => {
      const panes = JSON.parse(readFileSync(settingsPath, 'utf8')).workspace?.panes ?? []
      return panes.find((p: { projectId: string }) => p.projectId === 'docs-site')?.tabs?.[0]?.sessionId ?? ''
    })
    .toMatch(/^[0-9a-f-]{36}$/)
    .then(() => {
      const panes = JSON.parse(readFileSync(settingsPath, 'utf8')).workspace.panes
      return panes.find((p: { projectId: string }) => p.projectId === 'docs-site').tabs[0].sessionId as string
    })
  const project = join(sandbox.geminiHome, 'tmp', 'docs-site')
  mkdirSync(join(project, 'chats'), { recursive: true })
  writeFileSync(join(project, '.project_root'), folder('docs-site'), 'utf8')
  const lines = [
    { sessionId, projectHash: 'h', startTime: new Date().toISOString(), lastUpdated: new Date().toISOString(), kind: 'main' },
    { id: 'm1', type: 'user', content: [{ text: 'Rewrite the getting started guide' }] },
    { id: 'm2', type: 'gemini', content: 'Done.', model: 'gemini-2.5-pro' }
  ]
  writeFileSync(
    join(project, 'chats', `session-2026-10-08T12-00-${sessionId.slice(0, 8)}.jsonl`),
    lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
    'utf8'
  )
  await page.waitForTimeout(0)
}

async function settle(page: Page, ms = 1500): Promise<void> {
  await page.mouse.move(SIZE.width - 4, SIZE.height - 4)
  await page.waitForTimeout(ms)
}

test.afterAll(() => rmSync(DEMO_ROOT, { recursive: true, force: true }))

test('generates the README screenshots from fake projects only', async () => {
  mkdirSync(OUT, { recursive: true })
  const sandbox = createSandbox()
  seed(sandbox, true)
  writeHistory(sandbox, folder)
  const { app, page } = await launchApp(sandbox, demoEnv())
  try {
    await resize(app)
    for (const project of PROJECTS) {
      const agent = project.defaultAgent[0].toUpperCase() + project.defaultAgent.slice(1)
      await page.getByRole('button', { name: `New ${agent} session in ${project.name}`, exact: true }).click()
    }
    await expect(page.locator('.pane')).toHaveCount(4)
    writeClaudeSession(sandbox, 'acme-web', 'Add dark mode toggle', 'busy')
    writeClaudeSession(sandbox, 'billing-api', 'Refactor invoice export', 'idle')
    writeOps(sandbox)
    writeCodex(sandbox)
    await writeGemini(sandbox, page)
    for (const title of ['Add dark mode toggle', 'Refactor invoice export', 'Fix flaky login test', 'Rewrite the getting started guide']) {
      await expect(page.locator('.pane-title', { hasText: title })).toHaveCount(1, { timeout: 20_000 })
    }
    await expect(page.locator('.info-plan')).toHaveText('▸ 3/6', { timeout: 20_000 })
    await settle(page, 2500)
    await page.screenshot({ path: join(OUT, 'grid.png') })

    const first = page.locator('.pane').first()
    await first.getByRole('button', { name: 'Maximize pane' }).click()
    await page.locator('.pane-info').first().click({ position: { x: 4, y: 10 } })
    await expect(page.locator('.pane-details:visible')).toHaveCount(1)
    await settle(page)
    await page.screenshot({ path: join(OUT, 'focus-details.png') })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(page.locator('.pane.maximized')).toHaveCount(0)

    await page.locator('.agents-toggle').first().click()
    await expect(page.locator('.agents-drawer:visible')).toHaveCount(1)
    await settle(page)
    await page.screenshot({ path: join(OUT, 'agents-drawer.png') })
    await page.locator('.agents-toggle').first().click()

    await page.locator('#projects-button').click()
    await expect(page.locator('.projects-view')).toBeVisible()
    await settle(page, 800)
    await page.screenshot({ path: join(OUT, 'projects.png') })
    await page.locator('#projects-button').click()

    await page.keyboard.press('Control+Shift+R')
    await expect(page.locator('.rp-row')).toHaveCount(8, { timeout: 20_000 })
    await page.locator('.rp-row').first().hover()
    await settle(page, 800)
    await page.mouse.move(700, 300)
    await page.screenshot({ path: join(OUT, 'resume-picker.png') })
    await page.keyboard.press('Escape')
    await expect(page.locator('.resume-picker')).toHaveCount(0)

    await page.getByRole('button', { name: 'Theme' }).click()
    await page.locator('#theme-tokyo-night').click()
    await expect(page.locator('.theme-picker')).toBeVisible()
    await settle(page, 1200)
    await page.screenshot({ path: join(OUT, 'themes.png') })
    await page.locator('#theme-grid-dark').click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.theme-picker')).toHaveCount(0)

    const runs: CliRun[] = []
    const demoCwd = folder('acme-web')
    for (const args of [['ls'], ['start', 'billing-api', '--agent', 'codex'], ['sessions', 'acme-web']]) {
      const result = await runCli(sandbox, args, demoCwd)
      expect(result.code).toBe(0)
      runs.push({ cwd: demoCwd, command: `paneon ${args.join(' ')}`, out: result.out })
    }
    await expect(page.locator('.pane')).toHaveCount(5)
    await expect(page.locator('.pane-header .agent-mark.codex')).toHaveCount(2)
    await settle(page, 2000)
    await composeCliImage(page, await page.screenshot(), runs)
    await page.screenshot({ path: join(OUT, 'cli.png') })
  } finally {
    await closeApp(app)
  }

  const tools = createFakeTools(
    mkdtempSync(join(tmpdir(), 'paneon-shots-tools-')),
    { claude: '2.1.294', codex: '0.156.1', gemini: null },
    { claude: '2.1.301', codex: '0.156.1', gemini: '0.9.1' }
  )
  const second = createSandbox()
  seed(second, false)
  const launched = await launchApp(second, {
    PATH: `${tools.pathEntry}${delimiter}${process.env.PATH ?? ''}`,
    PANEON_CLAUDE_COMMAND: tools.commands.claude,
    PANEON_CODEX_COMMAND: tools.commands.codex,
    PANEON_GEMINI_COMMAND: tools.commands.gemini
  })
  try {
    await resize(launched.app)
    await launched.page.locator('#agents-button').click()
    await expect(launched.page.locator('.tool-flag.update')).toBeVisible()
    await launched.page.locator('.tool-block[data-agent="gemini"]').getByRole('button', { name: 'Show command' }).click()
    await settle(launched.page, 800)
    await launched.page.screenshot({ path: join(OUT, 'agents.png') })
  } finally {
    await closeApp(launched.app)
  }

  const third = createSandbox({ empty: true })
  const first = await launchApp(third, {
    PATH: `${tools.pathEntry}${delimiter}${process.env.PATH ?? ''}`,
    PANEON_CLAUDE_COMMAND: tools.commands.claude,
    PANEON_CODEX_COMMAND: tools.commands.codex,
    PANEON_GEMINI_COMMAND: tools.commands.gemini
  })
  try {
    await resize(first.app)
    await expect(first.page.locator('.onboarding')).toBeVisible()
    await expect(first.page.locator('#ob-agents')).toContainText('installed')
    await settle(first.page, 800)
    await first.page.screenshot({ path: join(OUT, 'onboarding.png') })
  } finally {
    await closeApp(first.app)
  }
})
