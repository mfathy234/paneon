import { AGENT_NAMES } from './agents'
import type { ResumeSession } from './types'

export type AgeGroup = 'Today' | 'Yesterday' | 'This week' | 'Older'

export const RESUME_LIMIT = 50

const DAY_MS = 86_400_000
const GROUPS: AgeGroup[] = ['Today', 'Yesterday', 'This week', 'Older']

function startOfDay(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function ageGroup(modifiedAt: number, now: number): AgeGroup {
  const today = startOfDay(now)
  if (modifiedAt >= today) return 'Today'
  if (modifiedAt >= today - DAY_MS) return 'Yesterday'
  if (modifiedAt >= today - 6 * DAY_MS) return 'This week'
  return 'Older'
}

export function groupSessions<T extends { modifiedAt: number }>(
  sessions: T[],
  now: number
): { label: AgeGroup; sessions: T[] }[] {
  const sorted = [...sessions].sort((a, b) => b.modifiedAt - a.modifiedAt)
  return GROUPS.map((label) => ({ label, sessions: sorted.filter((s) => ageGroup(s.modifiedAt, now) === label) })).filter(
    (group) => group.sessions.length > 0
  )
}

export function matchesQuery(session: ResumeSession, projectName: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const fields = [session.title, projectName, AGENT_NAMES[session.agent], session.firstPrompt ?? ''].map((f) => f.toLowerCase())
  return needle.split(/\s+/).every((word) => fields.some((field) => field.includes(word)))
}

export const messageWord = (count: number): string => `${count} message${count === 1 ? '' : 's'}`

export const sessionSummary = (count: number, projects: number): string =>
  `${count} session${count === 1 ? '' : 's'} across ${projects} project${projects === 1 ? '' : 's'}`
