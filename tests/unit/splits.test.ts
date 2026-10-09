import { describe, expect, it } from 'vitest'
import {
  MIN_PANE_WIDTH,
  applyDelta,
  equalSizes,
  isEqualSizes,
  normalizeSizes,
  resolveSplit,
  sanitizeSplits,
  shapeKey,
  withSplit
} from '../../src/shared/splits'
import { moveById, moveItem } from '../../src/shared/reorder'

describe('split math', () => {
  it('builds equal sizes and shape keys', () => {
    expect(equalSizes(4)).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(shapeKey(3, 2)).toBe('3x2')
  })

  it('normalizes valid sizes and falls back to equal for bad ones', () => {
    expect(normalizeSizes([1, 3], 2)).toEqual([0.25, 0.75])
    expect(normalizeSizes([1, 3], 3)).toEqual(equalSizes(3))
    expect(normalizeSizes([1, -1], 2)).toEqual([0.5, 0.5])
    expect(normalizeSizes([1, Number.NaN], 2)).toEqual([0.5, 0.5])
    expect(normalizeSizes('x', 2)).toEqual([0.5, 0.5])
  })

  it('moves a boundary by a pixel delta and keeps the total', () => {
    const next = applyDelta([0.5, 0.5], 0, 100, 1000, 100)
    expect(next[0]).toBeCloseTo(0.6)
    expect(next[0] + next[1]).toBeCloseTo(1)
  })

  it('only touches the two tracks beside the boundary', () => {
    const next = applyDelta([0.25, 0.25, 0.5], 1, 50, 1000, 100)
    expect(next[0]).toBe(0.25)
    expect(next[1]).toBeCloseTo(0.3)
    expect(next[2]).toBeCloseTo(0.45)
  })

  it('stops at the minimum size on both sides', () => {
    const right = applyDelta([0.5, 0.5], 0, 10_000, 1000, MIN_PANE_WIDTH)
    expect(right[1]).toBeCloseTo(MIN_PANE_WIDTH / 1000)
    const left = applyDelta([0.5, 0.5], 0, -10_000, 1000, MIN_PANE_WIDTH)
    expect(left[0]).toBeCloseTo(MIN_PANE_WIDTH / 1000)
  })

  it('keeps tracks equal when the minimum cannot fit', () => {
    const next = applyDelta([0.5, 0.5], 0, 300, 400, 260)
    expect(next[0]).toBeCloseTo(0.5)
  })

  it('ignores invalid boundaries and totals', () => {
    expect(applyDelta([0.5, 0.5], 1, 10, 1000, 100)).toEqual([0.5, 0.5])
    expect(applyDelta([0.5, 0.5], 0, 10, 0, 100)).toEqual([0.5, 0.5])
    expect(applyDelta([0.5, 0.5], 0, Number.NaN, 1000, 100)).toEqual([0.5, 0.5])
  })

  it('resolves a stored split or equal sizes', () => {
    expect(resolveSplit(undefined, 2, 2)).toEqual({ cols: [0.5, 0.5], rows: [0.5, 0.5] })
    expect(resolveSplit({ '2x2': { cols: [0.3, 0.7], rows: [0.5, 0.5] } }, 2, 2).cols).toEqual([0.3, 0.7])
    expect(resolveSplit({ '2x2': { cols: [0.3, 0.7, 0.1], rows: [0.5, 0.5] } }, 2, 2).cols).toEqual([0.5, 0.5])
  })

  it('stores a split per shape and drops it again when both axes are equal', () => {
    const stored = withSplit({}, 2, 2, 'cols', [0.3, 0.7])
    expect(stored['2x2']).toEqual({ cols: [0.3, 0.7], rows: [0.5, 0.5] })
    const other = withSplit(stored, 3, 2, 'rows', [0.4, 0.6])
    expect(Object.keys(other).sort()).toEqual(['2x2', '3x2'])
    const reset = withSplit(other, 2, 2, 'cols', equalSizes(2))
    expect(Object.keys(reset)).toEqual(['3x2'])
    expect(isEqualSizes([0.5, 0.5])).toBe(true)
  })
})

describe('sanitizeSplits', () => {
  it('keeps valid entries and normalizes them', () => {
    expect(sanitizeSplits({ '2x1': { cols: [1, 3], rows: [1] } })).toEqual({ '2x1': { cols: [0.25, 0.75], rows: [1] } })
  })

  it('drops bad keys, wrong lengths and equal entries', () => {
    expect(sanitizeSplits({ nope: { cols: [1], rows: [1] } })).toBeUndefined()
    expect(sanitizeSplits({ '2x2': { cols: [0.5, 0.5], rows: [0.5, 0.5] } })).toBeUndefined()
    expect(sanitizeSplits({ '2x2': { cols: [0.2, 0.8, 0.1], rows: [0.3, 0.7] } })).toEqual({
      '2x2': { cols: [0.5, 0.5], rows: [0.3, 0.7] }
    })
    expect(sanitizeSplits({ '2x2': 5 })).toBeUndefined()
  })

  it('rejects non-objects', () => {
    expect(sanitizeSplits(null)).toBeUndefined()
    expect(sanitizeSplits([])).toBeUndefined()
    expect(sanitizeSplits('x')).toBeUndefined()
  })
})

describe('reorder', () => {
  it('moves an item to a position and clamps', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same list when nothing moves', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 1, 1)).toBe(list)
    expect(moveItem(list, 5, 0)).toBe(list)
  })

  it('moves by id and keeps unknown ids untouched', () => {
    const tabs = [{ id: 't1' }, { id: 't2' }, { id: 't3' }]
    expect(moveById(tabs, 't3', 0).map((t) => t.id)).toEqual(['t3', 't1', 't2'])
    expect(moveById(tabs, 'zz', 0)).toBe(tabs)
  })
})
