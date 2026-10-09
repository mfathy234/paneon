import type { TabAgent } from './types'

export const CONTEXT_AMBER = 80
export const CONTEXT_RED = 90
export const CONTEXT_HINT_STEPS: readonly number[] = [90, 95]
export const COMPACT_COMMAND = '/compact'

export type ContextLevel = 'ok' | 'amber' | 'red'

export function contextLevel(percent: number): ContextLevel {
  if (percent >= CONTEXT_RED) return 'red'
  if (percent >= CONTEXT_AMBER) return 'amber'
  return 'ok'
}

export function contextStep(percent: number): number | null {
  const reached = CONTEXT_HINT_STEPS.filter((step) => percent >= step)
  return reached.length > 0 ? Math.max(...reached) : null
}

export function showContextHint(percent: number | null, dismissedStep: number | undefined): boolean {
  if (percent === null) return false
  const step = contextStep(percent)
  if (step === null) return false
  return dismissedStep === undefined || step > dismissedStep
}

export const contextHintText = (percent: number): string =>
  `Context is ${Math.round(percent)}% full — /compact or start a fresh session`

export const canCompact = (agent: TabAgent): boolean => agent === 'claude' || agent === 'codex'

export interface ContextNotice {
  notified: boolean
}

export function stepContextNotice(
  memory: ContextNotice,
  percent: number | null,
  unseen: boolean
): { memory: ContextNotice; notify: boolean } {
  if (percent === null || percent < CONTEXT_RED) return { memory: { notified: false }, notify: false }
  if (memory.notified) return { memory, notify: false }
  return { memory: { notified: true }, notify: unseen }
}
