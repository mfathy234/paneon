import { describe, expect, it } from 'vitest'
import { searchCountLabel } from '../../src/shared/terminalSearch'

describe('searchCountLabel', () => {
  it('shows the position of the active match and the total', () => {
    expect(searchCountLabel('error', 2, 12)).toBe('3 of 12')
    expect(searchCountLabel('error', -1, 4)).toBe('4 found')
  })

  it('says when nothing matches, stays empty without a query and caps very large counts', () => {
    expect(searchCountLabel('error', -1, 0)).toBe('No results')
    expect(searchCountLabel('', -1, 0)).toBe('')
    expect(searchCountLabel('e', 4, 1000)).toBe('5 of 999+')
    expect(searchCountLabel('e', -1, 1000)).toBe('999+')
  })
})
