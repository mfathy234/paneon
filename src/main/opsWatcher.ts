import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseOpsSnapshot, type OpsSnapshot } from '../shared/opsFeed'

const POLL_MS = 1000

interface Cached {
  mtimeMs: number
  size: number
  snapshot: OpsSnapshot | null
}

export type OpsCache = Map<string, Cached>

export async function readOpsDirs(dirs: string[], cache: OpsCache = new Map()): Promise<OpsSnapshot[]> {
  const seen = new Set<string>()
  for (const dir of dirs) {
    let names: string[]
    try {
      names = (await readdir(dir)).filter((name) => name.endsWith('.json'))
    } catch {
      continue
    }
    for (const name of names) {
      const path = join(dir, name)
      seen.add(path)
      try {
        const { mtimeMs, size } = await stat(path)
        const known = cache.get(path)
        if (known && known.mtimeMs === mtimeMs && known.size === size) continue
        const parsed = parseOpsSnapshot(await readFile(path, 'utf8'))
        cache.set(path, { mtimeMs, size, snapshot: parsed ?? known?.snapshot ?? null })
      } catch {
        continue
      }
    }
  }
  for (const path of [...cache.keys()]) if (!seen.has(path)) cache.delete(path)
  const bySession = new Map<string, OpsSnapshot>()
  for (const { snapshot } of cache.values()) {
    if (!snapshot) continue
    const other = bySession.get(snapshot.sessionId)
    if (!other || snapshot.updatedAt >= other.updatedAt) bySession.set(snapshot.sessionId, snapshot)
  }
  return [...bySession.values()]
}

export const readOpsDir = (dir: string, cache: OpsCache = new Map()): Promise<OpsSnapshot[]> =>
  readOpsDirs([dir], cache)

export class OpsWatcher {
  private timer: NodeJS.Timeout | null = null
  private last = ''
  private tracked = new Set<string>()
  private readonly cache: OpsCache = new Map()

  constructor(
    private readonly dirs: string[],
    private readonly onChange: (snapshots: OpsSnapshot[]) => void
  ) {}

  start(): void {
    void this.tick()
    this.timer = setInterval(() => void this.tick(), POLL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  track(sessionIds: string[]): void {
    this.tracked = new Set(sessionIds)
    void this.tick()
  }

  async current(): Promise<OpsSnapshot[]> {
    return this.filtered(await readOpsDirs(this.dirs, this.cache))
  }

  private filtered(snapshots: OpsSnapshot[]): OpsSnapshot[] {
    return snapshots.filter((s) => this.tracked.has(s.sessionId))
  }

  private async tick(): Promise<void> {
    const snapshots = this.filtered(await readOpsDirs(this.dirs, this.cache))
    const signature = snapshots
      .map((s) => `${s.sessionId}:${s.updatedAt}:${s.ended}:${JSON.stringify(s).length}`)
      .sort()
      .join('|')
    if (signature === this.last) return
    this.last = signature
    this.onChange(snapshots)
  }
}
