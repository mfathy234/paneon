import { describe, expect, it } from 'vitest'
import {
  SHARED_END,
  SHARED_START,
  applySharedBlock,
  detectEol,
  findSharedBlock,
  formatSize,
  isInstructionName,
  readSharedBlock,
  toLf,
  withEol
} from '../../src/shared/instructions'

const block = (body: string, eol = '\n') => [SHARED_START, body, SHARED_END].join(eol)

describe('instruction file names', () => {
  it('accepts only the three agent files', () => {
    expect(isInstructionName('CLAUDE.md')).toBe(true)
    expect(isInstructionName('AGENTS.md')).toBe(true)
    expect(isInstructionName('GEMINI.md')).toBe(true)
    expect(isInstructionName('claude.md')).toBe(false)
    expect(isInstructionName('..\\CLAUDE.md')).toBe(false)
    expect(isInstructionName('sub/CLAUDE.md')).toBe(false)
    expect(isInstructionName(undefined)).toBe(false)
  })
})

describe('line endings', () => {
  it('defaults to LF', () => {
    expect(detectEol('')).toBe('\n')
    expect(detectEol('one line')).toBe('\n')
    expect(detectEol('a\nb\n')).toBe('\n')
  })

  it('detects CRLF and picks the dominant style when mixed', () => {
    expect(detectEol('a\r\nb\r\n')).toBe('\r\n')
    expect(detectEol('a\r\nb\r\nc\n')).toBe('\r\n')
    expect(detectEol('a\r\nb\nc\nd\n')).toBe('\n')
  })

  it('converts between endings without doubling', () => {
    expect(toLf('a\r\nb\rc\n')).toBe('a\nb\nc\n')
    expect(withEol('a\nb\r\nc', '\r\n')).toBe('a\r\nb\r\nc')
    expect(withEol('a\r\nb', '\n')).toBe('a\nb')
  })
})

describe('findSharedBlock / readSharedBlock', () => {
  it('reports a missing block', () => {
    expect(findSharedBlock('# Title\n')).toEqual({ status: 'missing' })
    expect(readSharedBlock('# Title\n')).toBeNull()
  })

  it('reads the content between the markers', () => {
    expect(readSharedBlock(`# T\n\n${block('Use tabs.\nRun tests.')}\n\nmore`)).toBe('Use tabs.\nRun tests.')
  })

  it('reads a CRLF block as LF text', () => {
    expect(readSharedBlock(`# T\r\n${block('a\r\nb', '\r\n')}\r\n`)).toBe('a\nb')
  })

  it('reads an empty block', () => {
    expect(readSharedBlock(block(''))).toBe('')
  })

  it('flags duplicated markers', () => {
    const text = `${block('a')}\n${block('b')}`
    expect(findSharedBlock(text)).toMatchObject({ status: 'invalid' })
  })

  it('flags a start without an end, an end without a start and reversed markers', () => {
    expect(findSharedBlock(`${SHARED_START}\nx`)).toMatchObject({ status: 'invalid' })
    expect(findSharedBlock(`x\n${SHARED_END}`)).toMatchObject({ status: 'invalid' })
    expect(findSharedBlock(`${SHARED_END}\nx\n${SHARED_START}`)).toMatchObject({ status: 'invalid' })
  })
})

describe('applySharedBlock', () => {
  it('appends after a blank line when the markers are missing', () => {
    const result = applySharedBlock('# Rules\nBe brief.\n', 'Use tabs.')
    expect(result).toEqual({ ok: true, changed: true, text: `# Rules\nBe brief.\n\n${block('Use tabs.')}\n` })
  })

  it('adds the missing newline before the blank line', () => {
    const result = applySharedBlock('# Rules', 'Use tabs.')
    expect(result).toEqual({ ok: true, changed: true, text: `# Rules\n\n${block('Use tabs.')}\n` })
  })

  it('does not add a second blank line when one is already there', () => {
    const result = applySharedBlock('# Rules\n\n', 'x')
    expect(result).toEqual({ ok: true, changed: true, text: `# Rules\n\n${block('x')}\n` })
  })

  it('writes only the block into an empty file', () => {
    expect(applySharedBlock('', 'x')).toEqual({ ok: true, changed: true, text: `${block('x')}\n` })
    expect(applySharedBlock('  \n', 'x')).toEqual({ ok: true, changed: true, text: `${block('x')}\n` })
  })

  it('keeps CRLF when appending to a CRLF file', () => {
    const result = applySharedBlock('# Rules\r\nBe brief.\r\n', 'a\nb')
    expect(result).toEqual({ ok: true, changed: true, text: `# Rules\r\nBe brief.\r\n\r\n${block('a\r\nb', '\r\n')}\r\n` })
  })

  it('replaces the block and leaves every other byte alone', () => {
    const before = `# Top\r\nintro\r\n\r\n${block('old', '\r\n')}\r\n\r\n## Tail\r\nkeep me`
    const result = applySharedBlock(before, 'new one\nsecond')
    expect(result).toEqual({
      ok: true,
      changed: true,
      text: `# Top\r\nintro\r\n\r\n${block('new one\r\nsecond', '\r\n')}\r\n\r\n## Tail\r\nkeep me`
    })
  })

  it('is idempotent and reports no change when the block is the same', () => {
    const once = applySharedBlock('# T\n', 'same')
    if (!once.ok) throw new Error('unexpected')
    const twice = applySharedBlock(once.text, 'same')
    expect(twice).toEqual({ ok: true, changed: false, text: once.text })
    expect(twice.ok && twice.text.split(SHARED_START)).toHaveLength(2)
  })

  it('trims surrounding blank lines of the shared text', () => {
    const result = applySharedBlock('', '\n\nx\n\n')
    expect(result).toEqual({ ok: true, changed: true, text: `${block('x')}\n` })
  })

  it('refuses a file with duplicated markers', () => {
    const result = applySharedBlock(`${block('a')}\n${block('b')}`, 'x')
    expect(result.ok).toBe(false)
  })

  it('refuses a file with a lone marker', () => {
    expect(applySharedBlock(`text\n${SHARED_START}\nx`, 'y').ok).toBe(false)
  })

  it('round-trips through readSharedBlock', () => {
    const result = applySharedBlock('# T\n', 'line one\nline two')
    if (!result.ok) throw new Error('unexpected')
    expect(readSharedBlock(result.text)).toBe('line one\nline two')
  })
})

describe('formatSize', () => {
  it('formats bytes and kilobytes', () => {
    expect(formatSize(12)).toBe('12 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(20 * 1024)).toBe('20 KB')
  })
})
