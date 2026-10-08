import { contextBridge, ipcRenderer } from 'electron'
import type { GridApi } from '../shared/api'
import { IPC } from '../shared/ipc'
import type { OpsSnapshot } from '../shared/opsFeed'
import type { CodexSession, GeminiSession, SessionFile, StatusInfo } from '../shared/types'

function subscribe<T extends unknown[]>(channel: string, listener: (...args: T) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => listener(...(args as T))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: GridApi = {
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.settingsUpdate, patch),
  pickFolder: () => ipcRenderer.invoke(IPC.pickFolder),
  pickImage: () => ipcRenderer.invoke(IPC.pickImage),
  checkFolder: (path) => ipcRenderer.invoke(IPC.checkFolder, path),
  gitBranch: (folder) => ipcRenderer.invoke(IPC.gitBranch, folder),
  listSessions: () => ipcRenderer.invoke(IPC.sessionsList),
  onSessions: (listener) => subscribe<[SessionFile[]]>(IPC.sessionsUpdate, listener),
  listCodexSessions: () => ipcRenderer.invoke(IPC.codexList),
  onCodexSessions: (listener) => subscribe<[CodexSession[]]>(IPC.codexUpdate, listener),
  listGeminiSessions: () => ipcRenderer.invoke(IPC.geminiList),
  onGeminiSessions: (listener) => subscribe<[GeminiSession[]]>(IPC.geminiUpdate, listener),
  listStatus: () => ipcRenderer.invoke(IPC.statusList),
  onStatus: (listener) => subscribe<[StatusInfo[]]>(IPC.statusUpdate, listener),
  listOps: () => ipcRenderer.invoke(IPC.opsList),
  onOps: (listener) => subscribe<[OpsSnapshot[]]>(IPC.opsUpdate, listener),
  trackOps: (sessionIds) => ipcRenderer.send(IPC.opsTrack, sessionIds),
  gitChanges: (folder) => ipcRenderer.invoke(IPC.gitChanges, folder),
  listResumable: (agent, folder) => ipcRenderer.invoke(IPC.resumeList, agent, folder),
  quickOpen: (kind, folder) => ipcRenderer.invoke(IPC.quickOpen, kind, folder),
  notify: (request) => ipcRenderer.send(IPC.notify, request),
  onNotifyClick: (listener) => subscribe<[string]>(IPC.notifyClick, listener),
  bridgePreview: () => ipcRenderer.invoke(IPC.bridgePreview),
  bridgeStatus: () => ipcRenderer.invoke(IPC.bridgeStatus),
  bridgeInstall: () => ipcRenderer.invoke(IPC.bridgeInstall),
  bridgeUninstall: () => ipcRenderer.invoke(IPC.bridgeUninstall),
  spawn: (request) => ipcRenderer.invoke(IPC.ptySpawn, request),
  write: (id, data) => ipcRenderer.send(IPC.ptyWrite, id, data),
  resize: (id, cols, rows) => ipcRenderer.send(IPC.ptyResize, id, cols, rows),
  kill: (id) => ipcRenderer.invoke(IPC.ptyKill, id),
  onData: (listener) => subscribe<[string, string]>(IPC.ptyData, listener),
  onExit: (listener) => subscribe<[string, number]>(IPC.ptyExit, listener),
  readClipboard: () => ipcRenderer.invoke(IPC.clipboardRead),
  writeClipboard: (text) => ipcRenderer.invoke(IPC.clipboardWrite, text),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  appInfo: () => ipcRenderer.invoke(IPC.appInfo),
  checkAgents: (force) => ipcRenderer.invoke(IPC.agentsCheck, force),
  onFlushRequest: (listener) => {
    ipcRenderer.on(IPC.flushRequest, () => {
      void listener().finally(() => ipcRenderer.send(IPC.flushDone))
    })
  }
}

contextBridge.exposeInMainWorld('gridApi', api)
