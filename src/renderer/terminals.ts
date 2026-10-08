import { api } from './api'
import { noteOutput } from './ptyActivity'
import { mapTerm, store } from './state'
import { currentBundle } from './themeManager'
import { TerminalView } from './terminalView'

export interface TerminalEvents {
  onZoom(termId: string, direction: 1 | -1): void
  onFocus(termId: string): void
}

const views = new Map<string, TerminalView>()
const pending = new Map<string, string[]>()
let events: TerminalEvents = { onZoom: () => undefined, onFocus: () => undefined }

export const setTerminalEvents = (value: TerminalEvents): void => {
  events = value
}

function clearResumeChip(id: string): void {
  const pending = store.state.panes.some((p) => p.tabs.some((t) => t.id === id && t.resumeChipAt !== undefined))
  if (pending) store.set((s) => mapTerm(s, id, (t) => ({ ...t, resumeChipAt: undefined })))
}

export function ensureTerminal(id: string, fontSize: number): TerminalView {
  const existing = views.get(id)
  if (existing) return existing
  const view = new TerminalView(id, fontSize, currentBundle(), {
    onInput: (data) => {
      api.write(id, data)
      if (data.charCodeAt(0) !== 27 || data.length === 1) clearResumeChip(id)
    },
    onResize: (cols, rows) => api.resize(id, cols, rows),
    onZoom: (direction) => events.onZoom(id, direction),
    onFocus: () => events.onFocus(id),
    readClipboard: () => api.readClipboard(),
    writeClipboard: (text) => api.writeClipboard(text),
    openLink: (url) => void api.openExternal(url)
  })
  views.set(id, view)
  for (const chunk of pending.get(id) ?? []) view.write(chunk)
  pending.delete(id)
  return view
}

export const getTerminal = (id: string): TerminalView | undefined => views.get(id)

export function disposeTerminal(id: string): void {
  views.get(id)?.dispose()
  views.delete(id)
  pending.delete(id)
}

export function applyBundleToAll(): void {
  const bundle = currentBundle()
  for (const view of views.values()) view.applyBundle(bundle)
}

Object.defineProperty(window, '__grid', {
  value: {
    bufferText: (id: string): string => views.get(id)?.bufferText() ?? '',
    fontSize: (id: string): number => views.get(id)?.fontSize ?? 0,
    feed: (id: string, data: string): void => views.get(id)?.write(data),
    selectAll: (id: string): void => views.get(id)?.selectAll()
  }
})

export function connectPtyStreams(onExit: (id: string, exitCode: number) => void): void {
  api.onData((id, data) => {
    noteOutput(id)
    const view = views.get(id)
    if (view) view.write(data)
    else pending.set(id, [...(pending.get(id) ?? []), data])
  })
  api.onExit((id, exitCode) => onExit(id, exitCode))
}
