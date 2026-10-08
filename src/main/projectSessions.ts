import { open, readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizePath } from '../shared/sessionMatch'
import { parseRolloutMeta, parseSessionIndex, rolloutIdFromName } from '../shared/codexSession'
import { claudeProjectSlug, sessionIdFromFile, sessionTitle } from '../shared/projectSessions'
import type { ResumeEntry } from '../shared/types'
import { codexHome, geminiHome } from './agentLaunch'
import { listGeminiChatFiles, projectSlugs, readGeminiChat } from './geminiWatcher'
import { claudeProjectsDir } from './paths'

const MAX_ENTRIES = 15
const MAX_SCANNED = 80
const HEAD_BYTES = 96 * 1024
const TAIL_BYTES = 48 * 1024
const CODEX_META_BYTES = 64 * 1024

async function readRange(path: string, start: number, length: number): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await handle.read(buffer, 0, length, start)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    await handle.close()
  }
}

export async function listClaudeSessions(
  folder: string,
  projectsDir: string = claudeProjectsDir()
): Promise<ResumeEntry[]> {
  const dir = join(projectsDir, claudeProjectSlug(folder))
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const files = (
    await Promise.all(
      names.map(async (name) => {
        const id = sessionIdFromFile(name)
        if (!id) return null
        try {
          const info = await stat(join(dir, name))
          return { id, path: join(dir, name), size: info.size, modifiedAt: Math.round(info.mtimeMs) }
        } catch {
          return null
        }
      })
    )
  )
    .filter((f): f is NonNullable<typeof f> => f !== null && f.size > 0)
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, MAX_SCANNED)
  const entries: ResumeEntry[] = []
  for (const file of files) {
    if (entries.length >= MAX_ENTRIES) break
    try {
      const head = await readRange(file.path, 0, Math.min(file.size, HEAD_BYTES))
      const tail = file.size > HEAD_BYTES ? await readRange(file.path, Math.max(0, file.size - TAIL_BYTES), TAIL_BYTES) : ''
      const title = sessionTitle(head, tail)
      if (title) entries.push({ id: file.id, title, modifiedAt: file.modifiedAt })
    } catch {
      continue
    }
  }
  return entries
}

async function listRolloutFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const walk = async (dir: string, depth: number): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory() && depth < 3) await walk(path, depth + 1)
      else if (entry.isFile() && rolloutIdFromName(entry.name)) files.push(path)
    }
  }
  await walk(root, 0)
  return files
}

export async function listCodexSessions(folder: string, home: string = codexHome()): Promise<ResumeEntry[]> {
  const [files, names] = await Promise.all([
    listRolloutFiles(join(home, 'sessions')),
    readFile(join(home, 'session_index.jsonl'), 'utf8').then(parseSessionIndex, () => new Map<string, string>())
  ])
  const wanted = normalizePath(folder)
  const dated = await Promise.all(
    files.map(async (path) => {
      try {
        return { path, modifiedAt: Math.round((await stat(path)).mtimeMs) }
      } catch {
        return null
      }
    })
  )
  const sorted = dated.filter((f): f is NonNullable<typeof f> => f !== null).sort((a, b) => b.modifiedAt - a.modifiedAt)
  const entries: ResumeEntry[] = []
  for (const file of sorted.slice(0, MAX_SCANNED * 4)) {
    if (entries.length >= MAX_ENTRIES) break
    try {
      const head = await readRange(file.path, 0, CODEX_META_BYTES)
      const meta = parseRolloutMeta(head.split('\n')[0])
      if (!meta || normalizePath(meta.cwd) !== wanted) continue
      entries.push({ id: meta.sessionId, title: names.get(meta.sessionId) ?? 'Codex session', modifiedAt: file.modifiedAt })
    } catch {
      continue
    }
  }
  return entries
}

export async function listGeminiSessions(folder: string, home: string = geminiHome()): Promise<ResumeEntry[]> {
  const slugs = new Set(await projectSlugs(folder, home))
  if (slugs.size === 0) return []
  const files = (await listGeminiChatFiles(home))
    .filter((f) => slugs.has(f.slug))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, MAX_SCANNED)
  const byId = new Map<string, ResumeEntry>()
  for (const file of files) {
    const chat = await readGeminiChat(file)
    if (!chat || !chat.hasConversation || byId.has(chat.sessionId)) continue
    byId.set(chat.sessionId, { id: chat.sessionId, title: chat.name ?? 'Gemini session', modifiedAt: file.modifiedAt })
  }
  return [...byId.values()].slice(0, MAX_ENTRIES)
}
