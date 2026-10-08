import { DEFAULT_FONT_SIZE } from '../shared/types'
import {
  closeDetails,
  focusRelative,
  openQuickPick,
  openResumePicker,
  restoreGrid,
  setPaneFont,
  toggleMaximize,
  zoomPane
} from './actions'
import { derivePanes } from './derive'
import { store } from './state'

const overlayOpen = (): boolean => document.querySelector('.overlay, .popover') !== null

function zoomDelta(event: KeyboardEvent): number | 'reset' | null {
  if (event.key === '=' || event.key === '+' || event.code === 'NumpadAdd') return 1
  if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') return -1
  if (event.key === '0' || event.code === 'Numpad0') return 'reset'
  return null
}

function escapeShouldRestore(event: KeyboardEvent): boolean {
  const { maximizedId, focusedId } = store.state
  if (!maximizedId) return false
  const inTerminal = (event.target as HTMLElement | null)?.closest('.xterm') !== null
  if (!inTerminal) return true
  const focused = derivePanes(store.state).find((v) => v.pane.id === focusedId)
  return focused?.status !== 'busy'
}

function consume(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.isComposing || overlayOpen()) return
  const state = store.state
  const ctrl = event.ctrlKey && !event.metaKey
  if (ctrl && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'n') {
    consume(event)
    openQuickPick()
    return
  }
  if (ctrl && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'n') {
    consume(event)
    openQuickPick('other')
    return
  }
  if (ctrl && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'r') {
    consume(event)
    openResumePicker()
    return
  }
  if (state.view !== 'grid') return
  if (ctrl && !event.altKey && event.key === 'Enter') {
    consume(event)
    toggleMaximize()
    return
  }
  if (ctrl && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    consume(event)
    focusRelative(event.key === 'ArrowLeft' ? -1 : 1)
    return
  }
  if (event.key === 'Escape' && escapeShouldRestore(event)) {
    consume(event)
    if (state.detailsPaneId !== null) closeDetails()
    else restoreGrid()
    return
  }
  const zoom = ctrl && !event.altKey ? zoomDelta(event) : null
  if (zoom !== null && state.focusedId) {
    consume(event)
    if (zoom === 'reset') setPaneFont(state.focusedId, DEFAULT_FONT_SIZE)
    else zoomPane(state.focusedId, zoom)
  }
}

export function installKeyboard(): void {
  window.addEventListener('keydown', onKeyDown, true)
}
