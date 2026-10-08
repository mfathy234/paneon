import type { SessionFile, SessionStatus } from './types'

export interface TermRef {
  id: string
  pid?: number
  cwd: string
  startedAt: number
}

const FALLBACK_GRACE_MS = 5000
const PROC_START_TOLERANCE_MS = 30_000
const FILETIME_TICKS_PER_MS = 10_000n
const FILETIME_EPOCH_OFFSET_MS = 11_644_473_600_000
const FILETIME_MIN_TICKS = 1_000_000_000_000_000n
const UNIX_MS_MIN = 1_000_000_000_000n
const UNIX_MS_MAX = 100_000_000_000_000n

export const normalizePath = (value: string): string =>
  value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()

const sessionTime = (session: SessionFile): number => session.startedAt ?? session.updatedAt ?? 0

const toTicks = (value: unknown): bigint | undefined => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : undefined
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim())
  return undefined
}

export function procStartMs(value: unknown): number | undefined {
  const ticks = toTicks(value)
  if (ticks === undefined) return undefined
  if (ticks > FILETIME_MIN_TICKS) return Number(ticks / FILETIME_TICKS_PER_MS) - FILETIME_EPOCH_OFFSET_MS
  if (ticks >= UNIX_MS_MIN && ticks <= UNIX_MS_MAX) return Number(ticks)
  return undefined
}

export function isPidHitValid(session: SessionFile, term: TermRef): boolean {
  const startedMs = procStartMs(session.procStart)
  if (startedMs !== undefined) {
    return Math.abs(startedMs - term.startedAt) <= PROC_START_TOLERANCE_MS
  }
  const seen = session.updatedAt ?? session.startedAt
  return seen !== undefined && seen >= term.startedAt - FALLBACK_GRACE_MS
}

export function matchSessions(terms: TermRef[], sessions: SessionFile[]): Map<string, SessionFile> {
  const result = new Map<string, SessionFile>()
  const claimed = new Set<string>()
  for (const term of terms) {
    const hit = term.pid === undefined ? undefined : sessions.find((s) => s.pid === term.pid)
    if (!hit) continue
    claimed.add(hit.sessionId)
    if (isPidHitValid(hit, term)) result.set(term.id, hit)
  }
  const pending = terms.filter((t) => !result.has(t.id)).sort((a, b) => a.startedAt - b.startedAt)
  for (const term of pending) {
    const cwd = normalizePath(term.cwd)
    const candidates = sessions
      .filter((s) => !s.permissionDenied && !claimed.has(s.sessionId) && normalizePath(s.cwd) === cwd)
      .filter((s) => sessionTime(s) >= term.startedAt - FALLBACK_GRACE_MS)
      .sort((a, b) => Math.abs(sessionTime(a) - term.startedAt) - Math.abs(sessionTime(b) - term.startedAt))
    if (candidates.length > 0) {
      result.set(term.id, candidates[0])
      claimed.add(candidates[0].sessionId)
    }
  }
  return result
}

export function sessionDisplayName(session: SessionFile | undefined): string | null {
  if (!session) return null
  const name = session.name?.trim()
  if (!name || session.nameSource === 'derived') return null
  return name
}

export function sessionStatus(session: SessionFile | undefined): SessionStatus | null {
  if (!session) return null
  if (session.status === 'busy') return 'busy'
  if (session.status === 'idle') return 'idle'
  return null
}

const WAITING_STATUS = /wait|permission|approv|input/i

export function sessionWaiting(session: SessionFile | undefined): boolean {
  return Boolean(session?.status && sessionStatus(session) === null && WAITING_STATUS.test(session.status))
}
