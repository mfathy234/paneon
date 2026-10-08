import { mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, createSandbox, launchApp, type Sandbox } from './helpers'

const SCREENS = 'test-results/screens'
const readSettings = (userData: string): any => JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8'))
const CLAUDE_NEW = '11111111-2222-4333-8444-555555555555'
const CLAUDE_OLD = '11111111-2222-4333-8444-666666666666'
const CODEX_ID = '019aaaaa-0000-7000-8000-0000000000aa'

function minutesSinceMidnight(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
}

const TODAY_NEWEST_MINUTES = (): number => Math.min(12, minutesSinceMidnight() / 3)
const TODAY_OLDER_MINUTES = (): number => Math.min(60, (minutesSinceMidnight() * 2) / 3)

function seed(sandbox: Sandbox): void {
  const dir = join(sandbox.claudeHome, 'projects', sandbox.projectFolder.replace(/[^A-Za-z0-9]/g, '-'))
  mkdirSync(dir, { recursive: true })
  const write = (id: string, title: string, prompt: string, reply: string, minutesAgo: number): void => {
    const path = join(dir, `${id}.jsonl`)
    writeFileSync(
      path,
      [
        JSON.stringify({ type: 'user', timestamp: '2026-10-08T09:12:00.000Z', message: { content: prompt } }),
        JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'text', text: reply }] } }),
        JSON.stringify({ type: 'ai-title', aiTitle: title })
      ].join('\n') + '\n'
    )
    const when = new Date(Date.now() - minutesAgo * 60_000)
    utimesSync(path, when, when)
  }
  write(CLAUDE_NEW, 'Add dark mode toggle', 'Add a dark mode toggle to the settings page', 'The toggle now lives in Settings.', TODAY_NEWEST_MINUTES())
  write(CLAUDE_OLD, 'Investigate slow CI', 'Why is the pipeline slow?', 'The cache step is missing.', 60 * 24 * 4)
  const codexDir = join(sandbox.codexHome, 'sessions', '2026', '10', '08')
  mkdirSync(codexDir, { recursive: true })
  const rollout = join(codexDir, `rollout-2026-10-08T12-00-00-${CODEX_ID}.jsonl`)
  writeFileSync(
    rollout,
    [
      JSON.stringify({ type: 'session_meta', payload: { id: CODEX_ID, cwd: sandbox.projectFolder, timestamp: '2026-10-08T12:00:00.000Z' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'user_message', message: 'Fix the flaky login test' } })
    ].join('\n') + '\n'
  )
  writeFileSync(join(sandbox.codexHome, 'session_index.jsonl'), JSON.stringify({ id: CODEX_ID, thread_name: 'Fix flaky login test' }) + '\n')
  const when = new Date(Date.now() - TODAY_OLDER_MINUTES() * 60_000)
  utimesSync(rollout, when, when)
}

test('the resume picker lists sessions of all agents, filters them and resumes in a new or the current pane', async () => {
  const sandbox = createSandbox()
  seed(sandbox)
  const { app, page } = await launchApp(sandbox)
  try {
    await page.keyboard.press('Control+Shift+R')
    const picker = page.locator('.resume-picker')
    await expect(picker).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Resume' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.rp-row')).toHaveCount(3)
    await expect(page.locator('.rp-group')).toHaveText(['Today', 'This week'])
    await expect(page.locator('.rp-row').first()).toContainText('Add dark mode toggle')
    await expect(page.locator('.rp-row').nth(1)).toContainText('Fix flaky login test')
    await expect(page.locator('.rp-row').first().locator('.rp-project-chip')).toHaveText('Smoke')
    await expect(page.locator('.rp-preview')).toContainText('Claude Code · Opus')
    await expect(page.locator('.rp-preview')).toContainText('Add a dark mode toggle to the settings page')
    await expect(page.locator('.rp-preview')).toContainText('The toggle now lives in Settings.')
    await expect(page.locator('.rp-count')).toHaveText('3 sessions across 1 project')
    await page.screenshot({ path: join(SCREENS, '20-resume-picker.png') })

    await page.getByRole('button', { name: 'Codex', exact: true }).click()
    await expect(page.locator('.rp-row')).toHaveCount(1)
    await expect(page.locator('.rp-row')).toContainText('Fix flaky login test')
    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect(page.locator('.rp-row')).toHaveCount(3)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Claude', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.rp-row')).toHaveCount(2)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.type('slow')
    await expect(page.locator('.rp-row')).toHaveCount(1)
    await expect(page.locator('.rp-row')).toContainText('Investigate slow CI')
    await page.keyboard.press('Control+r')
    await expect(page.getByRole('listbox', { name: 'Start a session in' })).toBeVisible()
    await expect(page.locator('.resume-picker')).toHaveCount(0)
    await page.keyboard.press('Control+r')
    await expect(page.locator('.resume-picker')).toBeVisible()

    await page.locator('#rp-search').fill('')
    await expect(page.locator('.rp-row')).toHaveCount(3)
    await page.keyboard.press('Enter')
    await expect(page.locator('.resume-picker')).toHaveCount(0)
    await expect(page.locator('.pane')).toHaveCount(1)
    await expect.poll(() => readSettings(sandbox.userData).workspace?.panes?.[0]?.tabs?.[0]?.sessionId).toBe(CLAUDE_NEW)
    await expect(page.locator('.chip-resumed')).toBeVisible()
    await page.screenshot({ path: join(SCREENS, '21-resumed-pane.png') })
    await page.locator('.term-host.active').click()
    await page.keyboard.type('x')
    await expect(page.locator('.chip-resumed')).toBeHidden()

    await page.keyboard.press('Control+Shift+R')
    await expect(page.locator('.rp-row').first().locator('.rp-open')).toHaveText('open in pane 1')
    await page.keyboard.press('Enter')
    await expect(page.locator('.pane')).toHaveCount(1)
    await expect(page.locator('.resume-picker')).toHaveCount(0)

    await page.keyboard.press('Control+Shift+R')
    await page.locator('.rp-row', { hasText: 'Fix flaky login test' }).hover()
    await page.keyboard.press('Shift+Enter')
    const dialog = page.getByRole('alertdialog')
    await expect(dialog.getByRole('heading')).toHaveText('Replace claude?')
    await expect(dialog).toContainText("resumes 'Fix flaky login test' in its place")
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.resume-picker')).toBeVisible()
    await page.keyboard.press('Shift+Enter')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Replace claude' }).click()
    await expect(page.locator('.resume-picker')).toHaveCount(0)
    await expect(page.locator('.pane')).toHaveCount(1)
    await expect(page.locator('.pane-header .agent-mark.codex')).toHaveCount(1)
    await expect.poll(() => readSettings(sandbox.userData).workspace?.panes?.[0]?.tabs?.map((t: any) => t.sessionId)).toEqual([CODEX_ID])
  } finally {
    expect(await closeApp(app)).toBeLessThan(10_000)
  }
})

test('resume entry points: split-button menu, project filter and the empty state', async () => {
  const sandbox = createSandbox()
  seed(sandbox)
  const { app, page } = await launchApp(sandbox)
  try {
    await page.getByRole('button', { name: 'Choose agent', exact: true }).click()
    await page.getByRole('menuitem', { name: /Resume a session/ }).click()
    await expect(page.locator('.resume-picker')).toBeVisible()
    await expect(page.locator('#rp-project')).toHaveValue('')
    await page.locator('#rp-project').selectOption('gone')
    await expect(page.locator('.rp-empty')).toContainText('No earlier sessions in Missing.')
    await page.screenshot({ path: join(SCREENS, '22-resume-empty.png') })
    await page.locator('#rp-new').click()
    await expect(page.getByRole('listbox', { name: 'Start a session in' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.quickpick')).toHaveCount(0)
  } finally {
    await closeApp(app)
  }
})
