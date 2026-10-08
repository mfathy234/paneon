import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sandbox } from '../e2e/helpers'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const CLAUDE_USAGE_IDS: Record<string, string> = {
  'acme-web': '5d2c8a10-7e3b-4c55-9f21-0a6b4d8e1c77',
  'billing-api': '8e4f1b22-9a6c-4d3e-8b17-3c5d7e9f2a88'
}
const CODEX_USAGE_ID = '019bbbbb-0000-7000-8000-0000000000bb'

const jsonl = (records: unknown[]): string => `${records.map((record) => JSON.stringify(record)).join('\n')}\n`

function startOfDay(now: number, daysAgo: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

function when(now: number, daysAgo: number, hour: number, slot: number): number {
  if (daysAgo === 0) return Math.max(startOfDay(now, 0) + 1000, now - (slot + 1) * 60_000)
  return startOfDay(now, daysAgo) + hour * HOUR + slot * 7 * 60_000
}

const CLAUDE_DAYS: [number, number][] = [
  [180_000, 90_000],
  [420_000, 210_000],
  [310_000, 120_000],
  [90_000, 40_000],
  [520_000, 250_000],
  [260_000, 130_000],
  [380_000, 160_000]
]

const CODEX_DAYS = [140_000, 60_000, 210_000, 80_000, 330_000, 120_000, 250_000]
const GEMINI_DAYS = [60_000, 20_000, 90_000, 30_000, 70_000, 40_000, 55_000]

function claudeRecords(now: number, project: string, cwd: string): unknown[] {
  const records: unknown[] = []
  CLAUDE_DAYS.forEach((totals, index) => {
    const daysAgo = 6 - index
    const total = totals[project === 'acme-web' ? 0 : 1]
    for (let part = 0; part < 3; part += 1) {
      const share = Math.round(total / 3)
      records.push({
        type: 'assistant',
        timestamp: new Date(when(now, daysAgo, 9 + part * 2, part)).toISOString(),
        cwd,
        sessionId: CLAUDE_USAGE_IDS[project],
        message: {
          id: `m-${project}-${daysAgo}-${part}`,
          usage: {
            input_tokens: Math.round(share * 0.04),
            output_tokens: Math.round(share * 0.26),
            cache_creation_input_tokens: Math.round(share * 0.7),
            cache_read_input_tokens: share * 6
          }
        }
      })
    }
  })
  return records
}

function codexRecords(now: number, folder: string): unknown[] {
  const records: unknown[] = [
    { type: 'session_meta', timestamp: new Date(when(now, 6, 10, 0)).toISOString(), payload: { id: CODEX_USAGE_ID, cwd: folder } }
  ]
  let input = 0
  let output = 0
  CODEX_DAYS.forEach((total, index) => {
    const daysAgo = 6 - index
    input += Math.round(total * 0.75)
    output += Math.round(total * 0.25)
    records.push({
      type: 'event_msg',
      timestamp: new Date(when(now, daysAgo, 10, 0)).toISOString(),
      payload: {
        type: 'token_count',
        info: {
          total_token_usage: {
            input_tokens: input,
            cached_input_tokens: Math.round(input * 0.5),
            output_tokens: output,
            total_tokens: input + output
          }
        }
      }
    })
  })
  return records
}

function geminiRecords(now: number): unknown[] {
  const records: unknown[] = [{ sessionId: 'c0de1234-0000-4000-8000-000000000000', startTime: new Date(now - 6 * DAY).toISOString() }]
  GEMINI_DAYS.forEach((total, index) => {
    records.push({
      id: `g-${index}`,
      type: 'gemini',
      timestamp: new Date(when(now, 6 - index, 13, 0)).toISOString(),
      content: 'Done.',
      tokens: { input: Math.round(total * 0.6), output: Math.round(total * 0.4), cached: Math.round(total * 0.2), thoughts: 0, tool: 0, total }
    })
  })
  return records
}

function historyRecords(now: number, folders: Record<string, string>): unknown {
  const costs: Record<string, unknown> = {}
  const usd = [4.1, 9.35, 6.2, 1.8, 11.4, 5.55, 8.25]
  usd.forEach((value, index) => {
    const daysAgo = 6 - index
    costs[`demo-${daysAgo}`] = {
      at: when(now, daysAgo, 17, 0),
      usd: value,
      cwd: folders[index % 3 === 0 ? 'billing-api' : 'acme-web']
    }
  })
  const limits: unknown[] = []
  const steps = 6 * 24
  for (let step = steps; step >= 0; step -= 2) {
    const at = now - step * HOUR
    const cycle = (step % 10) / 10
    limits.push({ at, w: { five_hour: Math.round(10 + cycle * 52), seven_day: Math.round(2 + ((steps - step) / steps) * 16) } })
  }
  return { v: 1, limits, costs }
}

export function writeUsageDemo(sandbox: Sandbox, folders: Record<string, string>): void {
  const now = Date.now()
  for (const project of ['acme-web', 'billing-api']) {
    const claudeDir = join(sandbox.claudeHome, 'projects', `usage-${project}`)
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, `${CLAUDE_USAGE_IDS[project]}.jsonl`), jsonl(claudeRecords(now, project, folders[project])), 'utf8')
  }
  const codexDir = join(sandbox.codexHome, 'sessions', '2026', '10', '03')
  mkdirSync(codexDir, { recursive: true })
  writeFileSync(join(codexDir, `rollout-2026-10-03T10-00-00-${CODEX_USAGE_ID}.jsonl`), jsonl(codexRecords(now, folders['mobile-shell'])), 'utf8')
  const geminiDir = join(sandbox.geminiHome, 'tmp', 'docs-site')
  mkdirSync(join(geminiDir, 'chats'), { recursive: true })
  writeFileSync(join(geminiDir, '.project_root'), folders['docs-site'], 'utf8')
  writeFileSync(join(geminiDir, 'chats', 'session-2026-10-03T13-00-c0de1234.jsonl'), jsonl(geminiRecords(now)), 'utf8')
  writeFileSync(join(sandbox.userData, 'usage-history.json'), JSON.stringify(historyRecords(now, folders)), 'utf8')
}
