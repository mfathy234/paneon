import { describe, expect, it } from 'vitest'
import {
  isPidHitValid,
  matchSessions,
  normalizePath,
  procStartMs,
  sessionDisplayName,
  sessionStatus,
  type TermRef
} from '../../src/shared/sessionMatch'
import type { SessionFile } from '../../src/shared/types'

const session = (overrides: Partial<SessionFile>): SessionFile => ({
  pid: 1,
  sessionId: 's1',
  cwd: 'C:\\Work\\acme-web',
  name: 'acme-web-77',
  nameSource: 'derived',
  status: 'idle',
  startedAt: 100_000,
  updatedAt: 100_000,
  ...overrides
})

const term = (overrides: Partial<TermRef>): TermRef => ({
  id: 't1',
  pid: 10,
  cwd: 'C:\\Work\\acme-web',
  startedAt: 100_000,
  ...overrides
})

describe('matchSessions', () => {
  it('matches by pid first, even when another session shares the cwd', () => {
    const sessions = [
      session({ pid: 99, sessionId: 'other', startedAt: 200_000 }),
      session({ pid: 10, sessionId: 'mine' })
    ]
    expect(matchSessions([term({})], sessions).get('t1')?.sessionId).toBe('mine')
  })

  it('falls back to the session in the same folder that started closest to the terminal', () => {
    const sessions = [
      session({ pid: 50, sessionId: 'close', startedAt: 100_500, cwd: 'c:/work/acme-web/' }),
      session({ pid: 51, sessionId: 'far', startedAt: 160_000 })
    ]
    expect(matchSessions([term({ pid: 777 })], sessions).get('t1')?.sessionId).toBe('close')
  })

  it('gives two tabs in one folder their own session, oldest tab first', () => {
    const sessions = [
      session({ pid: 61, sessionId: 'second', startedAt: 130_000 }),
      session({ pid: 60, sessionId: 'first', startedAt: 101_000 })
    ]
    const terms = [
      term({ id: 'later', pid: 801, startedAt: 129_000 }),
      term({ id: 'earlier', pid: 800, startedAt: 100_000 })
    ]
    const result = matchSessions(terms, sessions)
    expect(result.get('earlier')?.sessionId).toBe('first')
    expect(result.get('later')?.sessionId).toBe('second')
  })

  it('ignores a pid hit from an orphaned file of a reused pid', () => {
    const orphan = session({ pid: 10, sessionId: 'orphan', startedAt: 1_000, updatedAt: 2_000 })
    expect(matchSessions([term({})], [orphan]).size).toBe(0)
  })

  it('checks procStart against the terminal start when the file has it', () => {
    const terminal = term({ startedAt: 1791451653398 })
    const good = session({ pid: 10, sessionId: 'good', procStart: '134359252530824372' })
    const reused = session({
      pid: 10,
      sessionId: 'reused',
      procStart: '134359000000000000',
      updatedAt: 1791451653398 + 1000
    })
    expect(matchSessions([terminal], [good]).get('t1')?.sessionId).toBe('good')
    expect(matchSessions([terminal], [reused]).size).toBe(0)
  })

  it('does not fall back to sessions whose process could not be probed', () => {
    const denied = session({ pid: 50, sessionId: 'denied', permissionDenied: true })
    expect(matchSessions([term({ pid: 777 })], [denied]).size).toBe(0)
  })

  it('does not let two terminals claim the same session', () => {
    const sessions = [session({ pid: 50, sessionId: 'only' })]
    const result = matchSessions([term({ id: 'a', pid: 1 }), term({ id: 'b', pid: 2 })], sessions)
    expect(result.size).toBe(1)
  })

  it('does not claim a session another terminal matches by pid', () => {
    const sessions = [session({ pid: 10, sessionId: 'x' })]
    const result = matchSessions([term({ id: 'a', pid: 5 }), term({ id: 'b', pid: 10 })], sessions)
    expect(result.get('b')?.sessionId).toBe('x')
    expect(result.has('a')).toBe(false)
  })

  it('ignores sessions in other folders and sessions that predate the terminal', () => {
    const sessions = [
      session({ pid: 50, sessionId: 'elsewhere', cwd: 'C:\\Work\\Other' }),
      session({ pid: 51, sessionId: 'stale', startedAt: 1_000 })
    ]
    expect(matchSessions([term({ pid: 777 })], sessions).size).toBe(0)
  })

  it('works for terminals without a pid yet', () => {
    const sessions = [session({ pid: 50, sessionId: 'x' })]
    expect(matchSessions([term({ pid: undefined })], sessions).get('t1')?.sessionId).toBe('x')
  })
})

describe('session names and status', () => {
  it('uses the name only when it is not derived', () => {
    expect(sessionDisplayName(session({ nameSource: 'derived' }))).toBeNull()
    expect(sessionDisplayName(session({ nameSource: 'user', name: 'User avatars' }))).toBe('User avatars')
    expect(sessionDisplayName(session({ nameSource: 'ai', name: 'Fix login' }))).toBe('Fix login')
    expect(sessionDisplayName(session({ nameSource: undefined, name: 'Plain' }))).toBe('Plain')
  })

  it('ignores empty names and missing sessions', () => {
    expect(sessionDisplayName(session({ nameSource: 'user', name: '  ' }))).toBeNull()
    expect(sessionDisplayName(undefined)).toBeNull()
  })

  it('reads busy and idle only', () => {
    expect(sessionStatus(session({ status: 'busy' }))).toBe('busy')
    expect(sessionStatus(session({ status: 'idle' }))).toBe('idle')
    expect(sessionStatus(session({ status: 'waiting' }))).toBeNull()
    expect(sessionStatus(undefined)).toBeNull()
  })

  it('normalizes separators, case and trailing slashes', () => {
    expect(normalizePath('C:\\Work\\acme-web\\')).toBe('c:/work/acme-web')
  })
})

describe('isPidHitValid', () => {
  it('accepts a file updated after the terminal started, rejects an older one', () => {
    expect(isPidHitValid(session({ updatedAt: 100_000 }), term({}))).toBe(true)
    expect(isPidHitValid(session({ updatedAt: 50_000, startedAt: 50_000 }), term({}))).toBe(false)
  })

  it('rejects a file with no timestamps', () => {
    expect(isPidHitValid(session({ updatedAt: undefined, startedAt: undefined }), term({}))).toBe(false)
  })
})

describe('procStartMs', () => {
  it('converts a FILETIME string to unix ms within 1 ms', () => {
    const ms = procStartMs('134359252530824372')
    expect(ms).toBeDefined()
    expect(Math.abs((ms as number) - 1791451653082)).toBeLessThanOrEqual(1)
  })

  it('validates a FILETIME procStart against a term started 316 ms later', () => {
    const fileTime = session({ procStart: '134359252530824372' })
    expect(isPidHitValid(fileTime, term({ startedAt: 1791451653398 }))).toBe(true)
  })

  it('passes unix ms input through unchanged', () => {
    expect(procStartMs(1791451653082)).toBe(1791451653082)
    expect(procStartMs('1791451653082')).toBe(1791451653082)
  })

  it('returns undefined for garbage', () => {
    expect(procStartMs('not-a-number')).toBeUndefined()
    expect(procStartMs('12abc')).toBeUndefined()
    expect(procStartMs('')).toBeUndefined()
    expect(procStartMs(undefined)).toBeUndefined()
    expect(procStartMs(null)).toBeUndefined()
    expect(procStartMs({})).toBeUndefined()
    expect(procStartMs(-5)).toBeUndefined()
    expect(procStartMs(101_000)).toBeUndefined()
    expect(procStartMs(1.5)).toBeUndefined()
  })
})
