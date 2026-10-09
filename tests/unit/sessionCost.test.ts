import { describe, expect, it } from 'vitest'
import {
  buildUsageSnapshot,
  formatDuration,
  projectTodayLabel,
  projectTodayTooltip,
  sessionUsage
} from '../../src/shared/sessionCost'
import { emptyHistory, hourKey, type UsageFile, type UsageHistory } from '../../src/shared/usage'

const at = (day: number, hour: number): number => new Date(2026, 9, day, hour).getTime()
const NOW = at(9, 15)
const projects = [
  { id: 'web', folder: 'C:/work/acme-web' },
  { id: 'api', folder: 'C:/work/billing-api' }
]

const file = (agent: UsageFile['agent'], sessionId: string, cwd: string, hours: Record<string, number>): UsageFile => ({
  agent,
  sessionId,
  cwd,
  hours: Object.fromEntries(Object.entries(hours).map(([key, tokens]) => [key, { tokens, cacheRead: 0 }]))
})

const history = (costs: UsageHistory['costs']): UsageHistory => ({ ...emptyHistory(), costs })

describe('formatDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatDuration(0)).toBe('<1m')
    expect(formatDuration(59_000)).toBe('<1m')
    expect(formatDuration(14 * 60_000 + 5000)).toBe('14m')
    expect(formatDuration(60 * 60_000)).toBe('1h 00m')
    expect(formatDuration(125 * 60_000)).toBe('2h 05m')
    expect(formatDuration(27 * 3_600_000)).toBe('1d 3h')
    expect(formatDuration(-5)).toBe('<1m')
  })
})

describe('buildUsageSnapshot', () => {
  it('totals a session across days and a project for today only', () => {
    const snapshot = buildUsageSnapshot({
      now: NOW,
      projects,
      history: emptyHistory(),
      files: [
        file('claude', 's1', 'C:/work/acme-web/src', { [hourKey(at(9, 9))]: 1000, [hourKey(at(7, 9))]: 500 }),
        file('codex', 's2', 'C:/work/acme-web', { [hourKey(at(9, 10))]: 300 }),
        file('gemini', 's3', 'C:/elsewhere', { [hourKey(at(9, 10))]: 50 })
      ]
    })
    expect(snapshot.sessions.s1).toEqual({ tokens: 1500, costUsd: null })
    expect(snapshot.sessions.s2).toEqual({ tokens: 300, costUsd: null })
    expect(snapshot.projectsToday.web.tokens).toBe(1300)
    expect(snapshot.projectsToday.web.perAgent.claude.tokens).toBe(1000)
    expect(snapshot.projectsToday.web.perAgent.codex).toEqual({ tokens: 300, costUsd: null })
    expect(snapshot.projectsToday.web.costUsd).toBeNull()
    expect(snapshot.projectsToday.api).toBeUndefined()
  })

  it('adds Claude cost from the status history and keeps old costs out of today', () => {
    const snapshot = buildUsageSnapshot({
      now: NOW,
      projects,
      files: [file('claude', 's1', 'C:/work/acme-web', { [hourKey(at(9, 9))]: 1000 })],
      history: history({
        s1: { at: at(9, 14), usd: 1.84, cwd: 'C:/work/acme-web' },
        s9: { at: at(7, 14), usd: 9, cwd: 'C:/work/acme-web' },
        s8: { at: at(9, 13), usd: 0.5, cwd: 'C:/work/billing-api' }
      })
    })
    expect(snapshot.sessions.s1).toEqual({ tokens: 1000, costUsd: 1.84 })
    expect(snapshot.projectsToday.web.costUsd).toBe(1.84)
    expect(snapshot.projectsToday.web.perAgent.claude.costUsd).toBe(1.84)
    expect(snapshot.projectsToday.api).toEqual(expect.objectContaining({ tokens: 0, costUsd: 0.5 }))
  })

  it('leaves out projects with nothing today', () => {
    const snapshot = buildUsageSnapshot({
      now: NOW,
      projects,
      history: emptyHistory(),
      files: [file('claude', 's1', 'C:/work/acme-web', { [hourKey(at(7, 9))]: 1000 })]
    })
    expect(snapshot.projectsToday).toEqual({})
  })
})

describe('sessionUsage', () => {
  it('prefers the live cost and hides an empty session', () => {
    expect(sessionUsage({ tokens: 10, costUsd: 1 }, 2)).toEqual({ tokens: 10, costUsd: 2 })
    expect(sessionUsage({ tokens: 10, costUsd: 1 }, null)).toEqual({ tokens: 10, costUsd: 1 })
    expect(sessionUsage(undefined, null)).toBeNull()
    expect(sessionUsage(undefined, 0.3)).toEqual({ tokens: 0, costUsd: 0.3 })
  })
})

describe('project labels', () => {
  const today = {
    tokens: 312_000,
    costUsd: 1.84,
    perAgent: {
      claude: { tokens: 200_000, costUsd: 1.84 },
      codex: { tokens: 112_000, costUsd: null },
      gemini: { tokens: 0, costUsd: null }
    }
  }

  it('shows cost only when there is Claude cost', () => {
    expect(projectTodayLabel(today)).toBe('today $1.84 · 312K')
    expect(projectTodayLabel({ ...today, costUsd: null })).toBe('today 312K')
    expect(projectTodayLabel(undefined)).toBeNull()
    expect(projectTodayLabel({ ...today, tokens: 0, costUsd: null })).toBeNull()
  })

  it('breaks the tooltip down by agent', () => {
    expect(projectTodayTooltip(today)).toBe('Today\nClaude: $1.84 · 200K tokens\nCodex: 112K tokens')
  })
})
