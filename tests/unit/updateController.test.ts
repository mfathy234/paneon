import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateController, type BackendEvent, type UpdaterBackend } from '../../src/main/updateController'
import type { UpdateMode, UpdateState } from '../../src/shared/updates'

class FakeBackend implements UpdaterBackend {
  listeners = new Map<BackendEvent, Array<(payload?: unknown) => void>>()
  checks = 0
  downloads = 0
  installs: Array<[boolean, boolean]> = []
  onCheck: () => Promise<void> = async () => this.emit('update-not-available')
  onDownload: () => Promise<void> = async () => this.emit('update-downloaded', {})

  on(event: BackendEvent, listener: (payload?: unknown) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
  }

  emit(event: BackendEvent, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload)
  }

  async checkForUpdates(): Promise<void> {
    this.checks += 1
    await this.onCheck()
  }

  async downloadUpdate(): Promise<void> {
    this.downloads += 1
    await this.onDownload()
  }

  quitAndInstall(silent: boolean, forceRunAfter: boolean): void {
    this.installs.push([silent, forceRunAfter])
  }
}

function setup(mode: UpdateMode = 'installed', autoCheck = true) {
  const backend = new FakeBackend()
  const states: UpdateState[] = []
  const auto = { value: autoCheck }
  const controller = new UpdateController({
    backend,
    mode,
    currentVersion: '0.4.0',
    autoCheck: () => auto.value,
    onChange: (state) => states.push(state),
    now: () => 1_000,
    startDelayMs: 10_000,
    intervalMs: 60_000
  })
  return { backend, controller, states, auto }
}

const availableInfo = { version: '0.5.0', releaseDate: '2026-11-01T10:00:00.000Z', releaseNotes: '### Added\n- Thing' }

describe('UpdateController', () => {
  it('finds nothing when the latest release is not newer', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', { version: '0.4.0' })
    await controller.check(true)
    expect(controller.state.status).toBe('idle')
    expect(controller.state.version).toBeNull()
    expect(controller.state.checkedAt).toBe(1_000)
  })

  it('goes available with the version, date and notes', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    expect(controller.state).toMatchObject({ status: 'available', version: '0.5.0', releaseDate: availableInfo.releaseDate, notes: '### Added\n- Thing' })
  })

  it('walks available, downloading with progress, ready, then installs on restart', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    backend.onDownload = async () => {
      backend.emit('download-progress', { percent: 42 })
      expect(controller.state).toMatchObject({ status: 'downloading', percent: 42 })
      backend.emit('update-downloaded', availableInfo)
    }
    await controller.download()
    expect(controller.state).toMatchObject({ status: 'ready', percent: 100 })
    expect(controller.restart()).toBe(true)
    expect(backend.installs).toEqual([[true, true]])
    expect(controller.restart()).toBe(false)
    expect(controller.installOnQuit()).toBe(false)
  })

  it('installs on quit with a silent, no-relaunch install exactly once', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    expect(controller.installOnQuit()).toBe(false)
    await controller.download()
    expect(controller.installOnQuit()).toBe(true)
    expect(controller.installOnQuit()).toBe(false)
    expect(backend.installs).toEqual([[true, false]])
  })

  it('never downloads in the portable or development builds', async () => {
    for (const mode of ['portable', 'dev'] as const) {
      const { controller, backend } = setup(mode)
      backend.onCheck = async () => backend.emit('update-available', availableInfo)
      await controller.check(true)
      await controller.download()
      expect(backend.downloads).toBe(0)
      expect(controller.restart()).toBe(false)
    }
  })

  it('reports an available update in the portable build and does not check at all in development', async () => {
    const portable = setup('portable')
    portable.backend.onCheck = async () => portable.backend.emit('update-available', availableInfo)
    await portable.controller.check(true)
    expect(portable.controller.state.status).toBe('available')
    const dev = setup('dev')
    await dev.controller.check(true)
    expect(dev.backend.checks).toBe(0)
    expect(dev.controller.state.status).toBe('idle')
  })

  it('shows a failed manual check and retries it', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => {
      backend.emit('error', new Error('offline\nstack line'))
      throw new Error('offline')
    }
    await controller.check(true)
    expect(controller.state).toMatchObject({ status: 'error', error: 'offline' })
    backend.onCheck = async () => backend.emit('update-not-available')
    await controller.retry()
    expect(controller.state.status).toBe('idle')
    expect(backend.checks).toBe(2)
  })

  it('stays quiet when an automatic check fails', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => {
      throw new Error('offline')
    }
    await controller.check(false)
    expect(controller.state.status).toBe('idle')
    expect(controller.state.error).toBeNull()
  })

  it('fails a download and retries by downloading again', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    backend.onDownload = async () => {
      backend.emit('error', new Error('disk full'))
      throw new Error('disk full')
    }
    await controller.download()
    expect(controller.state).toMatchObject({ status: 'error', error: 'disk full' })
    backend.onDownload = async () => backend.emit('update-downloaded', availableInfo)
    await controller.retry()
    expect(backend.downloads).toBe(2)
    expect(controller.state.status).toBe('ready')
  })

  it('hides after Later until a newer version than the dismissed one appears', async () => {
    const { controller, backend } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    controller.dismiss()
    expect(controller.state.dismissed).toBe(true)
    await controller.check(false)
    expect(controller.state.dismissed).toBe(true)
    backend.onCheck = async () => backend.emit('update-available', { ...availableInfo, version: '0.5.1' })
    await controller.check(false)
    expect(controller.state).toMatchObject({ version: '0.5.1', dismissed: false })
  })

  it('keeps showing an available update while a later check runs', async () => {
    const { controller, backend, states } = setup()
    backend.onCheck = async () => backend.emit('update-available', availableInfo)
    await controller.check(true)
    const before = states.length
    await controller.check(false)
    expect(states.slice(before).every((s) => s.status === 'available')).toBe(true)
  })

  it('ignores a second check while one is running', async () => {
    const { controller, backend } = setup()
    let release: () => void = () => undefined
    backend.onCheck = () => new Promise<void>((resolve) => (release = resolve))
    const first = controller.check(true)
    await controller.check(true)
    expect(backend.checks).toBe(1)
    release()
    await first
    expect(controller.state.status).toBe('idle')
  })

  describe('scheduling', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('checks after the start delay and then every interval', async () => {
      const { controller, backend } = setup()
      controller.start()
      await vi.advanceTimersByTimeAsync(9_999)
      expect(backend.checks).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      expect(backend.checks).toBe(1)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(backend.checks).toBe(2)
      controller.stop()
      await vi.advanceTimersByTimeAsync(120_000)
      expect(backend.checks).toBe(2)
    })

    it('skips scheduled checks while automatic checks are off but still allows Check now', async () => {
      const { controller, backend, auto } = setup('installed', false)
      controller.start()
      await vi.advanceTimersByTimeAsync(130_000)
      expect(backend.checks).toBe(0)
      await controller.check(true)
      expect(backend.checks).toBe(1)
      auto.value = true
      await vi.advanceTimersByTimeAsync(60_000)
      expect(backend.checks).toBe(2)
      controller.stop()
    })

    it('does not schedule anything in a development build', async () => {
      const { controller, backend } = setup('dev')
      controller.start()
      await vi.advanceTimersByTimeAsync(200_000)
      expect(backend.checks).toBe(0)
    })
  })
})
