import { describe, expect, it } from 'vitest'
import { findFilePaths, gotoTarget, isSafeToOpen } from '../../src/shared/filePaths'

const paths = (text: string) => findFilePaths(text).map((m) => m.path)
const only = (text: string) => {
  const found = findFilePaths(text)
  expect(found).toHaveLength(1)
  return found[0]
}

describe('findFilePaths', () => {
  it('reads a posix path with line and column', () => {
    const m = only('error in src/invoices/totals.ts:42:7 today')
    expect(m).toMatchObject({ path: 'src/invoices/totals.ts', line: 42, col: 7 })
    expect('error in src/invoices/totals.ts:42:7 today'.slice(m.start, m.end)).toBe('src/invoices/totals.ts:42:7')
  })

  it('reads a path with only a line', () => {
    expect(only('src/app.ts:10')).toMatchObject({ path: 'src/app.ts', line: 10 })
    expect(only('src/app.ts:10').col).toBeUndefined()
  })

  it('reads windows separators', () => {
    expect(only(String.raw`src\app\main.ts:10:5`)).toMatchObject({ path: String.raw`src\app\main.ts`, line: 10, col: 5 })
  })

  it('reads dot-relative paths without a position', () => {
    const m = only('see ./README.md for more')
    expect(m.path).toBe('./README.md')
    expect(m.line).toBeUndefined()
    expect(paths('../docs/guide.md')).toEqual(['../docs/guide.md'])
  })

  it('reads a windows absolute path with a position', () => {
    const text = String.raw`at C:\work\acme-web\package.json:3`
    expect(only(text)).toMatchObject({ path: String.raw`C:\work\acme-web\package.json`, line: 3 })
    expect(paths('D:/repo/x.ts:1:2')).toEqual(['D:/repo/x.ts'])
  })

  it('reads the parenthesised line and column form', () => {
    const m = only('tests/a.test.ts(12,4): error TS2322')
    expect(m).toMatchObject({ path: 'tests/a.test.ts', line: 12, col: 4 })
    expect('tests/a.test.ts(12,4): error'.slice(m.start, m.end)).toBe('tests/a.test.ts(12,4)')
    expect(only('tests/a.test.ts(12)')).toMatchObject({ line: 12 })
  })

  it('strips trailing punctuation and wrapping characters', () => {
    expect(paths('Edited src/a.ts.')).toEqual(['src/a.ts'])
    expect(paths('(see src/a.ts)')).toEqual(['src/a.ts'])
    expect(paths('"src/a.ts",')).toEqual(['src/a.ts'])
    expect(paths("'src/a.ts':")).toEqual(['src/a.ts'])
    expect(paths('failed: src/a.ts:12:')).toEqual(['src/a.ts'])
    expect(only('src/a.ts:12:').end).toBe('src/a.ts:12'.length)
  })

  it('accepts a bare file name with an extension', () => {
    expect(paths('totals.ts:42:5 failed')).toEqual(['totals.ts'])
    expect(paths('open package.json now')).toEqual(['package.json'])
  })

  it('ignores urls', () => {
    expect(paths('see https://example.com/docs/index.html:80 here')).toEqual([])
    expect(paths('file:///C:/work/a.ts and src/b.ts')).toEqual(['src/b.ts'])
  })

  it('ignores plain words, versions, options and bare separators', () => {
    expect(paths('v1.2.3 and 4.5 and hello world')).toEqual([])
    expect(paths('run --flag/other --x')).toEqual([])
    expect(paths('// comment ./ ../ / \\')).toEqual([])
    expect(paths('\\\\server\\share\\file.txt')).toEqual([])
  })

  it('finds several paths on one line with their offsets', () => {
    const text = 'a.ts:1 and src/b.ts:2:3'
    const found = findFilePaths(text)
    expect(found.map((m) => text.slice(m.start, m.end))).toEqual(['a.ts:1', 'src/b.ts:2:3'])
  })

  it('drops zero positions', () => {
    expect(only('src/a.ts:0')).toMatchObject({ path: 'src/a.ts' })
    expect(only('src/a.ts:0').line).toBeUndefined()
  })

  it('keeps long paths out', () => {
    expect(paths(`${'a/'.repeat(300)}x.ts`)).toEqual([])
  })
})

describe('gotoTarget', () => {
  it('joins the position for the editor', () => {
    expect(gotoTarget('C:\\p\\a.ts', { path: 'a.ts' })).toBe('C:\\p\\a.ts')
    expect(gotoTarget('C:\\p\\a.ts', { path: 'a.ts', line: 4 })).toBe('C:\\p\\a.ts:4')
    expect(gotoTarget('C:\\p\\a.ts', { path: 'a.ts', line: 4, col: 2 })).toBe('C:\\p\\a.ts:4:2')
  })
})

describe('isSafeToOpen', () => {
  it('opens only known document and source types with the default app', () => {
    for (const name of ['README.md', 'C:\work\acme-web\src\app.ts', 'logo.png', 'notes.txt', 'report.pdf']) {
      expect(isSafeToOpen(name)).toBe(true)
    }
  })

  it('never opens programs or scripts, including names with a trailing dot or space', () => {
    for (const name of ['bin\evil.exe', 'bin\evil.exe.', 'run.bat ', 'tool.py', 'setup.js', 'Makefile', '.env.exe', 'x.ps1']) {
      expect(isSafeToOpen(name)).toBe(false)
    }
  })
})
