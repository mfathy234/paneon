import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import type { Sandbox } from '../e2e/helpers'

export const CLAUDE_IDS: Record<string, string> = {
  'acme-web': '7c1e04b2-5d3a-4f10-9a2e-1b8c6d4e0f01',
  'billing-api': '3b9f27c1-8e44-4a6b-b0d5-2c7e91a3f002'
}

const MINUTE = 60_000

const touch = (path: string, minutesAgo: number): void => {
  const when = new Date(Date.now() - minutesAgo * MINUTE)
  utimesSync(path, when, when)
}

const jsonl = (records: unknown[]): string => `${records.map((r) => JSON.stringify(r)).join('\n')}\n`

function turns(count: number, prompt: string, reply: string): { user: string[]; assistant: string[] } {
  const user = [prompt]
  const assistant: string[] = []
  for (let i = 0; i < Math.floor(count / 2); i += 1) {
    if (i > 0) user.push(`Follow-up ${i}`)
    assistant.push(i === Math.floor(count / 2) - 1 ? reply : `Step ${i + 1} done.`)
  }
  return { user, assistant }
}

function claudeSession(
  sandbox: Sandbox,
  folder: string,
  id: string,
  title: string,
  minutesAgo: number,
  count: number,
  prompt: string,
  reply: string
): void {
  const dir = join(sandbox.claudeHome, 'projects', folder.replace(/[^A-Za-z0-9]/g, '-'))
  mkdirSync(dir, { recursive: true })
  const { user, assistant } = turns(count, prompt, reply)
  const records: unknown[] = []
  user.forEach((text, i) => {
    records.push({ type: 'user', timestamp: new Date(Date.now() - minutesAgo * MINUTE - 3_600_000).toISOString(), message: { content: text } })
    records.push({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'text', text: assistant[i] }] } })
  })
  records.push({ type: 'ai-title', aiTitle: title })
  const path = join(dir, `${id}.jsonl`)
  writeFileSync(path, jsonl(records))
  touch(path, minutesAgo)
}

function codexSession(
  sandbox: Sandbox,
  folder: string,
  id: string,
  title: string,
  minutesAgo: number,
  count: number,
  prompt: string,
  reply: string
): void {
  const dir = join(sandbox.codexHome, 'sessions', '2026', '10', '07')
  mkdirSync(dir, { recursive: true })
  const { user, assistant } = turns(count, prompt, reply)
  const records: unknown[] = [
    { type: 'session_meta', payload: { id, cwd: folder, timestamp: new Date(Date.now() - minutesAgo * MINUTE - 3_600_000).toISOString() } },
    { type: 'turn_context', payload: { model: 'gpt-5.6-sol' } }
  ]
  user.forEach((text, i) => {
    records.push({ type: 'event_msg', payload: { type: 'user_message', message: text } })
    records.push({ type: 'event_msg', payload: { type: 'agent_message', message: assistant[i] } })
  })
  const path = join(dir, `rollout-2026-10-07T09-00-00-${id}.jsonl`)
  writeFileSync(path, jsonl(records))
  writeFileSync(join(sandbox.codexHome, 'session_index.jsonl'), `${JSON.stringify({ id, thread_name: title })}\n`, { flag: 'a' })
  touch(path, minutesAgo)
}

function geminiSession(
  sandbox: Sandbox,
  slug: string,
  folder: string,
  id: string,
  minutesAgo: number,
  count: number,
  prompt: string,
  reply: string
): void {
  const root = join(sandbox.geminiHome, 'tmp', slug)
  mkdirSync(join(root, 'chats'), { recursive: true })
  writeFileSync(join(root, '.project_root'), folder)
  const { user, assistant } = turns(count, prompt, reply)
  const started = new Date(Date.now() - minutesAgo * MINUTE - 3_600_000).toISOString()
  const records: unknown[] = [{ sessionId: id, projectHash: 'h', startTime: started, lastUpdated: started, kind: 'main' }]
  user.forEach((text, i) => {
    records.push({ id: `u${i}`, type: 'user', content: [{ text }] })
    records.push({ id: `g${i}`, type: 'gemini', content: assistant[i], model: 'gemini-2.5-pro' })
  })
  const path = join(root, 'chats', `session-2026-10-06T09-00-${id.slice(0, 8)}.jsonl`)
  writeFileSync(path, jsonl(records))
  touch(path, minutesAgo)
}

export function writeHistory(sandbox: Sandbox, folder: (name: string) => string): void {
  claudeSession(sandbox, folder('acme-web'), CLAUDE_IDS['acme-web'], 'Add dark mode toggle', 12, 34,
    'Add a dark mode toggle to the settings page and remember the choice between visits.',
    'The toggle now lives in Settings and stores the choice in local storage. I updated the three header styles to read the theme token. Next I would add a test for the saved preference.')
  claudeSession(sandbox, folder('acme-web'), '52de7f10-2a6c-4b8d-8e31-9c0a7d5b1e03', 'Investigate slow CI', 3 * 1440, 28,
    'The pipeline takes twelve minutes. Find out why.', 'The dependency cache step is skipped on forks; restoring it brings the run to four minutes.')
  claudeSession(sandbox, folder('billing-api'), CLAUDE_IDS['billing-api'], 'Refactor invoice export', 180, 52,
    'Refactor the invoice export into smaller functions.', 'All 41 tests pass and the export output is unchanged.')
  codexSession(sandbox, folder('mobile-shell'), '019aaaaa-0000-7000-8000-00000000e001', 'Migrate to the new router', 1500, 66,
    'Move the tab screens to the new router and keep deep links working.', 'Moved six screens to typed route params; two profile tests still fail.')
  codexSession(sandbox, folder('mobile-shell'), '019aaaaa-0000-7000-8000-00000000e002', 'Update dependencies', 5 * 1440, 8,
    'Update the dependencies and fix what breaks.', 'Updated twelve packages; the build is green.')
  geminiSession(sandbox, 'billing-api', folder('billing-api'), 'a90b6d44-1f2e-4c3b-8d5a-7e9f01b2c304', 4 * 1440, 14,
    'Add a CSV export for invoices.', 'The export streams rows and sets the right content type.')
}

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface CliRun {
  cwd: string
  command: string
  out: string
}

export async function composeCliImage(page: Page, appPng: Buffer, runs: CliRun[]): Promise<void> {
  const blocks = runs
    .map(
      (run) =>
        `<div class="line"><span class="prompt">PS ${escape(run.cwd)}&gt;</span> <span class="cmd">${escape(run.command)}</span></div>` +
        `<pre>${escape(run.out)}</pre>`
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1600px;height:1000px;overflow:hidden;background:#0c0e12}
img{position:absolute;inset:0;width:1600px;height:1000px}
.shade{position:absolute;inset:0;background:rgba(8,10,14,.35)}
.term{position:absolute;left:48px;bottom:48px;width:820px;border:1px solid #2b3240;border-radius:10px;background:#12151c;box-shadow:0 24px 60px rgba(0,0,0,.6);overflow:hidden;font-family:'Cascadia Mono',Consolas,monospace;color:#d6dae3}
.bar{height:34px;display:flex;align-items:center;padding:0 14px;background:#1a1f29;color:#8a93a6;font:13px 'Segoe UI',sans-serif;border-bottom:1px solid #2b3240}
.body{padding:14px 18px 16px;font-size:14px;line-height:1.45}
.line{white-space:pre}.prompt{color:#34d399}.cmd{color:#f2f4f8}
pre{margin:0 0 12px;font:inherit;color:#c3c9d6}
</style></head><body><img src="data:image/png;base64,${appPng.toString('base64')}"><div class="shade"></div>
<div class="term"><div class="bar">Windows PowerShell</div><div class="body">${blocks}</div></div></body></html>`
  await page.setContent(html)
  await page.waitForTimeout(300)
}
