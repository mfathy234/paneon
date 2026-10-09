import { displayWidth } from './terminalText'

const RULE = /^\s*[─━═]{4,}\s*$/
const BORDER_LEFT = /^\s*[│┃]/
const BORDER_RIGHT = /[│┃]\s*$/
const MARKER = /^(?:[>❯›]|[!*]|▌)(?:\s+|$)/
const BARE_MARKER = /^[›▌]/

interface Row {
  text: string
  room: number
}

function joiner(previous: Row, next: string): string {
  if (previous.room <= 0) return ''
  const firstWord = next.split(/\s/)[0] ?? ''
  if (firstWord !== '' && displayWidth(firstWord) + 1 > previous.room) return ' '
  return '\n'
}

function assemble(rows: Row[]): string | null {
  let result = ''
  rows.forEach((row, index) => {
    result += index === 0 ? row.text : joiner(rows[index - 1], row.text) + row.text
  })
  const text = result.replace(/\s+$/, '')
  return text === '' ? null : text
}

function boxRow(line: string, first: boolean): Row {
  const inner = line.replace(BORDER_LEFT, '').replace(BORDER_RIGHT, '')
  const padding = inner.length - inner.replace(/ +$/, '').length
  let text = inner.replace(/ +$/, '').replace(/^ /, '')
  text = first ? text.replace(MARKER, '') : text.replace(/^ {1,2}/, '')
  return { text, room: padding - 1 }
}

function findBox(lines: string[]): string | null {
  let index = lines.length - 1
  while (index >= 0) {
    if (!BORDER_LEFT.test(lines[index]) || !BORDER_RIGHT.test(lines[index])) {
      index -= 1
      continue
    }
    let start = index
    while (start > 0 && BORDER_LEFT.test(lines[start - 1]) && BORDER_RIGHT.test(lines[start - 1])) start -= 1
    const head = lines[start].replace(BORDER_LEFT, '').replace(BORDER_RIGHT, '').trim()
    if (MARKER.test(head)) return assemble(lines.slice(start, index + 1).map((line, i) => boxRow(line, i === 0)))
    index = start - 1
  }
  return null
}

function findOpenComposer(lines: string[], cols: number | undefined): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    const text = line.replace(/\s+$/, '')
    const ruled = index > 0 && RULE.test(lines[index - 1])
    if (!MARKER.test(text) || !(ruled || BARE_MARKER.test(text))) continue
    const rows: Row[] = []
    for (let next = index; next < lines.length; next += 1) {
      const raw = lines[next].replace(/\s+$/, '')
      if (next > index && (raw === '' || RULE.test(raw) || !raw.startsWith('  '))) break
      const room = cols === undefined ? Number.MAX_SAFE_INTEGER : cols - displayWidth(raw)
      rows.push({ text: next === index ? raw.replace(MARKER, '') : raw.replace(/^ {1,2}/, ''), room })
    }
    return assemble(rows)
  }
  return null
}

export function extractPrompt(lines: string[], cols?: number): string | null {
  return findBox(lines) ?? findOpenComposer(lines, cols)
}
