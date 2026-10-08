import { execFile } from 'node:child_process'
import { parseShortstat } from '../shared/gitChanges'
import type { GitChanges } from '../shared/types'

const CHANGES_TTL_MS = 5000

function run(args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: 3000, windowsHide: true }, (error, stdout) => {
      resolve(error ? null : stdout.trim() || null)
    })
  })
}

export async function currentBranch(folder: string): Promise<string | null> {
  const branch = await run(['rev-parse', '--abbrev-ref', 'HEAD'], folder)
  if (branch) return branch
  return run(['symbolic-ref', '--short', 'HEAD'], folder)
}

const changesCache = new Map<string, { at: number; value: GitChanges | null }>()

export async function gitChanges(folder: string): Promise<GitChanges | null> {
  const cached = changesCache.get(folder)
  if (cached && Date.now() - cached.at < CHANGES_TTL_MS) return cached.value
  const inside = await run(['rev-parse', '--is-inside-work-tree'], folder)
  let value: GitChanges | null = null
  if (inside === 'true') {
    const stat = await run(['diff', 'HEAD', '--shortstat'], folder)
    value = stat ? parseShortstat(stat) : { files: 0, added: 0, removed: 0 }
  }
  changesCache.set(folder, { at: Date.now(), value })
  return value
}
