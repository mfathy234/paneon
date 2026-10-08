export type AgentKind = 'claude' | 'codex' | 'gemini'
export type TabAgent = AgentKind | 'shell'
export type SessionStatus = 'busy' | 'idle'

export interface Project {
  id: string
  name: string
  folder: string
  defaultAgent: AgentKind
  fontSize?: number
}

export interface BackgroundImage {
  enabled: boolean
  path: string | null
  dim: number
  blur: number
}

export interface ThemeSettings {
  id: string
  image: BackgroundImage
}

export interface SavedTab {
  agent: TabAgent
  label: string
  sessionId?: string
  agentsOpen?: boolean
}

export interface SavedPane {
  projectId: string
  tabs: SavedTab[]
  activeIndex: number
  fontSize: number
}

export interface Workspace {
  panes: SavedPane[]
  focusedIndex: number
}

export interface SessionInfoSettings {
  notifications: boolean
  sound: boolean
}

export interface Settings {
  version: 2
  projects: Project[]
  theme: ThemeSettings
  sidebarCollapsed: boolean
  sessionInfo: SessionInfoSettings
  onboardingDismissed: boolean
  workspace: Workspace
  lastSeenVersion: string | null
  autoUpdateCheck: boolean
}

export interface SettingsLoadResult {
  settings: Settings
  warning: string | null
}

export interface SessionFile {
  pid: number
  sessionId: string
  cwd: string
  name?: string
  nameSource?: string
  status?: string
  startedAt?: number
  updatedAt?: number
  procStart?: string | number
  permissionDenied?: boolean
}

export interface CodexSession {
  sessionId: string
  cwd: string
  name?: string
  startedAt: number
  updatedAt: number
  status: SessionStatus
  model?: string
  contextPercent?: number
}

export interface GeminiSession {
  sessionId: string
  name?: string
  startedAt: number
  updatedAt: number
  model?: string
}

export type ModelFamily = 'opus' | 'sonnet' | 'haiku' | 'fable' | 'codex' | 'gemini' | 'other'

export interface RateLimitWindow {
  key: string
  label: string
  percent: number
  resetsAt: number | null
  family?: ModelFamily
}

export interface StatusInfo {
  sessionId: string
  modelId: string | null
  modelName: string | null
  family: ModelFamily
  cwd: string | null
  costUsd: number | null
  contextPercent: number | null
  rateLimits: RateLimitWindow[]
  receivedAt: number
}

export interface GitChanges {
  files: number
  added: number
  removed: number
}

export interface ResumeEntry {
  id: string
  title: string
  modifiedAt: number
}

export interface ResumeSession {
  agent: AgentKind
  id: string
  title: string
  projectId: string
  modifiedAt: number
  startedAt: number
  messageCount: number
  model?: string
  firstPrompt?: string
  lastAssistant?: string
}

export interface ResumeQuery {
  projectId?: string
  agent?: AgentKind
  query?: string
  limit?: number
}

export type QuickOpenKind = 'vscode' | 'explorer'

export interface BridgePreview {
  settingsPath: string
  previousCommand: string | null
  error: string | null
}

export interface BridgeStatus {
  installed: boolean
  settingsPath: string
  error: string | null
}

export type BridgeResult = { ok: true; note?: string } | { ok: false; error: string }

export interface NotifyRequest {
  paneId: string
  title: string
  body: string
  sound: boolean
}

export interface SpawnRequest {
  id: string
  agent: TabAgent
  cwd: string
  resume: boolean
  sessionId?: string
  cols: number
  rows: number
  command?: string
}

export type SpawnResult = { ok: true; pid: number } | { ok: false; error: string }

export interface FolderCheck {
  ok: boolean
  error?: string
}

export interface AppInfo {
  claudeCommand: string
  codexCommand: string
  geminiCommand: string
  shellCommand: string
  home: string
  userData: string
  version: string
}

export const DEFAULT_FONT_SIZE = 15
export const MIN_FONT_SIZE = 10
export const MAX_FONT_SIZE = 28

export const clampFontSize = (value: number): number =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
