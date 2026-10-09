import { describe, expect, it } from 'vitest'
import { canCompact, contextHintText, contextLevel, contextStep, showContextHint, stepContextNotice } from '../../src/shared/contextWarning'

describe('contextLevel', () => {
  it('turns amber at 80 and red at 90', () => {
    expect(contextLevel(79)).toBe('ok')
    expect(contextLevel(80)).toBe('amber')
    expect(contextLevel(89)).toBe('amber')
    expect(contextLevel(90)).toBe('red')
    expect(contextLevel(100)).toBe('red')
  })
})

describe('contextStep', () => {
  it('reports the highest reached step', () => {
    expect(contextStep(89)).toBeNull()
    expect(contextStep(90)).toBe(90)
    expect(contextStep(94)).toBe(90)
    expect(contextStep(95)).toBe(95)
  })
})

describe('showContextHint', () => {
  it('shows from 90 and nothing without data', () => {
    expect(showContextHint(null, undefined)).toBe(false)
    expect(showContextHint(85, undefined)).toBe(false)
    expect(showContextHint(90, undefined)).toBe(true)
  })

  it('stays hidden after a dismissal until the next step', () => {
    expect(showContextHint(92, 90)).toBe(false)
    expect(showContextHint(94, 90)).toBe(false)
    expect(showContextHint(96, 90)).toBe(true)
    expect(showContextHint(96, 95)).toBe(false)
    expect(showContextHint(100, 95)).toBe(false)
  })
})

describe('contextHintText', () => {
  it('names the rounded percent', () => {
    expect(contextHintText(91.6)).toBe('Context is 92% full — /compact or start a fresh session')
  })
})

describe('canCompact', () => {
  it('is offered for Claude and Codex only', () => {
    expect(canCompact('claude')).toBe(true)
    expect(canCompact('codex')).toBe(true)
    expect(canCompact('gemini')).toBe(false)
    expect(canCompact('shell')).toBe(false)
  })
})

describe('stepContextNotice', () => {
  it('notifies once when crossing 90 and unseen', () => {
    const first = stepContextNotice({ notified: false }, 91, true)
    expect(first.notify).toBe(true)
    expect(stepContextNotice(first.memory, 95, true).notify).toBe(false)
  })

  it('does not notify while seen but still counts the crossing', () => {
    const seen = stepContextNotice({ notified: false }, 91, false)
    expect(seen.notify).toBe(false)
    expect(stepContextNotice(seen.memory, 92, true).notify).toBe(false)
  })

  it('re-arms after the percent falls below 90', () => {
    const armed = stepContextNotice({ notified: true }, 40, true)
    expect(armed.memory.notified).toBe(false)
    expect(stepContextNotice(armed.memory, 91, true).notify).toBe(true)
  })

  it('ignores missing data', () => {
    expect(stepContextNotice({ notified: false }, null, true).notify).toBe(false)
  })
})
