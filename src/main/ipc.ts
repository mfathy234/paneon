import { statSync } from 'node:fs'
import { BrowserWindow, clipboard, dialog, ipcMain, shell, app } from 'electron'
import { IPC } from '../shared/ipc'
import type { AgentKind, FolderCheck, NotifyRequest, QuickOpenKind, ResumeQuery, Settings, SpawnRequest } from '../shared/types'
import { readCodexSessions } from './codexWatcher'
import { readGeminiSessions } from './geminiWatcher'
import { notifyUser, quickOpen } from './desktop'
import { currentBranch, gitChanges } from './git'
import { checkAgentTools } from './agentTools'
import { bridgeDirs, claudeSettingsPath } from './paths'
import { listAllSessions } from './sessionIndex'
import { listClaudeSessions, listCodexSessions, listGeminiSessions } from './projectSessions'
import { bridgePreview, bridgeStatus, installBridge, uninstallBridge, type BridgeLocations } from './statusBridge'
import type { OpsWatcher } from './opsWatcher'
import type { StatusWatcher } from './statusWatcher'
import { resolveExecutable } from './executables'
import type { PtyManager } from './ptyManager'
import { readSessions } from './sessionsWatcher'
import type { SettingsStore } from './settingsStore'

function checkFolder(path: string): FolderCheck {
  if (typeof path !== 'string' || path.trim() === '') return { ok: false, error: 'Enter a folder.' }
  try {
    return statSync(path).isDirectory() ? { ok: true } : { ok: false, error: 'This path is not a folder.' }
  } catch {
    return { ok: false, error: 'This folder does not exist.' }
  }
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  settings: SettingsStore,
  ptys: PtyManager,
  status: StatusWatcher,
  ops: OpsWatcher,
  initialWarning: string | null
): void {
  const locations = (): BridgeLocations => ({
    settingsPath: claudeSettingsPath(),
    ...bridgeDirs(app.getPath('userData')),
    nodePath: resolveExecutable('node.exe')
  })
  let warning = initialWarning
  ipcMain.handle(IPC.settingsGet, () => {
    const result = { settings: settings.get(), warning }
    warning = null
    return result
  })
  ipcMain.handle(IPC.settingsUpdate, (_event, patch: Partial<Settings>) => settings.update(patch))
  ipcMain.handle(IPC.checkFolder, (_event, path: string) => checkFolder(path))
  ipcMain.handle(IPC.gitBranch, (_event, folder: string) => currentBranch(folder))
  ipcMain.handle(IPC.sessionsList, () => readSessions())
  ipcMain.handle(IPC.codexList, () => readCodexSessions())
  ipcMain.handle(IPC.geminiList, () => readGeminiSessions())
  ipcMain.handle(IPC.statusList, () => status.current())
  ipcMain.handle(IPC.opsList, () => ops.current())
  ipcMain.on(IPC.opsTrack, (_event, ids: unknown) => {
    ops.track(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [])
  })
  ipcMain.handle(IPC.gitChanges, (_event, folder: string) => gitChanges(folder))
  ipcMain.handle(IPC.resumeList, (_event, agent: AgentKind, folder: string) =>
    agent === 'codex' ? listCodexSessions(folder) : agent === 'gemini' ? listGeminiSessions(folder) : listClaudeSessions(folder)
  )
  ipcMain.handle(IPC.resumeAll, (_event, query: ResumeQuery) => listAllSessions(settings.get().projects, query ?? {}))
  ipcMain.handle(IPC.quickOpen, (_event, kind: QuickOpenKind, folder: string) => quickOpen(kind, folder))
  ipcMain.on(IPC.notify, (_event, request: NotifyRequest) => notifyUser(getWindow(), request))
  ipcMain.handle(IPC.bridgePreview, () => bridgePreview(locations()))
  ipcMain.handle(IPC.bridgeStatus, () => bridgeStatus(locations()))
  ipcMain.handle(IPC.bridgeInstall, () => installBridge(locations()))
  ipcMain.handle(IPC.bridgeUninstall, () => uninstallBridge(locations()))
  ipcMain.handle(IPC.agentsCheck, (_event, force: unknown) => checkAgentTools(force === true))
  ipcMain.handle(IPC.appInfo, () => ptys.info(app.getPath('userData')))
  ipcMain.handle(IPC.pickFolder, async () => {
    const window = getWindow()
    const options = { title: 'Choose a project folder', properties: ['openDirectory' as const] }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })
  ipcMain.handle(IPC.pickImage, async () => {
    const window = getWindow()
    const options = {
      title: 'Choose a background image',
      properties: ['openFile' as const],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }]
    }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })
  ipcMain.handle(IPC.ptySpawn, (_event, request: SpawnRequest) => ptys.spawn(request))
  ipcMain.on(IPC.ptyWrite, (_event, id: string, data: string) => ptys.write(id, data))
  ipcMain.on(IPC.ptyResize, (_event, id: string, cols: number, rows: number) => ptys.resize(id, cols, rows))
  ipcMain.handle(IPC.ptyKill, (_event, id: string) => ptys.kill(id))
  ipcMain.handle(IPC.clipboardRead, () => clipboard.readText())
  ipcMain.handle(IPC.clipboardWrite, (_event, text: string) => clipboard.writeText(String(text)))
  ipcMain.handle(IPC.openExternal, async (_event, url: string) => {
    if (isSafeUrl(url)) await shell.openExternal(url)
  })
}
