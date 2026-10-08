import { matchCodexSessions } from '../shared/codexSession'
import type { Attention } from '../shared/attention'
import { matchSessions, sessionDisplayName, sessionStatus, sessionWaiting } from '../shared/sessionMatch'
import { opsModelLabel, runningFamilies, type OpsSnapshot } from '../shared/opsFeed'
import { matchGeminiSessions, ptyStatus } from '../shared/geminiSession'
import { lastOutputAt } from './ptyActivity'
import type { CodexSession, GeminiSession, GitChanges, ModelFamily, Project, SessionFile, StatusInfo, TabAgent } from '../shared/types'
import { folderOfPane, projectById, type AppState, type PaneState, type TermState } from './state'

export type PaneStatus = 'busy' | 'idle' | 'exited'

export interface TabView {
  id: string
  label: string
  active: boolean
  exited: boolean
  agent: TabAgent
}

export interface PaneInfo {
  model: { label: string; family: ModelFamily } | null
  contextPercent: number | null
  costUsd: number | null
  ageMs: number | null
  changes: GitChanges | null
  ops: PaneOpsInfo | null
}

export interface PaneOpsInfo {
  plan: { done: number; total: number } | null
  running: ModelFamily[]
  agentsOpen: boolean
}

export interface PaneView {
  pane: PaneState
  project: Project | undefined
  index: number
  title: string
  named: boolean
  agent: TabAgent
  status: PaneStatus
  branch: string | null
  tabs: TabView[]
  activeExited: boolean
  primaryTabId: string
  fileWaiting: boolean
  attention: Attention
  info: PaneInfo
  snapshot: OpsSnapshot | null
  opsLive: boolean
  live: StatusInfo | null
  agentsOpen: boolean
  detailsOpen: boolean
  now: number
}

interface Matches {
  claude: Map<string, SessionFile>
  codex: Map<string, CodexSession>
  gemini: Map<string, GeminiSession>
}

function liveTabs(state: AppState, agent: TabAgent) {
  return state.panes.flatMap((pane) => {
    const cwd = folderOfPane(state, pane)
    if (!cwd) return []
    return pane.tabs
      .filter((tab) => tab.agent === agent && tab.status !== 'exited')
      .map((tab) => ({ tab, cwd }))
  })
}

export function matchAll(state: AppState): Matches {
  const claudeRefs = liveTabs(state, 'claude').map(({ tab, cwd }) => ({
    id: tab.id,
    pid: tab.pid,
    cwd,
    startedAt: tab.startedAt
  }))
  const codexRefs = liveTabs(state, 'codex').map(({ tab, cwd }) => ({
    id: tab.id,
    cwd,
    startedAt: tab.startedAt,
    sessionId: tab.sessionId
  }))
  const geminiRefs = liveTabs(state, 'gemini').map(({ tab }) => ({ id: tab.id, sessionId: tab.sessionId }))
  return {
    claude: matchSessions(claudeRefs, state.sessions),
    codex: matchCodexSessions(codexRefs, state.codexSessions),
    gemini: matchGeminiSessions(geminiRefs, state.geminiSessions)
  }
}

function primaryTab(pane: PaneState): TermState {
  const active = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0]
  if (active.agent !== 'shell') return active
  return pane.tabs.find((t) => t.agent !== 'shell') ?? active
}

function nameOf(tab: TermState, matches: Matches): string | null {
  if (tab.agent === 'claude') return sessionDisplayName(matches.claude.get(tab.id))
  if (tab.agent === 'codex') return matches.codex.get(tab.id)?.name?.trim() || null
  if (tab.agent === 'gemini') return matches.gemini.get(tab.id)?.name?.trim() || null
  return null
}

function statusOf(tab: TermState, matches: Matches, now: number): PaneStatus {
  if (tab.status === 'exited') return 'exited'
  if (tab.agent === 'claude') return sessionStatus(matches.claude.get(tab.id)) ?? 'idle'
  if (tab.agent === 'codex') return matches.codex.get(tab.id)?.status ?? 'idle'
  if (tab.agent === 'gemini') return ptyStatus(lastOutputAt(tab.id), now)
  return 'idle'
}

function titleFor(pane: PaneState, matches: Matches, project: Project | undefined) {
  const ordered = [primaryTab(pane), ...pane.tabs].filter((t) => t.agent !== 'shell')
  for (const tab of ordered) {
    const name = nameOf(tab, matches)
    if (name) return { title: name, named: true }
  }
  return { title: project?.name ?? 'Session', named: false }
}

function ageSince(now: number, ...times: (number | undefined)[]): number | null {
  const known = times.filter((t): t is number => typeof t === 'number')
  return known.length === 0 ? null : Math.max(0, now - Math.max(...known))
}

export function opsSnapshotFor(state: AppState, tab: TermState, matches: Matches): OpsSnapshot | null {
  if (tab.agent !== 'claude') return null
  const session = matches.claude.get(tab.id)
  return (
    (session ? state.opsInfo[session.sessionId] : undefined) ?? (tab.sessionId ? state.opsInfo[tab.sessionId] : undefined) ?? null
  )
}

export function trackedSessionIds(state: AppState): string[] {
  const matches = matchAll(state)
  const ids = new Set<string>()
  for (const pane of state.panes) {
    for (const tab of pane.tabs) {
      if (tab.agent !== 'claude') continue
      if (tab.sessionId) ids.add(tab.sessionId)
      const matched = matches.claude.get(tab.id)
      if (matched) ids.add(matched.sessionId)
    }
  }
  return [...ids].sort()
}

function liveStatusFor(state: AppState, tab: TermState, matches: Matches): StatusInfo | null {
  if (tab.agent !== 'claude' || !state.bridge.installed) return null
  const session = matches.claude.get(tab.id)
  return session ? (state.statusInfo[session.sessionId] ?? null) : null
}

function opsInfoFor(snapshot: OpsSnapshot | null, live: boolean, agentsOpen: boolean): PaneOpsInfo | null {
  if (!snapshot || !live) return null
  return {
    plan: snapshot.plan ? { done: snapshot.plan.done, total: snapshot.plan.total } : null,
    running: runningFamilies(snapshot),
    agentsOpen
  }
}

function claudeInfo(
  state: AppState,
  tab: TermState,
  matches: Matches,
  base: PaneInfo,
  snapshot: OpsSnapshot | null,
  opsLive: boolean
): PaneInfo {
  const session = matches.claude.get(tab.id)
  const live = liveStatusFor(state, tab, matches)
  const opsModel = snapshot?.model ? { label: opsModelLabel(snapshot.model) ?? snapshot.model, family: snapshot.family } : null
  const liveModel = live?.modelName ? { label: live.modelName, family: live.family } : null
  const known = live || snapshot
  return {
    ...base,
    model: opsModel ?? liveModel,
    contextPercent: snapshot?.context?.percent ?? live?.contextPercent ?? null,
    costUsd: live?.costUsd ?? null,
    ageMs: known ? ageSince(state.now, live?.receivedAt, snapshot?.updatedAt, session?.updatedAt) : null,
    ops: opsInfoFor(snapshot, opsLive, tab.agentsOpen === true)
  }
}

function infoFor(
  state: AppState,
  tab: TermState,
  matches: Matches,
  folder: string | null,
  snapshot: OpsSnapshot | null,
  opsLive: boolean
): PaneInfo {
  const changes = folder ? (state.gitChanges[folder] ?? null) : null
  const empty: PaneInfo = { model: null, contextPercent: null, costUsd: null, ageMs: null, changes, ops: null }
  if (tab.agent === 'claude') return claudeInfo(state, tab, matches, empty, snapshot, opsLive)
  if (tab.agent === 'codex') {
    const session = matches.codex.get(tab.id)
    return {
      ...empty,
      model: session?.model ? { label: session.model, family: 'codex' } : null,
      contextPercent: session?.contextPercent ?? null,
      ageMs: session ? ageSince(state.now, session.updatedAt) : null
    }
  }
  if (tab.agent === 'gemini') {
    const session = matches.gemini.get(tab.id)
    return {
      ...empty,
      model: session?.model ? { label: session.model, family: 'gemini' } : null,
      ageMs: session ? ageSince(state.now, session.updatedAt) : null
    }
  }
  return empty
}

export function derivePanes(state: AppState): PaneView[] {
  const matches = matchAll(state)
  return state.panes.map((pane, index) => {
    const project = projectById(state, pane.projectId)
    const folder = folderOfPane(state, pane)
    const primary = primaryTab(pane)
    const { title, named } = titleFor(pane, matches, project)
    const active = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0]
    const status = statusOf(primary, matches, state.now)
    const snapshot = opsSnapshotFor(state, primary, matches)
    const opsLive = snapshot !== null && !snapshot.ended && status !== 'exited'
    return {
      pane,
      project,
      index,
      title,
      named,
      agent: primary.agent,
      status,
      snapshot,
      opsLive,
      live: liveStatusFor(state, primary, matches),
      agentsOpen: primary.agentsOpen === true,
      now: state.now,
      detailsOpen: state.detailsPaneId === pane.id && state.maximizedId === pane.id,
      branch: folder ? (state.branches[folder] ?? null) : null,
      activeExited: active.status === 'exited',
      primaryTabId: primary.id,
      fileWaiting: primary.agent === 'claude' && sessionWaiting(matches.claude.get(primary.id)),
      attention: state.attention[pane.id] ?? 'none',
      info: infoFor(state, primary, matches, folder, snapshot, opsLive),
      tabs: pane.tabs.map((tab) => ({
        id: tab.id,
        agent: tab.agent,
        active: tab.id === active.id,
        exited: tab.status === 'exited',
        label: nameOf(tab, matches) || tab.label
      }))
    }
  })
}

export interface Counts {
  sessions: number
  busy: number
}

export function countSessions(views: PaneView[]): Counts {
  return {
    sessions: views.length,
    busy: views.filter((v) => v.status === 'busy').length
  }
}
