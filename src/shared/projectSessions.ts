const MAX_TITLE = 80
const SESSION_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i

type Record_ = Record<string, unknown>

export const claudeProjectSlug = (folder: string): string => folder.replace(/[^A-Za-z0-9]/g, '-')

export const sessionIdFromFile = (fileName: string): string | null => SESSION_FILE.exec(fileName)?.[1] ?? null

function tidy(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_TITLE ? `${flat.slice(0, MAX_TITLE - 1)}…` : flat
}

function parseLines(text: string): Record_[] {
  const records: Record_[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue
    try {
      const value: unknown = JSON.parse(line)
      if (typeof value === 'object' && value !== null) records.push(value as Record_)
    } catch {
      continue
    }
  }
  return records
}

function promptText(record: Record_): string | null {
  if (record.type !== 'user' || record.isMeta === true) return null
  const content = (record.message as { content?: unknown } | undefined)?.content
  let text = ''
  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    const block = content.find((b) => (b as { type?: unknown } | null)?.type === 'text') as { text?: unknown } | undefined
    text = typeof block?.text === 'string' ? block.text : ''
  }
  text = text.trim()
  return text === '' || text.startsWith('<') ? null : text
}

export function sessionTitle(head: string, tail: string): string | null {
  const headRecords = parseLines(head)
  let custom: string | null = null
  let generated: string | null = null
  for (const record of [...headRecords, ...parseLines(tail)]) {
    if (record.type === 'custom-title' && typeof record.customTitle === 'string') custom = record.customTitle
    if (record.type === 'ai-title' && typeof record.aiTitle === 'string') generated = record.aiTitle
  }
  const named = custom?.trim() || generated?.trim()
  if (named) return tidy(named)
  for (const record of headRecords) {
    const prompt = promptText(record)
    if (prompt) return tidy(prompt)
  }
  return null
}
