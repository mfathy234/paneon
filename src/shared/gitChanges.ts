import type { GitChanges } from './types'

const FILES = /(\d+) files? changed/
const ADDED = /(\d+) insertions?\(\+\)/
const REMOVED = /(\d+) deletions?\(-\)/

export function parseShortstat(text: string): GitChanges {
  const count = (pattern: RegExp): number => Number(pattern.exec(text)?.[1] ?? 0)
  return { files: count(FILES), added: count(ADDED), removed: count(REMOVED) }
}

export function formatChanges(changes: GitChanges): string {
  if (changes.files === 0) return 'no changes'
  const files = `${changes.files} file${changes.files === 1 ? '' : 's'}`
  return `+${changes.added} −${changes.removed} · ${files}`
}
