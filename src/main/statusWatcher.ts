import { readFile, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseStatusPayload } from '../shared/statusLine'
import type { StatusInfo } from '../shared/types'

const POLL_MS = 2000
const KEEP_MS = 7 * 24 * 60 * 60 * 1000

interface Cached {
  mtimeMs: number
  info: StatusInfo | null
}

export async function readStatusDir(dir: string, cache: Map<string, Cached> = new Map()): Promise<StatusInfo[]> {
  let names: string[]
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith('.json'))
  } catch {
    return []
  }
  const now = Date.now()
  const infos: StatusInfo[] = []
  for (const name of names) {
    const path = join(dir, name)
    try {
      const { mtimeMs } = await stat(path)
      if (now - mtimeMs > KEEP_MS) {
        await rm(path, { force: true })
        cache.delete(path)
        continue
      }
      let entry = cache.get(path)
      if (!entry || entry.mtimeMs !== mtimeMs) {
        entry = { mtimeMs, info: parseStatusPayload(await readFile(path, 'utf8'), Math.round(mtimeMs)) }
        cache.set(path, entry)
      }
      if (entry.info) infos.push(entry.info)
    } catch {
      continue
    }
  }
  return infos
}

export class StatusWatcher {
  private timer: NodeJS.Timeout | null = null
  private last = ''
  private readonly cache = new Map<string, Cached>()

  constructor(
    private readonly dir: string,
    private readonly onChange: (infos: StatusInfo[]) => void
  ) {}

  start(): void {
    void this.tick()
    this.timer = setInterval(() => void this.tick(), POLL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async current(): Promise<StatusInfo[]> {
    return readStatusDir(this.dir, this.cache)
  }

  private async tick(): Promise<void> {
    const infos = await readStatusDir(this.dir, this.cache)
    const signature = infos.map((i) => `${i.sessionId}:${i.receivedAt}`).sort().join('|')
    if (signature === this.last) return
    this.last = signature
    this.onChange(infos)
  }
}
