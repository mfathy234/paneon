import { describe, expect, it } from 'vitest'
import {
  HIGHLIGHT_COLORS,
  MAX_HIGHLIGHT_RULES,
  compileRules,
  defaultHighlightRules,
  defaultHighlights,
  describeRules,
  highlightAlpha,
  highlightTint,
  sameRules,
  sanitizeHighlights,
  validateRule
} from '../../src/shared/highlights'
import { contrastRatio, parseHex } from '../../src/shared/contrast'
import { THEMES } from '../../src/shared/themes'
import { migrateSettings } from '../../src/shared/settingsSchema'

const colorOf = (line: string, rules = defaultHighlightRules()) => compileRules(rules).test(line)

describe('compileRules', () => {
  it('matches the default words case-insensitively', () => {
    expect(colorOf('Build ERROR in app')).toBe('red')
    expect(colorOf('2 tests FAILED')).toBe('red')
    expect(colorOf('FAIL src/a.test.ts')).toBe('red')
    expect(colorOf('TypeError: x is undefined')).toBe('red')
    expect(colorOf('Unhandled NullPointerException')).toBe('red')
    expect(colorOf('warning: unused variable')).toBe('amber')
    expect(colorOf('WARN deprecated')).toBe('amber')
    expect(colorOf('12 passed')).toBe('green')
    expect(colorOf('  ✓ adds totals')).toBe('green')
    expect(colorOf('Success!')).toBe('green')
  })

  it('returns nothing for ordinary lines', () => {
    expect(colorOf('compiling src/app.ts')).toBeNull()
    expect(colorOf('')).toBeNull()
    expect(colorOf('   ')).toBeNull()
  })

  it('lets the first rule in the list win', () => {
    expect(colorOf('error: 3 passed, 1 failed')).toBe('red')
    expect(colorOf('1 passed with a warning')).toBe('amber')
  })

  it('treats plain patterns literally', () => {
    expect(colorOf('cost (a+b)', [{ pattern: '(a+b)', color: 'blue' }])).toBe('blue')
    expect(colorOf('cost aab', [{ pattern: '(a+b)', color: 'blue' }])).toBeNull()
  })

  it('supports regex rules and skips broken ones', () => {
    const rules = [
      { pattern: '(', color: 'red' as const, regex: true },
      { pattern: '^\\s*TODO\\b', color: 'purple' as const, regex: true }
    ]
    expect(colorOf('  todo: later', rules)).toBe('purple')
    expect(colorOf('later TODO', rules)).toBeNull()
  })

  it('only scans the start of very long lines', () => {
    expect(colorOf(`${'x'.repeat(5000)} error`)).toBeNull()
  })
})

describe('validateRule', () => {
  it('rejects empty, oversized, invalid and match-everything rules', () => {
    expect(validateRule('  ', false)).not.toBeNull()
    expect(validateRule('x'.repeat(200), false)).not.toBeNull()
    expect(validateRule('(', true)).not.toBeNull()
    expect(validateRule('a*', true)).not.toBeNull()
    expect(validateRule('(', false)).toBeNull()
    expect(validateRule('^ERR', true)).toBeNull()
  })
})

describe('sanitizeHighlights', () => {
  it('gives old settings the defaults', () => {
    expect(sanitizeHighlights(undefined)).toEqual(defaultHighlights())
    expect(migrateSettings({}).highlights).toEqual(defaultHighlights())
    expect(sanitizeHighlights({ enabled: false }).rules).toEqual(defaultHighlightRules())
    expect(sanitizeHighlights({ enabled: false }).enabled).toBe(false)
  })

  it('keeps valid rules and drops invalid colors, regexes and junk', () => {
    const result = sanitizeHighlights({
      enabled: true,
      rules: [
        { pattern: ' boom ', color: 'purple' },
        { pattern: '(', color: 'red', regex: true },
        { pattern: 'x', color: 'pink' },
        { pattern: '', color: 'red' },
        { color: 'red' },
        'text',
        null,
        { pattern: '^E\\d+', color: 'blue', regex: true }
      ]
    })
    expect(result.rules).toEqual([
      { pattern: 'boom', color: 'purple' },
      { pattern: '^E\\d+', color: 'blue', regex: true }
    ])
  })

  it('removes duplicates and caps the list at 30 rules', () => {
    const duplicated = [
      { pattern: 'Boom', color: 'red' },
      { pattern: 'boom', color: 'blue' }
    ]
    expect(sanitizeHighlights({ rules: duplicated }).rules).toHaveLength(1)
    const many = Array.from({ length: 50 }, (_, i) => ({ pattern: `word${i}`, color: 'red' }))
    expect(sanitizeHighlights({ rules: many }).rules).toHaveLength(MAX_HIGHLIGHT_RULES)
  })

  it('keeps an emptied list empty', () => {
    expect(sanitizeHighlights({ enabled: true, rules: [] }).rules).toEqual([])
  })

  it('survives a round trip through the settings migration', () => {
    const settings = migrateSettings({ highlights: { enabled: false, rules: [{ pattern: 'boom', color: 'blue' }] } })
    expect(migrateSettings(JSON.parse(JSON.stringify(settings))).highlights).toEqual({
      enabled: false,
      rules: [{ pattern: 'boom', color: 'blue' }]
    })
  })
})

describe('helpers', () => {
  it('compares rule lists and names them for a confirmation', () => {
    expect(sameRules(defaultHighlightRules(), defaultHighlightRules())).toBe(true)
    expect(sameRules(defaultHighlightRules(), defaultHighlightRules().slice(1))).toBe(false)
    expect(describeRules([{ pattern: 'a', color: 'red' }, { pattern: 'b', color: 'red' }])).toBe('a, b')
    expect(describeRules(defaultHighlightRules(), 3)).toBe('error, failed, FAIL and 6 more')
  })
})

describe('tints on every theme', () => {
  const blend = (tint: string, background: string, alpha: number): string => {
    const [tr, tg, tb] = parseHex(tint)
    const [br, bg, bb] = parseHex(background)
    const mix = (t: number, b: number): string => Math.round(t * alpha + b * (1 - alpha)).toString(16).padStart(2, '0')
    return `#${mix(tr, br)}${mix(tg, bg)}${mix(tb, bb)}`
  }

  it('keeps the terminal text readable over a highlighted line', () => {
    for (const theme of THEMES) {
      const alpha = highlightAlpha(theme.kind)
      const base = contrastRatio(theme.term.foreground, theme.term.background)
      for (const color of HIGHLIGHT_COLORS) {
        const background = blend(highlightTint(color), theme.term.background, alpha)
        expect(contrastRatio(theme.term.foreground, background), `${theme.id} ${color}`).toBeGreaterThanOrEqual(Math.min(4.5, base * 0.9))
      }
    }
  })
})
