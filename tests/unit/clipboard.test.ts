import { describe, expect, it } from 'vitest'
import { imagePasteText, pasteText } from '../../src/shared/clipboard'

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
