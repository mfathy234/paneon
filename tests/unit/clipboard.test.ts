import { describe, expect, it } from 'vitest'
import { DROP_FILE_LIMIT, dropPasteText, imagePasteText, pasteText, pathsFromUriList } from '../../src/shared/clipboard'

describe('pasteText', () => {
  it('pastes text as is and nothing for an empty clipboard', () => {
    expect(pasteText({ kind: 'text', text: 'hello' }, 'claude')).toBe('hello')
    expect(pasteText({ kind: 'empty' }, 'claude')).toBe('')
  })

  it('pastes an image as its file path, as an @ reference for Gemini, quoted when it has spaces', () => {
    expect(imagePasteText('claude', 'C:\Temp\paneon-paste\paste-1.png')).toBe('C:\Temp\paneon-paste\paste-1.png ')
    expect(imagePasteText('codex', 'C:\Temp\p.png')).toBe('C:\Temp\p.png ')
    expect(imagePasteText('gemini', 'C:\Temp\p.png')).toBe('@C:\Temp\p.png ')
    expect(imagePasteText('shell', 'C:\My Temp\p.png')).toBe('"C:\My Temp\p.png" ')
    expect(pasteText({ kind: 'image', path: 'C:\My Temp\p.png' }, 'gemini')).toBe('@"C:\My Temp\p.png" ')
  })
})

describe('dropPasteText', () => {
  it('types dropped paths space separated, quoting those with spaces', () => {
    expect(dropPasteText('claude', ['C:\\a\\one.txt', 'C:\\my docs\\two.txt'])).toBe('C:\\a\\one.txt "C:\\my docs\\two.txt" ')
  })

  it('uses @ references for Gemini', () => {
    expect(dropPasteText('gemini', ['C:\\a\\one.txt', 'C:\\my docs'])).toBe('@C:\\a\\one.txt @"C:\\my docs" ')
  })

  it('skips empty paths and caps the drop at 20 files', () => {
    expect(dropPasteText('shell', ['', 'x'])).toBe('x ')
    const many = Array.from({ length: 25 }, (_, i) => `f${i}`)
    expect(dropPasteText('shell', many).trim().split(' ')).toHaveLength(DROP_FILE_LIMIT)
    expect(dropPasteText('shell', [])).toBe('')
  })
})

describe('pathsFromUriList', () => {
  it('reads file URIs and ignores comments and other schemes', () => {
    const list = '# comment\r\nfile:///C:/acme%20web/a.txt\r\nhttps://example.com\r\nfile:///home/me/b.txt\n'
    expect(pathsFromUriList(list)).toEqual(['C:\\acme web\\a.txt', '/home/me/b.txt'])
  })
})
