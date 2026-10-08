import type { AgentKind } from './types'

const MAX_TEXT = 400

export interface SessionDetail {
  firstPrompt?: string
  lastAssistant?: string
  model?: string
  startedAt?: number
  messages: number
}

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

function records(text: string): Json[] {
  const out: Json[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue
    try {
      const value: unknown = JSON.parse(line)
      if (isRecord(value)) out.push(value)
    } catch {
      continue
    }
  }
  return out
}

function tidy(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT - 1)}…` : flat
}

const asTime = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function blockText(content: unknown, types: string[]): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (!isRecord(part) || typeof part.text !== 'string') return ''
      return part.type === undefined || types.includes(String(part.type)) ? part.text : ''
    })
    .join('')
}

const isPrompt = (text: string): boolean => text.trim() !== '' && !text.trim().startsWith('<')

export function modelLabel(agent: AgentKind, model: string | undefined): string | undefined {
  if (!model) return undefined
  if (agent !== 'claude') return model
  const family = /(opus|sonnet|haiku|fable)/i.exec(model)?.[1]
  return family ? family[0].toUpperCase() + family.slice(1).toLowerCase() : model
}

export function claudeDetail(text: string, scale = 1): SessionDetail {
  let messages = 0
  const detail: SessionDetail = { messages: 0 }
  for (const record of records(text)) {
    const message = isRecord(record.message) ? record.message : {}
    if (detail.startedAt === undefined) detail.startedAt = asTime(record.timestamp)
    if (record.type === 'user' && record.isMeta !== true) {
      const prompt = blockText(message.content, ['text'])
      if (!isPrompt(prompt)) continue
      messages += 1
      if (detail.firstPrompt === undefined) detail.firstPrompt = tidy(prompt)
    } else if (record.type === 'assistant') {
      const reply = blockText(message.content, ['text'])
      if (reply.trim() === '') continue
      messages += 1
      detail.lastAssistant = tidy(reply)
      if (typeof message.model === 'string' && message.model !== '<synthetic>') detail.model = message.model
    }
  }
  detail.messages = Math.round(messages * scale)
  return detail
}

interface Turn {
  role: 'user' | 'assistant'
  text: string
}

export function codexDetail(text: string, scale = 1): SessionDetail {
  const events: Turn[] = []
  const items: Turn[] = []
  const detail: SessionDetail = { messages: 0 }
  for (const record of records(text)) {
    const payload = isRecord(record.payload) ? record.payload : {}
    if (record.type === 'session_meta') detail.startedAt = asTime(payload.timestamp) ?? detail.startedAt
    if (record.type === 'turn_context' && typeof payload.model === 'string') detail.model = payload.model
    if (record.type === 'event_msg' && typeof payload.message === 'string') {
      if (payload.type === 'user_message') events.push({ role: 'user', text: payload.message })
      if (payload.type === 'agent_message') events.push({ role: 'assistant', text: payload.message })
    }
    if (record.type === 'response_item' && payload.type === 'message') {
      const role = payload.role === 'user' ? 'user' : payload.role === 'assistant' ? 'assistant' : null
      const body = blockText(payload.content, ['input_text', 'output_text'])
      if (role && body.trim() !== '' && (role === 'assistant' || isPrompt(body))) items.push({ role, text: body })
    }
  }
  const turns = events.length > 0 ? events : items
  const first = turns.find((t) => t.role === 'user' && isPrompt(t.text))
  if (first) detail.firstPrompt = tidy(first.text)
  const last = [...turns].reverse().find((t) => t.role === 'assistant')
  if (last) detail.lastAssistant = tidy(last.text)
  detail.messages = Math.round(turns.length * scale)
  return detail
}

export function geminiDetail(text: string, scale = 1): SessionDetail {
  const detail: SessionDetail = { messages: 0 }
  let messages = 0
  const take = (message: Json): void => {
    const body = blockText(message.content, ['text']).trim()
    if (message.type === 'user' && body && !body.startsWith('/') && !body.startsWith('?')) {
      messages += 1
      if (detail.firstPrompt === undefined) detail.firstPrompt = tidy(body)
    } else if (message.type === 'gemini' && body) {
      messages += 1
      detail.lastAssistant = tidy(body)
      if (typeof message.model === 'string' && message.model) detail.model = message.model
    }
  }
  for (const record of records(text)) {
    if (typeof record.startTime === 'string' && detail.startedAt === undefined) detail.startedAt = asTime(record.startTime)
    if (typeof record.id === 'string' && typeof record.type === 'string') take(record)
    if (Array.isArray(record.messages)) for (const m of record.messages) if (isRecord(m)) take(m)
  }
  detail.messages = Math.round(messages * scale)
  return detail
}
