import { describe, expect, it } from 'vitest'
import { shouldRelaunchPlain, type ResumeExit } from '../../src/shared/resumeFallback'

const base: ResumeExit = {
  agent: 'claude',
  resumed: true,
  alreadyRetried: false,
  runtimeMs: 800,
  exitCode: 1,
  output: 'No conversation found to continue'
}

describe('shouldRelaunchPlain', () => {
  it('relaunches a resumed claude tab that exits quickly with the no-conversation message', () => {
    expect(shouldRelaunchPlain({ ...base, exitCode: 0 })).toBe(true)
  })

  it('relaunches on a quick non-zero exit even without the message', () => {
    expect(shouldRelaunchPlain({ ...base, output: '' })).toBe(true)
  })

  it('matches the message case-insensitively', () => {
    expect(shouldRelaunchPlain({ ...base, exitCode: 0, output: 'NO CONVERSATION FOUND' })).toBe(true)
  })

  it('does not relaunch a quick clean exit without the message', () => {
    expect(shouldRelaunchPlain({ ...base, exitCode: 0, output: 'bye' })).toBe(false)
  })

  it('does not relaunch after the window', () => {
    expect(shouldRelaunchPlain({ ...base, runtimeMs: 5001 })).toBe(false)
    expect(shouldRelaunchPlain({ ...base, runtimeMs: 5000 })).toBe(true)
  })

  it('does not relaunch a fresh start, a shell, or a second time', () => {
    expect(shouldRelaunchPlain({ ...base, resumed: false })).toBe(false)
    expect(shouldRelaunchPlain({ ...base, agent: 'shell' })).toBe(false)
    expect(shouldRelaunchPlain({ ...base, alreadyRetried: true })).toBe(false)
  })

  it('relaunches a resumed codex tab on its no-session message or a quick failure', () => {
    const codex: ResumeExit = {
      ...base,
      agent: 'codex',
      exitCode: 0,
      output: 'Error: No saved session found with ID 019a'
    }
    expect(shouldRelaunchPlain(codex)).toBe(true)
    expect(shouldRelaunchPlain({ ...codex, output: 'Session not found: x' })).toBe(true)
    expect(shouldRelaunchPlain({ ...codex, exitCode: 1, output: '' })).toBe(true)
    expect(shouldRelaunchPlain({ ...codex, output: 'bye' })).toBe(false)
    expect(shouldRelaunchPlain({ ...codex, runtimeMs: 9000 })).toBe(false)
  })

  it('relaunches a resumed gemini tab on its no-session messages', () => {
    const gemini: ResumeExit = {
      ...base,
      agent: 'gemini',
      exitCode: 0,
      output: 'No previous sessions found for this project.'
    }
    expect(shouldRelaunchPlain(gemini)).toBe(true)
    expect(shouldRelaunchPlain({ ...gemini, output: 'Invalid session identifier "u-1".' })).toBe(true)
    expect(shouldRelaunchPlain({ ...gemini, output: 'Error resuming session: x' })).toBe(true)
    expect(shouldRelaunchPlain({ ...gemini, exitCode: 1, output: '' })).toBe(true)
    expect(shouldRelaunchPlain({ ...gemini, output: 'bye' })).toBe(false)
    expect(shouldRelaunchPlain({ ...gemini, runtimeMs: 9000 })).toBe(false)
    expect(shouldRelaunchPlain({ ...base, exitCode: 0, output: 'No previous sessions found' })).toBe(false)
  })

  it('does not apply the claude message to codex or the codex message to claude', () => {
    expect(shouldRelaunchPlain({ ...base, agent: 'codex', exitCode: 0 })).toBe(false)
    expect(shouldRelaunchPlain({ ...base, exitCode: 0, output: 'No saved session found with ID x' })).toBe(false)
  })
})
