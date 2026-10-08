import { h } from '../dom'

const DURATION_MS = 7000

let region: HTMLElement | null = null

function ensureRegion(): HTMLElement {
  if (region) return region
  region = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' })
  document.body.appendChild(region)
  return region
}

export function toast(message: string, kind: 'error' | 'info' = 'error'): void {
  const item = h('div', { class: `toast ${kind}` }, message)
  const dismiss = (): void => item.remove()
  item.addEventListener('click', dismiss)
  ensureRegion().appendChild(item)
  setTimeout(dismiss, DURATION_MS)
}
