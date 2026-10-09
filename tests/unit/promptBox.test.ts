import { describe, expect, it } from 'vitest'
import { extractPrompt } from '../../src/shared/promptBox'

const claudeBox = (...rows: string[]): string[] => [
  '● Done. Anything else?',
  '',
  '╭──────────────────────────────────────────╮',
  ...rows,
  '╰──────────────────────────────────────────╯',
  '  ? for shortcuts'
]

const row = (text: string): string => `│ ${text.padEnd(40)} │`

describe('extractPrompt', () => {
  it('reads a single line from a Claude style box', () => {
    expect(extractPrompt(claudeBox(row('> Add dark mode toggle')))).toBe('Add dark mode toggle')
  })

  it('reads multi-line input from the box', () => {
    const lines = claudeBox(row('> Fix the login form'), row('  then add a test'), row('  and update docs'))
    expect(extractPrompt(lines)).toBe('Fix the login form\nthen add a test\nand update docs')
  })

  it('joins a line that fills the box width', () => {
    const lines = claudeBox(row('> ' + 'a'.repeat(38)), row('  ' + 'b'.repeat(10)))
    expect(extractPrompt(lines)).toBe('a'.repeat(38) + 'b'.repeat(10))
  })

  it('joins a soft wrapped sentence with a space', () => {
    const lines = claudeBox(row('> please rename the helper function in'), row('  billing-api to something clearer'))
    expect(extractPrompt(lines)).toBe('please rename the helper function in billing-api to something clearer')
  })

  it('returns null for an empty box', () => {
    expect(extractPrompt(claudeBox(row('>')))).toBeNull()
  })

  it('reads a Gemini box with the shell and yolo markers', () => {
    expect(extractPrompt(claudeBox(row('! git status')))).toBe('git status')
    expect(extractPrompt(claudeBox(row('*   explain this stack trace')))).toBe('explain this stack trace')
  })

  it('handles wide characters inside the box', () => {
    const wide = '日本語のテスト'
    expect(extractPrompt(claudeBox(`│ > ${wide}${' '.repeat(40 - 2 - wide.length * 2)} │`))).toBe(wide)
  })

  it('does not take a quoted line from the reply above the box', () => {
    const lines = ['> quoted in the answer', 'text', '╭───╮', '│ >   │', '╰───╯']
    expect(extractPrompt(lines)).toBeNull()
  })

  it('reads the ruled composer without side borders', () => {
    const lines = ['● Done', '', '────────────────────────', '> ship the release notes', '────────────────────────', '  ? for shortcuts']
    expect(extractPrompt(lines, 80)).toBe('ship the release notes')
  })

  it('reads a Codex composer with continuation lines', () => {
    const lines = ['• Done', '', '› add retries to the', '  upload client', '', '  100% context left']
    expect(extractPrompt(lines, 80)).toBe('add retries to the\nupload client')
  })

  it('joins a Codex line that reaches the screen edge', () => {
    const lines = ['', '› ' + 'x'.repeat(18), '  tail']
    expect(extractPrompt(lines, 20)).toBe('x'.repeat(18) + 'tail')
  })

  it('returns null when no input area is visible', () => {
    expect(extractPrompt(['C:\\acme-web>dir', 'a.txt'])).toBeNull()
  })
})
