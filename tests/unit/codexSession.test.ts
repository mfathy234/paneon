import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  codexStatusFromTail,
  matchCodexSessions,
  parseRolloutMeta,
  parseSessionIndex,
  rolloutIdFromName
} from '../../src/shared/codexSession'
import { readCodexSessions } from '../../src/main/codexWatcher'
import type { CodexSession } from '../../src/shared/types'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const ID = '019aaaaa-0000-7000-8000-000000000001'
const marker = (type: string): string => `{"timestamp":"t","type":"event_msg","payload":{"type":"${type}","turn_id":"x"}}\n`

describe('parseRolloutMeta', () => {
  const [first] = fixture('codex-rollout.jsonl').split('\n')

  it('reads id, cwd and start time from the session_meta line', () => {
    expect(parseRolloutMeta(first)).toEqual({
      sessionId: ID,
      cwd: 'C:\\Work\\Example Project',
      startedAt: Date.parse('2026-01-02T10:00:03.127Z')
    })
  })

  it('rejects other lines, missing fields and junk', () => {
    expect(parseRolloutMeta('{"type":"event_msg","payload":{}}')).toBeNull()
    expect(parseRolloutMeta('{"type":"session_meta","payload":{"id":"x"}}')).toBeNull()
    expect(parseRolloutMeta('not json')).toBeNull()
  })
})

describe('rolloutIdFromName and parseSessionIndex', () => {
  it('takes the uuid from the rollout file name', () => {
    expect(rolloutIdFromName(`rollout-2026-01-02T12-00-03-${ID}.jsonl`)).toBe(ID)
    expect(rolloutIdFromName('notes.jsonl')).toBeNull()
  })

  it('maps ids to names, last entry wins, blanks and junk skipped', () => {
    const names = parseSessionIndex(fixture('codex-session-index.jsonl'))
    expect(names.get(ID)).toBe('Renamed by user')
    expect(names.size).toBe(1)
  })
})

describe('codexStatusFromTail', () => {
  const now = 1_000_000_000_000

  it('is busy while the last turn marker is task_started and recent', () => {
    expect(codexStatusFromTail(marker('task_complete') + marker('task_started'), now - 5000, now)).toBe('busy')
  })

  it('is idle after task_complete or turn_aborted', () => {
    expect(codexStatusFromTail(marker('task_started') + marker('task_complete'), now - 1000, now)).toBe('idle')
    expect(codexStatusFromTail(marker('task_started') + marker('turn_aborted'), now - 1000, now)).toBe('idle')
  })

  it('treats a long-untouched open turn as idle (crashed process)', () => {
    expect(codexStatusFromTail(marker('task_started'), now - 11 * 60_000, now)).toBe('idle')
  })

  it('ignores marker text quoted inside message content', () => {
    expect(codexStatusFromTail(fixture('codex-rollout.jsonl'), now - 1000, now)).toBe('busy')
  })

  it('without a marker falls back to recent file activity', () => {
    expect(codexStatusFromTail('', now - 5000, now)).toBe('busy')
    expect(codexStatusFromTail('', now - 120_000, now)).toBe('idle')
  })
})

describe('matchCodexSessions', () => {
  const session = (sessionId: string, startedAt: number, cwd = 'C:\\Work\\A'): CodexSession => ({
    sessionId,
    cwd,
    startedAt,
    updatedAt: startedAt,
    status: 'idle'
  })

  it('matches by recorded session id first', () => {
    const result = matchCodexSessions(
      [{ id: 't1', cwd: 'C:\\Work\\A', startedAt: 5000, sessionId: 's-old' }],
      [session('s-old', 1), session('s-new', 5100)]
    )
    expect(result.get('t1')?.sessionId).toBe('s-old')
  })

  it('discovers an unrecorded session by folder and start time, case and slash insensitive', () => {
    const result = matchCodexSessions(
      [{ id: 't1', cwd: 'c:/work/a/', startedAt: 10_000 }],
      [session('s1', 10_800), session('other', 10_000, 'C:\\Work\\B')]
    )
    expect(result.get('t1')?.sessionId).toBe('s1')
  })

  it('ignores sessions older than the tab and never gives one session to two tabs', () => {
    const terms = [
      { id: 't1', cwd: 'C:\\Work\\A', startedAt: 10_000 },
      { id: 't2', cwd: 'C:\\Work\\A', startedAt: 20_000 }
    ]
    const result = matchCodexSessions(terms, [session('old', 1000), session('s1', 10_100), session('s2', 20_100)])
    expect(result.get('t1')?.sessionId).toBe('s1')
    expect(result.get('t2')?.sessionId).toBe('s2')
    expect(matchCodexSessions([terms[0]], [session('old', 1000)]).size).toBe(0)
  })

  it('does not hand a tab-pinned session to another tab', () => {
    const result = matchCodexSessions(
      [
        { id: 't1', cwd: 'C:\\Work\\A', startedAt: 10_000, sessionId: 'pinned' },
        { id: 't2', cwd: 'C:\\Work\\A', startedAt: 10_000 }
      ],
      [session('pinned', 10_050)]
    )
    expect(result.get('t1')?.sessionId).toBe('pinned')
    expect(result.has('t2')).toBe(false)
  })
})

describe('readCodexSessions', () => {
  it('reads recent rollouts, names from the index, status from the tail', async () => {
    const home = mkdtempSync(join(tmpdir(), 'cg-codex-'))
    const dir = join(home, 'sessions', '2026', '01', '02')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `rollout-2026-01-02T12-00-03-${ID}.jsonl`)
    writeFileSync(file, fixture('codex-rollout.jsonl'), 'utf8')
    const now = new Date()
    utimesSync(file, now, now)
    writeFileSync(join(home, 'session_index.jsonl'), fixture('codex-session-index.jsonl'), 'utf8')
    const old = join(dir, 'rollout-2025-01-01T00-00-00-019bbbbb-0000-7000-8000-000000000002.jsonl')
    writeFileSync(old, fixture('codex-rollout.jsonl'), 'utf8')
    utimesSync(old, new Date('2025-01-01'), new Date('2025-01-01'))

    const sessions = await readCodexSessions(home)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      sessionId: ID,
      cwd: 'C:\\Work\\Example Project',
      name: 'Renamed by user',
      status: 'busy'
    })
  })

  it('returns nothing when the folder does not exist', async () => {
    expect(await readCodexSessions(join(tmpdir(), 'cg-no-such-codex-home'))).toEqual([])
  })
})
