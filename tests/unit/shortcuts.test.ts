import { describe, expect, it } from 'vitest'
import { bind, formatShortcut, matchesBinding, parseShortcut } from '../../src/shared/shortcuts'

const event = (key: string, mods: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }> = {}) => ({
  key,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods
})

describe('parseShortcut', () => {
  it('reads modifiers and keys case-insensitively', () => {
    expect(parseShortcut('Ctrl+K')).toEqual({ key: 'k', ctrl: true, shift: false, alt: false })
    expect(parseShortcut('control+shift+p')).toEqual({ key: 'p', ctrl: true, shift: true, alt: false })
    expect(parseShortcut('Alt+3')).toEqual({ key: '3', ctrl: false, shift: false, alt: true })
    expect(parseShortcut('Ctrl+Alt+ArrowLeft')?.key).toBe('ArrowLeft')
    expect(parseShortcut('ctrl+f5')?.key).toBe('F5')
    expect(parseShortcut('Ctrl+Shift+Alt+Home')?.key).toBe('Home')
    expect(parseShortcut('ctrl+shift+alt+end')?.key).toBe('End')
  })

  it('rejects shortcuts without ctrl or alt, unknown modifiers and unknown keys', () => {
    expect(parseShortcut('K')).toBeNull()
    expect(parseShortcut('Shift+K')).toBeNull()
    expect(parseShortcut('Meta+K')).toBeNull()
    expect(parseShortcut('Ctrl+Banana')).toBeNull()
    expect(parseShortcut('Ctrl+')).toBeNull()
    expect(parseShortcut('')).toBeNull()
  })
})

describe('formatShortcut', () => {
  it('prints modifiers in a fixed order', () => {
    expect(formatShortcut(bind('shift+ctrl+r'))).toBe('Ctrl+Shift+R')
    expect(formatShortcut(bind('alt+1'))).toBe('Alt+1')
    expect(formatShortcut(bind('Ctrl+Enter'))).toBe('Ctrl+Enter')
  })
})

describe('matchesBinding', () => {
  it('requires the exact modifier set', () => {
    const ctrlK = bind('Ctrl+K')
    expect(matchesBinding(event('k', { ctrlKey: true }), ctrlK)).toBe(true)
    expect(matchesBinding(event('K', { ctrlKey: true }), ctrlK)).toBe(true)
    expect(matchesBinding(event('k', { ctrlKey: true, shiftKey: true }), ctrlK)).toBe(false)
    expect(matchesBinding(event('k'), ctrlK)).toBe(false)
    expect(matchesBinding(event('k', { ctrlKey: true, metaKey: true }), ctrlK)).toBe(false)
  })

  it('compares named keys exactly', () => {
    expect(matchesBinding(event('Enter', { ctrlKey: true }), bind('Ctrl+Enter'))).toBe(true)
    expect(matchesBinding(event('ArrowLeft', { ctrlKey: true, altKey: true }), bind('Ctrl+Alt+ArrowLeft'))).toBe(true)
    expect(matchesBinding(event('ArrowRight', { ctrlKey: true, altKey: true }), bind('Ctrl+Alt+ArrowLeft'))).toBe(false)
  })
})
