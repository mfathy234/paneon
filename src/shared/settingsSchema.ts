import { isAgent } from './agents'
import { DEFAULT_THEME_ID } from './themes'
import { formatShortcut, parseShortcut } from './shortcuts'
import { isVersion } from './version'
import {
  DEFAULT_FONT_SIZE,
  clampFontSize,
  type BackgroundImage,
  type Project,
  type SavedLayout,
  type SavedPane,
  type SavedTab,
  type Settings,
  type TabAgent,
  type Workspace
} from './types'

type Raw = Record<string, unknown>

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

let idCounter = 0
const makeId = (): string => {
  idCounter += 1
  return `p-${Date.now().toString(36)}-${idCounter}`
}

export const DEFAULT_PALETTE_SHORTCUT = 'Ctrl+K'

export const defaultImage = (): BackgroundImage => ({ enabled: false, path: null, dim: 60, blur: 0 })

export const defaultSettings = (): Settings => ({
  version: 2,
  projects: [],
  theme: { id: DEFAULT_THEME_ID, image: defaultImage() },
  sidebarCollapsed: false,
  sessionInfo: { notifications: true, sound: false },
  onboardingDismissed: false,
  workspace: { panes: [], focusedIndex: 0 },
  layouts: [],
  lastSeenVersion: null,
  autoUpdateCheck: true,
  paletteShortcut: DEFAULT_PALETTE_SHORTCUT
})

function sanitizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const projects: Project[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const folder = asString(item.folder) ?? asString(item.path)
    if (!folder) continue
    const folderName = folder.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? folder
    let id = asString(item.id) ?? makeId()
    if (seen.has(id)) id = makeId()
    seen.add(id)
    const project: Project = {
      id,
      name: asString(item.name) ?? folderName,
      folder,
      defaultAgent: isAgent(item.defaultAgent) ? item.defaultAgent : 'claude'
    }
    if (typeof item.fontSize === 'number') project.fontSize = clampFontSize(item.fontSize)
    projects.push(project)
  }
  return projects
}

function sanitizeImage(value: unknown): BackgroundImage {
  const base = defaultImage()
  if (!isRecord(value)) return base
  const path = asString(value.path)
  return {
    enabled: value.enabled === true && path !== null,
    path,
    dim: clampNumber(value.dim, 0, 90, base.dim),
    blur: clampNumber(value.blur, 0, 20, base.blur)
  }
}

function sanitizeTab(value: unknown): SavedTab | null {
  if (!isRecord(value)) return null
  const raw = value.agent ?? value.kind
  const agent: TabAgent = raw === 'shell' ? 'shell' : isAgent(raw) ? raw : 'claude'
  const tab: SavedTab = { agent, label: asString(value.label) ?? agent }
  const sessionId = asString(value.sessionId)
  if (sessionId && agent !== 'shell') tab.sessionId = sessionId
  if (value.agentsOpen === true && agent === 'claude') tab.agentsOpen = true
  return tab
}

function sanitizePane(item: unknown): SavedPane | null {
  if (!isRecord(item)) return null
  const projectId = asString(item.projectId)
  if (!projectId) return null
  const tabs = (Array.isArray(item.tabs) ? item.tabs : [])
    .map(sanitizeTab)
    .filter((tab): tab is SavedTab => tab !== null)
  if (tabs.length === 0) return null
  const activeIndex = clampNumber(item.activeIndex, 0, tabs.length - 1, 0)
  const fontSize = clampFontSize(typeof item.fontSize === 'number' ? item.fontSize : DEFAULT_FONT_SIZE)
  return { projectId, tabs, activeIndex: Math.round(activeIndex), fontSize }
}

function sanitizePanes(value: unknown): SavedPane[] {
  return (Array.isArray(value) ? value : []).map(sanitizePane).filter((pane): pane is SavedPane => pane !== null)
}

function focusedIn(value: unknown, count: number): number {
  return Math.round(clampNumber(value, 0, Math.max(0, count - 1), 0))
}

function sanitizeWorkspace(value: unknown, projectIds: Set<string>): Workspace {
  if (!isRecord(value) || !Array.isArray(value.panes)) return { panes: [], focusedIndex: 0 }
  const panes = sanitizePanes(value.panes).filter((pane) => projectIds.has(pane.projectId))
  return { panes, focusedIndex: focusedIn(value.focusedIndex, panes.length) }
}

export const MAX_LAYOUTS = 50
export const LAYOUT_NAME_MAX = 40

function sanitizeLayouts(value: unknown): SavedLayout[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const layouts: SavedLayout[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const name = asString(item.name)?.trim().slice(0, LAYOUT_NAME_MAX)
    const panes = sanitizePanes(item.panes)
    if (!name || panes.length === 0) continue
    let id = asString(item.id) ?? makeId()
    if (seen.has(id)) id = makeId()
    seen.add(id)
    const createdAt = typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : 0
    layouts.push({ id, name, createdAt, focusedIndex: focusedIn(item.focusedIndex, panes.length), panes })
  }
  return layouts.slice(0, MAX_LAYOUTS)
}

function sanitizeShortcut(value: unknown): string {
  const binding = typeof value === 'string' ? parseShortcut(value) : null
  return binding ? formatShortcut(binding) : DEFAULT_PALETTE_SHORTCUT
}

export function migrateSettings(raw: unknown): Settings {
  const defaults = defaultSettings()
  if (!isRecord(raw)) return defaults
  const projects = sanitizeProjects(raw.projects)
  const theme = isRecord(raw.theme) ? raw.theme : {}
  const info = isRecord(raw.sessionInfo) ? raw.sessionInfo : {}
  return {
    version: 2,
    projects,
    theme: { id: asString(theme.id) ?? defaults.theme.id, image: sanitizeImage(theme.image) },
    sidebarCollapsed: raw.sidebarCollapsed === true,
    sessionInfo: {
      notifications: typeof info.notifications === 'boolean' ? info.notifications : defaults.sessionInfo.notifications,
      sound: typeof info.sound === 'boolean' ? info.sound : defaults.sessionInfo.sound
    },
    onboardingDismissed: raw.onboardingDismissed === true,
    workspace: sanitizeWorkspace(raw.workspace, new Set(projects.map((p) => p.id))),
    layouts: sanitizeLayouts(raw.layouts),
    lastSeenVersion: isVersion(raw.lastSeenVersion) ? raw.lastSeenVersion : null,
    autoUpdateCheck: raw.autoUpdateCheck !== false,
    paletteShortcut: sanitizeShortcut(raw.paletteShortcut)
  }
}
