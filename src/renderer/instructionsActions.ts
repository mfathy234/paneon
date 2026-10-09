import { folderOfPane, paneById, store } from './state'

let guard: (projectId: string) => Promise<boolean> = async () => true

export function setInstructionsGuard(next: (projectId: string) => Promise<boolean>): void {
  guard = next
}

export async function openInstructions(projectId: string | null): Promise<void> {
  const target = projectId ?? store.state.instructionsProject
  if (target && !(await guard(target))) return
  store.patch({ view: 'projects', projectsTab: 'instructions', instructionsProject: target })
}

export function openInstructionsForPane(paneId: string): void {
  const pane = paneById(store.state, paneId)
  const project = store.state.settings.projects.find((p) => p.id === pane?.projectId)
  const byFolder = pane ? store.state.settings.projects.find((p) => p.folder === folderOfPane(store.state, pane)) : undefined
  void openInstructions((project ?? byFolder)?.id ?? null)
}
