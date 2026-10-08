import { GEMINI_BUSY_MS } from '../shared/geminiSession'
import { store } from './state'

const TICK_MS = 500
const lastOutput = new Map<string, number>()
let lastTick = 0
let settleTimer: number | undefined

export const lastOutputAt = (id: string): number | undefined => lastOutput.get(id)

export function noteOutput(id: string): void {
  const now = Date.now()
  lastOutput.set(id, now)
  if (now - lastTick >= TICK_MS) {
    lastTick = now
    store.patch({ now })
  }
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(() => store.patch({ now: Date.now() }), GEMINI_BUSY_MS + 100)
}

export function forgetOutput(id: string): void {
  lastOutput.delete(id)
}
