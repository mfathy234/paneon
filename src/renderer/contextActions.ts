import { COMPACT_COMMAND, contextStep } from '../shared/contextWarning'
import { store } from './state'
import { getTerminal } from './terminals'

export function dismissContextHint(tabId: string, percent: number): void {
  const step = contextStep(percent)
  if (step === null) return
  store.patch({ contextDismissed: { ...store.state.contextDismissed, [tabId]: step } })
}

export function typeCompact(tabId: string): void {
  const view = getTerminal(tabId)
  if (!view) return
  view.focus()
  view.insertText(COMPACT_COMMAND)
}
