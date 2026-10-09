import { describe, expect, it } from 'vitest'
import {
  discardMessage,
  expandRenames,
  firstLine,
  isStaged,
  isUnstaged,
  parseNumstatZ,
  parseStatusV2,
  statusLetter,
  validateRepoPaths,
  withCounts
} from '../../src/shared/gitStatus'

const H = '1 .M N... 100644 100644 100644 aaaa bbbb'
const ADDED = '1 A. N... 000000 100644 100644 aaaa bbbb'

describe('parseStatusV2', () => {
  it('reads branch headers', () => {
    const text = ['# branch.oid abc', '# branch.head main', '# branch.upstream origin/main', '# branch.ab +2 -1', ''].join('\0')
    const info = parseStatusV2(text)
    expect(info).toMatchObject({ branch: 'main', upstream: 'origin/main', ahead: 2, behind: 1, files: [] })
  })

  it('treats a detached head as no branch', () => {
    expect(parseStatusV2('# branch.head (detached)\0').branch).toBeNull()
  })

  it('reads changed, untracked and spaced paths', () => {
    const text = [`${H} src/app.ts`, `${ADDED} my notes.md`, '? new file.txt', ''].join('\0')
    const files = parseStatusV2(text).files
    expect(files.map((f) => f.path)).toEqual(['src/app.ts', 'my notes.md', 'new file.txt'])
    expect(files[0]).toMatchObject({ index: '.', worktree: 'M', untracked: false })
    expect(files[1]).toMatchObject({ index: 'A', worktree: '.' })
    expect(files[2]).toMatchObject({ untracked: true })
  })

  it('reads renames with the original path', () => {
    const text = ['2 R. N... 100644 100644 100644 aaaa bbbb R100 new name.ts', 'old name.ts', '? other.txt', ''].join('\0')
    const files = parseStatusV2(text).files
    expect(files).toHaveLength(2)
    expect(files[0]).toMatchObject({ path: 'new name.ts', origPath: 'old name.ts', index: 'R' })
    expect(files[1].path).toBe('other.txt')
  })

  it('flags unmerged entries', () => {
    const text = ['u UU N... 100644 100644 100644 100644 aaaa bbbb cccc conflict.ts', ''].join('\0')
    const file = parseStatusV2(text).files[0]
    expect(file).toMatchObject({ path: 'conflict.ts', conflicted: true })
    expect(statusLetter(file)).toBe('!')
  })

  it('returns nothing for empty output', () => {
    expect(parseStatusV2('').files).toEqual([])
  })
})

describe('parseNumstatZ', () => {
  it('reads counts and binary markers', () => {
    const text = ['3\t1\ta.ts', '-\t-\timg.png', ''].join('\0')
    expect(parseNumstatZ(text)).toEqual([
      { path: 'a.ts', added: 3, removed: 1 },
      { path: 'img.png', added: null, removed: null }
    ])
  })

  it('reads renames as the new path', () => {
    const text = ['2\t0\t', 'old.ts', 'new.ts', '1\t1\tb.ts', ''].join('\0')
    expect(parseNumstatZ(text)).toEqual([
      { path: 'new.ts', added: 2, removed: 0 },
      { path: 'b.ts', added: 1, removed: 1 }
    ])
  })

  it('keeps spaces inside a path', () => {
    expect(parseNumstatZ('1\t2\tdir/a b.ts\0')).toEqual([{ path: 'dir/a b.ts', added: 1, removed: 2 }])
  })

  it('merges counts into entries', () => {
    const files = parseStatusV2(`${H} a.ts\0? b.ts\0`).files
    const merged = withCounts(files, [{ path: 'a.ts', added: 4, removed: 2 }])
    expect(merged[0]).toMatchObject({ added: 4, removed: 2 })
    expect(merged[1].added).toBeNull()
  })
})

describe('status helpers', () => {
  it('picks a letter and staged flags', () => {
    const [a, b, c] = parseStatusV2(`${H} a\0${ADDED} b\0? c\0`).files
    expect([statusLetter(a), statusLetter(b), statusLetter(c)]).toEqual(['M', 'A', 'U'])
    expect([isStaged(a), isUnstaged(a)]).toEqual([false, true])
    expect([isStaged(b), isUnstaged(b)]).toEqual([true, false])
    expect([isStaged(c), isUnstaged(c)]).toEqual([false, false])
  })

  it('adds original paths of renamed files', () => {
    const files = parseStatusV2(['2 R. N... 100644 100644 100644 aaaa bbbb R100 n.ts', 'o.ts', ''].join('\0')).files
    expect(expandRenames(files, ['n.ts']).sort()).toEqual(['n.ts', 'o.ts'])
  })

  it('takes the first line of a message', () => {
    expect(firstLine('subject\n\nbody')).toBe('subject')
    expect(firstLine('')).toBe('')
  })
})

describe('validateRepoPaths', () => {
  it('accepts relative paths and normalizes separators', () => {
    expect(validateRepoPaths(['a.ts', 'src\\b.ts', 'a.ts'])).toEqual({ ok: true, paths: ['a.ts', 'src/b.ts'] })
  })

  it.each([['/etc/passwd'], ['C:\\Windows\\x'], ['\\\\server\\share'], ['../x'], ['a/../../x'], ['a\\..\\x'], ['..'], ['a\0b'], ['']])(
    'rejects %j',
    (path) => {
      expect(validateRepoPaths([path]).ok).toBe(false)
    }
  )

  it('rejects empty and non-array input', () => {
    expect(validateRepoPaths([]).ok).toBe(false)
    expect(validateRepoPaths('a')).toMatchObject({ ok: false })
    expect(validateRepoPaths([1])).toMatchObject({ ok: false })
  })

  it('allows dotted names that are not parent escapes', () => {
    expect(validateRepoPaths(['..hidden', 'a/.env', 'a..b']).ok).toBe(true)
  })
})

describe('discardMessage', () => {
  it('names a single file on the button', () => {
    const m = discardMessage(['src/a.ts'], [])
    expect(m.label).toBe('Discard src/a.ts')
    expect(m.body).toContain('src/a.ts')
  })

  it('counts several files and lists untracked ones as deleted', () => {
    const m = discardMessage(['a.ts', 'b.ts'], ['b.ts'])
    expect(m.label).toBe('Discard 2 files')
    expect(m.body).toContain('a.ts')
    expect(m.body).toContain('deleted from disk: b.ts')
  })
})
