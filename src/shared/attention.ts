export type Attention = 'none' | 'done' | 'needs'
export type ObservedStatus = 'busy' | 'idle' | 'exited'

export interface AttentionMemory {
  status: ObservedStatus | null
  attention: Attention
}

export interface AttentionObservation {
  status: ObservedStatus
  waiting: boolean
  focused: boolean
  visible: boolean
  windowFocused: boolean
}

export interface AttentionStep {
  memory: AttentionMemory
  notify: 'done' | 'needs' | null
}

export const initialAttention = (): AttentionMemory => ({ status: null, attention: 'none' })

export function stepAttention(memory: AttentionMemory, obs: AttentionObservation): AttentionStep {
  const watching = obs.focused && obs.windowFocused
  const needs = obs.waiting && obs.status !== 'exited'
  const finished = memory.status === 'busy' && obs.status === 'idle'
  let attention: Attention = 'none'
  let event: 'done' | 'needs' | null = null
  if (obs.status === 'exited' || watching) {
    attention = 'none'
  } else if (needs) {
    attention = 'needs'
    if (memory.attention !== 'needs') event = 'needs'
  } else if (memory.attention === 'done' && obs.status === 'idle') {
    attention = 'done'
  } else if (finished) {
    attention = 'done'
    event = 'done'
  }
  const notify = event !== null && (!obs.windowFocused || !obs.visible) ? event : null
  return { memory: { status: obs.status, attention }, notify }
}
