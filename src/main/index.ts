import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BrowserWindow, Menu, app, ipcMain, net, protocol } from 'electron'
import { IPC } from '../shared/ipc'
import { CodexWatcher } from './codexWatcher'
import { GeminiWatcher } from './geminiWatcher'
import { registerIpc } from './ipc'
import { PtyManager } from './ptyManager'
import { SessionsWatcher } from './sessionsWatcher'
import { SettingsStore } from './settingsStore'
import { StatusWatcher } from './statusWatcher'
import { OpsWatcher } from './opsWatcher'
import { bridgeDirs, claudeSettingsPath, legacyUserDataDir, opsDirs } from './paths'
import { resolveExecutable } from './executables'
import { migrateLegacyUserData } from './userDataMigration'

const IMAGE_SCHEME = 'cg-image'
const QUIT_KILL_TIMEOUT_MS = 2000
const FLUSH_TIMEOUT_MS = 1000

if (process.env.PANEON_USER_DATA) app.setPath('userData', process.env.PANEON_USER_DATA)

protocol.registerSchemesAsPrivileged([
  { scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

let mainWindow: BrowserWindow | null = null

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.exit(0)
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

function flushRenderer(): Promise<void> {
  const window = mainWindow
  if (!window || window.isDestroyed()) return Promise.resolve()
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer)
      ipcMain.removeListener(IPC.flushDone, finish)
      resolve()
    }
    const timer = setTimeout(finish, FLUSH_TIMEOUT_MS)
    ipcMain.once(IPC.flushDone, finish)
    window.webContents.send(IPC.flushRequest)
  })
}

function send(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Paneon',
    icon: join(app.getAppPath(), 'build', 'icon.png'),
    backgroundColor: '#0c0e12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  let flushedOnClose = false
  window.on('close', (event) => {
    if (flushedOnClose) return
    flushedOnClose = true
    event.preventDefault()
    void flushRenderer().finally(() => window.close())
  })
  window.on('focus', () => window.flashFrame(false))
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  return window
}

function registerImageProtocol(settings: SettingsStore): void {
  protocol.handle(IMAGE_SCHEME, async () => {
    const path = settings.get().theme.image.path
    if (!path) return new Response('No background image', { status: 404 })
    return net.fetch(pathToFileURL(path).toString(), { bypassCustomProtocolHandlers: true })
  })
}

app.whenReady().then(() => {
  if (!gotLock) return
  Menu.setApplicationMenu(null)
  const userData = app.getPath('userData')
  const legacyDir = legacyUserDataDir()
  const migration = legacyDir
    ? migrateLegacyUserData({
        legacyDir,
        newDir: userData,
        claudeSettingsPath: claudeSettingsPath(),
        nodePath: resolveExecutable('node.exe')
      })
    : null
  const store = new SettingsStore(join(userData, 'settings.json'))
  const loaded = store.load()
  const warning = [migration?.note, loaded.warning].filter(Boolean).join(' ') || null
  const ptys = new PtyManager({
    onData: (id, data) => send(IPC.ptyData, id, data),
    onExit: (id, code) => send(IPC.ptyExit, id, code)
  })
  const watcher = new SessionsWatcher((sessions) => send(IPC.sessionsUpdate, sessions))
  const codexWatcher = new CodexWatcher((sessions) => send(IPC.codexUpdate, sessions))
  const geminiWatcher = new GeminiWatcher((sessions) => send(IPC.geminiUpdate, sessions))
  const statusWatcher = new StatusWatcher(bridgeDirs(app.getPath('userData')).statusDir, (infos) =>
    send(IPC.statusUpdate, infos)
  )
  const opsWatcher = new OpsWatcher(opsDirs(), (snapshots) => send(IPC.opsUpdate, snapshots))
  registerImageProtocol(store)
  registerIpc(() => mainWindow, store, ptys, statusWatcher, opsWatcher, warning)
  mainWindow = createWindow()
  mainWindow.webContents.once('did-finish-load', () => {
    watcher.start()
    codexWatcher.start()
    geminiWatcher.start()
    statusWatcher.start()
    opsWatcher.start()
  })
  let quitting = false
  app.on('before-quit', (event) => {
    if (quitting) return
    quitting = true
    event.preventDefault()
    watcher.stop()
    codexWatcher.stop()
    geminiWatcher.stop()
    statusWatcher.stop()
    opsWatcher.stop()
    void flushRenderer()
      .then(() => ptys.terminateAll(QUIT_KILL_TIMEOUT_MS))
      .finally(() => app.exit(0))
  })
})

app.on('window-all-closed', () => app.quit())
