import { describe, expect, it } from 'vitest'
import { nextAttentionPane } from '../../src/shared/attention'

describe('nextAttentionPane', () => {
  const order = ['a', 'b', 'c', 'd']

  it('prefers a pane waiting on a prompt over one that is done, starting after the focused pane', () => {
    expect(nextAttentionPane(order, 'b', { a: 'needs', c: 'done', d: 'needs' })).toBe('d')
    expect(nextAttentionPane(order, 'd', { a: 'needs', c: 'done', d: 'needs' })).toBe('a')
    expect(nextAttentionPane(order, 'a', { c: 'done', d: 'none' })).toBe('c')
  })

  it('returns the focused pane only when it is the one needing attention, and null when none do', () => {
    expect(nextAttentionPane(order, 'b', { b: 'needs' })).toBe('b')
    expect(nextAttentionPane(order, 'b', { a: 'none' })).toBeNull()
    expect(nextAttentionPane(order, null, { c: 'done' })).toBe('c')
    expect(nextAttentionPane([], null, {})).toBeNull()
  })
})
