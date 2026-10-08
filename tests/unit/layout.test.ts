import { describe, expect, it } from 'vitest'
import { layoutForCount } from '../../src/shared/layout'

describe('layoutForCount', () => {
  it.each([
    [1, 1, 1],
    [2, 2, 1],
    [3, 2, 2],
    [4, 2, 2],
    [5, 3, 2],
    [6, 3, 2],
    [7, 3, 3],
    [10, 3, 4]
  ])('%i panes -> %i columns x %i rows', (count, cols, rows) => {
    const layout = layoutForCount(count)
    expect(layout.cols).toBe(cols)
    expect(layout.rows).toBe(rows)
    expect(layout.cells).toHaveLength(count)
  })

  it('makes pane 3 span the wide bottom row', () => {
    const { cells } = layoutForCount(3)
    expect(cells[0]).toEqual({ row: 1, col: 1, colSpan: 1 })
    expect(cells[1]).toEqual({ row: 1, col: 2, colSpan: 1 })
    expect(cells[2]).toEqual({ row: 2, col: 1, colSpan: 2 })
  })

  it('leaves a full grid unspanned', () => {
    expect(layoutForCount(4).cells.every((c) => c.colSpan === 1)).toBe(true)
    expect(layoutForCount(6).cells.every((c) => c.colSpan === 1)).toBe(true)
  })

  it('stretches an incomplete last row', () => {
    expect(layoutForCount(5).cells[4]).toEqual({ row: 2, col: 2, colSpan: 2 })
    expect(layoutForCount(7).cells[6]).toEqual({ row: 3, col: 1, colSpan: 3 })
  })

  it('scrolls from seven panes', () => {
    expect(layoutForCount(6).scrolls).toBe(false)
    expect(layoutForCount(7).scrolls).toBe(true)
  })

  it('handles an empty grid', () => {
    expect(layoutForCount(0).cells).toEqual([])
  })
})
