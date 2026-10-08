import type { TabAgent } from './types'

export const RESUME_FALLBACK_WINDOW_MS = 5000

const NO_CONVERSATION = /no conversation found/i
const NO_CODEX_SESSION = /no saved session found|session not found|no sessions? found/i
const NO_GEMINI_SESSION = /no previous sessions found|invalid session identifier|error resuming session/i

export interface ResumeExit {
  agent: TabAgent
  resumed: boolean
  alreadyRetried: boolean
  runtimeMs: number
  exitCode: number
  output: string
}

export function shouldRelaunchPlain(exit: ResumeExit): boolean {
  if (exit.agent === 'shell' || !exit.resumed || exit.alreadyRetried) return false
  if (exit.runtimeMs > RESUME_FALLBACK_WINDOW_MS) return false
  const missing = exit.agent === 'codex' ? NO_CODEX_SESSION : exit.agent === 'gemini' ? NO_GEMINI_SESSION : NO_CONVERSATION
  return exit.exitCode !== 0 || missing.test(exit.output)
}
