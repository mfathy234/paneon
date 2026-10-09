import { api } from './api'
import { derivePanes } from './derive'
import { store } from './state'

const REFRESH_MS = 60_000

export async function refreshUsage(): Promise<void> {
  try {
    const usage = await api.usageSnapshot()
    store.patch({ usage })
  } catch {
    return
  }
}

function paneSignature(): { ids: string; busy: Set<string> } {
  const views = derivePanes(store.state)
  return {
    ids: views.map((view) => `${view.pane.id}:${view.pane.tabs.length}`).join('|'),
    busy: new Set(views.filter((view) => view.status === 'busy').map((view) => view.pane.id))
  }
}

export function installUsageSnapshot(): void {
  let known = paneSignature()
  store.subscribe(() => {
    const next = paneSignature()
    const settled = [...known.busy].some((id) => !next.busy.has(id))
    const changed = next.ids !== known.ids
    known = next
    if (settled || changed) void refreshUsage()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void refreshUsage()
  }, REFRESH_MS)
  void refreshUsage()
}
