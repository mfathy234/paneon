import type { IDisposable, ILink, Terminal } from '@xterm/xterm'
import { findFilePaths, type FileMatch, type FileRef } from '../shared/filePaths'

export interface FileLinkHost {
  existing(paths: string[]): Promise<(string | null)[]>
  open(ref: FileRef): void
}

interface Segment {
  match: FileMatch
  text: string
}

const MAX_WRAPPED_ROWS = 40

function logicalLine(term: Terminal, row: number): { first: number; text: string } {
  const buffer = term.buffer.active
  let first = row
  while (first > 0 && buffer.getLine(first)?.isWrapped) first -= 1
  let text = ''
  for (let at = first; at === first || buffer.getLine(at)?.isWrapped; at += 1) {
    text += buffer.getLine(at)?.translateToString(false) ?? ''
    if (at - first > MAX_WRAPPED_ROWS) break
  }
  return { first, text }
}

function toLink(term: Terminal, first: number, segment: Segment, host: FileLinkHost): ILink {
  const cols = term.cols
  const last = segment.match.end - 1
  const ref: FileRef = { path: segment.match.path }
  if (segment.match.line !== undefined) ref.line = segment.match.line
  if (segment.match.col !== undefined) ref.col = segment.match.col
  return {
    range: {
      start: { x: (segment.match.start % cols) + 1, y: first + Math.floor(segment.match.start / cols) + 1 },
      end: { x: (last % cols) + 1, y: first + Math.floor(last / cols) + 1 }
    },
    text: segment.text,
    decorations: { pointerCursor: true, underline: true },
    activate: (event) => {
      if (event.ctrlKey || event.metaKey) host.open(ref)
    }
  }
}

export function registerFileLinks(term: Terminal, host: FileLinkHost): IDisposable {
  return term.registerLinkProvider({
    provideLinks(y, callback) {
      const { first, text } = logicalLine(term, y - 1)
      const segments = findFilePaths(text).map((match) => ({ match, text: text.slice(match.start, match.end) }))
      if (segments.length === 0) return callback(undefined)
      const unique = [...new Set(segments.map((s) => s.match.path))]
      host.existing(unique).then(
        (found) => {
          const known = new Map(unique.map((path, i) => [path, found[i] ?? null]))
          const links = segments
            .filter((s) => known.get(s.match.path))
            .map((s) => toLink(term, first, s, host))
            .filter((link) => link.range.start.y <= y && link.range.end.y >= y)
          callback(links.length > 0 ? links : undefined)
        },
        () => callback(undefined)
      )
    }
  })
}
