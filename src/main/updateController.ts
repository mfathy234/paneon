import { normalizeNotes } from '../shared/markdown'
import { initialUpdateState, type UpdateMode, type UpdateState } from '../shared/updates'
import { compareVersions, isNewerVersion } from '../shared/version'

export type BackendEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error'

export interface UpdateInfoPayload {
  version: string
  releaseDate?: string
  releaseNotes?: unknown
}

export interface UpdaterBackend {
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(silent: boolean, forceRunAfter: boolean): void
  on(event: BackendEvent, listener: (payload?: unknown) => void): void
}

export interface UpdateControllerOptions {
  backend: UpdaterBackend
  mode: UpdateMode
  currentVersion: string
  autoCheck: () => boolean
  onChange: (state: UpdateState) => void
  now?: () => number
  startDelayMs?: number
  intervalMs?: number
}

type Phase = 'check' | 'download'

export const DEFAULT_START_DELAY_MS = 10_000
export const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000

const errorText = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const firstLine = message.split('\n')[0].trim()
  return firstLine || 'The update could not be completed.'
}

export class UpdateController {
  private current: UpdateState
  private dismissedVersion: string | null = null
  private failedPhase: Phase | null = null
  private manualCheck = false
  private installing = false
  private checking = false
  private startTimer: ReturnType<typeof setTimeout> | null = null
  private intervalTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly options: UpdateControllerOptions) {
    this.current = initialUpdateState(options.currentVersion, options.mode)
    this.attach()
  }

  get state(): UpdateState {
    return this.current
  }

  start(): void {
    if (this.options.mode === 'dev') return
    this.startTimer = setTimeout(() => this.tick(), this.options.startDelayMs ?? DEFAULT_START_DELAY_MS)
    this.intervalTimer = setInterval(() => this.tick(), this.options.intervalMs ?? DEFAULT_INTERVAL_MS)
  }

  stop(): void {
    if (this.startTimer) clearTimeout(this.startTimer)
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.startTimer = null
    this.intervalTimer = null
  }

  async check(manual: boolean): Promise<void> {
    const { status, mode } = this.current
    if (mode === 'dev' || this.checking || status === 'downloading' || status === 'ready') return
    this.checking = true
    this.manualCheck = manual
    this.failedPhase = null
    this.set({ status: status === 'available' ? status : 'checking', error: null })
    try {
      await this.options.backend.checkForUpdates()
    } catch (error) {
      this.checking = false
      this.fail(error, 'check')
      return
    }
    this.checking = false
    if (this.current.status === 'checking') this.set({ status: this.hasUpdate() ? 'available' : 'idle', checkedAt: this.now() })
  }

  async download(): Promise<void> {
    const { status, mode, version } = this.current
    if (mode !== 'installed' || !version) return
    if (status !== 'available' && !(status === 'error' && this.failedPhase === 'download')) return
    this.failedPhase = null
    this.set({ status: 'downloading', percent: 0, error: null })
    try {
      await this.options.backend.downloadUpdate()
    } catch (error) {
      this.fail(error, 'download')
    }
  }

  async retry(): Promise<void> {
    if (this.current.status !== 'error') return
    if (this.failedPhase === 'download') await this.download()
    else await this.check(true)
  }

  dismiss(): void {
    if (!this.current.version) return
    this.dismissedVersion = this.current.version
    this.set({})
  }

  restart(): boolean {
    if (this.current.status !== 'ready' || this.current.mode !== 'installed' || this.installing) return false
    this.installing = true
    this.options.backend.quitAndInstall(true, true)
    return true
  }

  installOnQuit(): boolean {
    if (this.current.status !== 'ready' || this.current.mode !== 'installed' || this.installing) return false
    this.installing = true
    this.options.backend.quitAndInstall(true, false)
    return true
  }

  private tick(): void {
    if (this.options.autoCheck()) void this.check(false)
  }

  private now(): number {
    return (this.options.now ?? Date.now)()
  }

  private hasUpdate(): boolean {
    return this.current.version !== null && isNewerVersion(this.current.version, this.current.currentVersion)
  }

  private attach(): void {
    const { backend } = this.options
    backend.on('update-available', (payload) => this.onAvailable(payload as UpdateInfoPayload))
    backend.on('update-not-available', () => this.set({ status: 'idle', version: null, checkedAt: this.now() }))
    backend.on('download-progress', (payload) => {
      const percent = (payload as { percent?: number } | undefined)?.percent
      if (this.current.status === 'downloading' && typeof percent === 'number') {
        this.set({ percent: Math.min(100, Math.max(0, percent)) })
      }
    })
    backend.on('update-downloaded', () => this.set({ status: 'ready', percent: 100, error: null }))
    backend.on('error', (payload) => {
      if (this.current.status === 'checking') this.fail(payload, 'check')
      else if (this.current.status === 'downloading') this.fail(payload, 'download')
    })
  }

  private onAvailable(info: UpdateInfoPayload): void {
    if (!info || typeof info.version !== 'string' || !isNewerVersion(info.version, this.current.currentVersion)) {
      this.set({ status: 'idle', version: null, checkedAt: this.now() })
      return
    }
    if (this.current.status === 'downloading' || this.current.status === 'ready') return
    this.set({
      status: 'available',
      version: info.version,
      releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : null,
      notes: normalizeNotes(info.releaseNotes),
      percent: 0,
      error: null,
      checkedAt: this.now()
    })
  }

  private fail(error: unknown, phase: Phase): void {
    if (this.current.status === 'error') return
    if (phase === 'check' && !this.manualCheck) {
      this.set({ status: this.hasUpdate() ? 'available' : 'idle' })
      return
    }
    this.failedPhase = phase
    this.set({ status: 'error', error: errorText(error), checkedAt: this.now() })
  }

  private set(change: Partial<UpdateState>): void {
    const next = { ...this.current, ...change }
    const dismissed =
      next.version !== null && this.dismissedVersion !== null && compareVersions(next.version, this.dismissedVersion) <= 0
    this.current = { ...next, dismissed }
    this.options.onChange(this.current)
  }
}
