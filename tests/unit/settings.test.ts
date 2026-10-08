import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultSettings, migrateSettings } from '../../src/shared/settingsSchema'
import { SettingsStore } from '../../src/main/settingsStore'

const tempFile = (): string => join(mkdtempSync(join(tmpdir(), 'cg-settings-')), 'settings.json')

describe('migrateSettings', () => {
  it('returns defaults for junk input', () => {
    expect(migrateSettings(null)).toEqual(defaultSettings())
    expect(migrateSettings('x')).toEqual(defaultSettings())
    expect(migrateSettings([])).toEqual(defaultSettings())
  })

  it('migrates a v1 file without ids, theme or workspace', () => {
    const result = migrateSettings({
      version: 1,
      projects: [{ name: 'acme-web', path: 'C:\\Work\\acme-web' }, { folder: 'C:\\Work\\Hr\\' }]
    })
    expect(result.version).toBe(2)
    expect(result.projects).toHaveLength(2)
    expect(result.projects[0]).toMatchObject({ name: 'acme-web', folder: 'C:\\Work\\acme-web' })
    expect(result.projects[0].id).toBeTruthy()
    expect(result.projects[1].name).toBe('Hr')
    expect(result.projects[0].id).not.toBe(result.projects[1].id)
    expect(result.theme.id).toBe('grid-dark')
    expect(result.theme.image.enabled).toBe(false)
  })

  it('drops projects without a folder and clamps values', () => {
    const result = migrateSettings({
      projects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', folder: 'C:\\b', fontSize: 99 }],
      theme: { id: 'nord', image: { enabled: true, path: 'C:\\img.png', dim: 400, blur: -3 } }
    })
    expect(result.projects).toEqual([{ id: 'b', name: 'B', folder: 'C:\\b', defaultAgent: 'claude', fontSize: 28 }])
    expect(result.theme.image).toEqual({ enabled: true, path: 'C:\\img.png', dim: 90, blur: 0 })
  })

  it('disables the image when no path is stored', () => {
    const result = migrateSettings({ theme: { id: 'nord', image: { enabled: true, path: null } } })
    expect(result.theme.image.enabled).toBe(false)
  })

  it('keeps only workspace panes whose project still exists', () => {
    const result = migrateSettings({
      projects: [{ id: 'p', name: 'P', folder: 'C:\\p' }],
      workspace: {
        focusedIndex: 5,
        panes: [
          { projectId: 'p', tabs: [{ kind: 'claude', label: 'claude' }, { kind: 'shell', label: 'shell' }], activeIndex: 1, fontSize: 18 },
          { projectId: 'gone', tabs: [{ kind: 'claude', label: 'claude' }], activeIndex: 0, fontSize: 15 },
          { projectId: 'p', tabs: [], activeIndex: 0, fontSize: 15 }
        ]
      }
    })
    expect(result.workspace.panes).toHaveLength(1)
    expect(result.workspace.panes[0].activeIndex).toBe(1)
    expect(result.workspace.focusedIndex).toBe(0)
  })
})

describe('agent settings migration', () => {
  it('defaults a missing or invalid defaultAgent to claude and keeps codex and gemini', () => {
    const result = migrateSettings({
      projects: [
        { id: 'a', name: 'A', folder: 'C:\\a' },
        { id: 'b', name: 'B', folder: 'C:\\b', defaultAgent: 'codex' },
        { id: 'c', name: 'C', folder: 'C:\\c', defaultAgent: 'gemini' },
        { id: 'd', name: 'D', folder: 'C:\\d', defaultAgent: 'bard' }
      ]
    })
    expect(result.projects.map((p) => p.defaultAgent)).toEqual(['claude', 'codex', 'gemini', 'claude'])
  })

  it('reads legacy tab kind as agent and keeps a session id only for codex tabs', () => {
    const result = migrateSettings({
      projects: [{ id: 'p', name: 'P', folder: 'C:\\p' }],
      workspace: {
        focusedIndex: 0,
        panes: [
          {
            projectId: 'p',
            activeIndex: 0,
            fontSize: 15,
            tabs: [
              { kind: 'claude', label: 'claude', sessionId: 'abc-resumed' },
              { agent: 'codex', label: 'codex', sessionId: '019aaaaa-0000-7000-8000-000000000001' },
              { agent: 'codex', label: 'codex 2' },
              { agent: 'gemini', label: 'gemini', sessionId: '11111111-2222-4333-8444-555555555555' },
              { kind: 'shell', label: 'shell' }
            ]
          }
        ]
      }
    })
    expect(result.workspace.panes[0].tabs).toEqual([
      { agent: 'claude', label: 'claude', sessionId: 'abc-resumed' },
      { agent: 'codex', label: 'codex', sessionId: '019aaaaa-0000-7000-8000-000000000001' },
      { agent: 'codex', label: 'codex 2' },
      { agent: 'gemini', label: 'gemini', sessionId: '11111111-2222-4333-8444-555555555555' },
      { agent: 'shell', label: 'shell' }
    ])
  })
})

describe('SettingsStore', () => {
  it('starts with defaults when the file is missing', () => {
    const store = new SettingsStore(tempFile())
    const { settings, warning } = store.load()
    expect(settings).toEqual(defaultSettings())
    expect(warning).toBeNull()
  })

  it('saves, reloads and merges patches', () => {
    const file = tempFile()
    const store = new SettingsStore(file)
    store.load()
    store.update({ projects: [{ id: 'p1', name: 'One', folder: 'C:\\one', defaultAgent: 'codex' }] })
    store.update({ sidebarCollapsed: true })
    const reloaded = new SettingsStore(file).load().settings
    expect(reloaded.projects).toEqual([{ id: 'p1', name: 'One', folder: 'C:\\one', defaultAgent: 'codex' }])
    expect(reloaded.sidebarCollapsed).toBe(true)
    expect(JSON.parse(readFileSync(file, 'utf8')).version).toBe(2)
  })

  it('keeps a corrupt file as a backup and reports a warning', () => {
    const file = tempFile()
    writeFileSync(file, '{ not json', 'utf8')
    const { settings, warning } = new SettingsStore(file).load()
    expect(settings).toEqual(defaultSettings())
    expect(warning).toContain('reset')
    const dir = file.replace(/[\\/][^\\/]+$/, '')
    expect(readdirSync(dir).some((name) => name.includes('.corrupt-'))).toBe(true)
  })
})

describe('sessionInfo settings', () => {
  it('defaults notifications on and sound off, and keeps stored booleans', () => {
    expect(migrateSettings({}).sessionInfo).toEqual({ notifications: true, sound: false })
    expect(migrateSettings({ sessionInfo: { notifications: false, sound: true } }).sessionInfo).toEqual({
      notifications: false,
      sound: true
    })
    expect(migrateSettings({ sessionInfo: { notifications: 'yes' } }).sessionInfo.notifications).toBe(true)
  })
})
