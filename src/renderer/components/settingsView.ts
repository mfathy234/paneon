import {
  disableBridge,
  enableBridge,
  openDataFolder,
  openOnboarding,
  openUpdateLink,
  openWhatsNew,
  runUpdateAction,
  setAutoUpdateCheck,
  setFullAccess,
  setPaletteShortcut,
  setSessionInfo,
  setSidebarCollapsed,
  showSettingsSection,
  showView
} from '../actions'
import { AGENTS, AGENT_NAMES, FULL_ACCESS_FLAGS } from '../../shared/agents'
import { compareVersions } from '../../shared/version'
import { DEFAULT_PALETTE_SHORTCUT } from '../../shared/settingsSchema'
import { formatShortcut, parseShortcut } from '../../shared/shortcuts'
import { updateStatusLine } from '../../shared/updates'
import { h } from '../dom'
import { CHANGELOG_ENTRIES } from '../changelog'
import { store, type AppState, type SettingsSection } from '../state'
import { entryBlock } from './whatsNew'

const SECTIONS: { id: SettingsSection; label: string; lede: string }[] = [
  { id: 'general', label: 'General', lede: 'Keyboard shortcut, sidebar and setup.' },
  { id: 'notifications', label: 'Notifications & session info', lede: 'What Paneon shows and tells you while sessions run.' },
  { id: 'agents', label: 'Agents', lede: 'How new sessions start for each agent.' },
  { id: 'updates', label: 'Updates', lede: 'Keep Paneon current.' },
  { id: 'changelog', label: 'Changelog', lede: 'Every released version, newest first.' },
  { id: 'about', label: 'About', lede: 'Version, links and where your data lives.' }
]

const REPO_URL = 'https://github.com/mfathy234/paneon'
const LINKS = [
  { id: 'settings-link-repo', label: 'GitHub repository', url: REPO_URL },
  { id: 'settings-link-releases', label: 'Releases', url: `${REPO_URL}/releases` },
  { id: 'settings-link-license', label: 'License (MIT)', url: `${REPO_URL}/blob/main/LICENSE` }
]

function row(title: string, control: HTMLElement | null, ...notes: (HTMLElement | null)[]): HTMLElement {
  return h(
    'div',
    { class: 'set-row' },
    h('div', { class: 'set-main' }, h('div', { class: 'set-name' }, title), ...notes),
    control ? h('div', { class: 'set-control' }, control) : null
  )
}

function checkbox(id: string, label: string, checked: boolean, disabled: boolean, onChange: (value: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', id, disabled })
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  return h('label', { class: 'check', for: id }, input, label)
}

export class SettingsViewComponent {
  readonly el = h('main', { class: 'settings-view', 'aria-label': 'Settings' })
  private readonly nav = h('div', { class: 'settings-nav', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Settings sections' })
  private readonly panel = h('div', { class: 'settings-panel', role: 'tabpanel' })
  private readonly title = h('h2', { class: 'settings-section-title' })
  private readonly lede = h('p', { class: 'lede' })
  private signature = ''
  private navSection: SettingsSection | null = null
  private shortcutDraft: string | null = null
  private shortcutError: string | null = null

  constructor() {
    this.nav.addEventListener('keydown', (event) => this.onNavKey(event))
    this.panel.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]')
      if (!link) return
      event.preventDefault()
      openUpdateLink(link.href)
    })
    this.el.append(
      h('div', { class: 'settings-head' }, h('h1', {}, 'Settings'), h('p', { class: 'lede' }, 'Preferences for Paneon. Theme and background image stay in the Theme menu.')),
      h('div', { class: 'settings-body' }, this.nav, h('div', { class: 'settings-content' }, this.title, this.lede, this.panel))
    )
  }

  update(state: AppState, force = false): void {
    if (!force && this.editingShortcut()) return
    const signature = JSON.stringify([
      state.settingsSection,
      state.settings.paletteShortcut,
      state.settings.sidebarCollapsed,
      state.settings.fullAccess,
      state.settings.sessionInfo,
      state.settings.autoUpdateCheck,
      state.bridge,
      state.update,
      state.info.version,
      state.info.userData,
      this.shortcutError,
      Math.floor(Date.now() / 60_000)
    ])
    if (signature === this.signature) return
    this.signature = signature
    this.render(state)
  }

  private refresh(): void {
    this.signature = ''
    this.update(store.state, true)
  }

  private editingShortcut(): boolean {
    const active = document.activeElement
    return active instanceof HTMLElement && active.id === 'palette-shortcut' && this.el.contains(active)
  }

  private render(state: AppState): void {
    const focusedId = (document.activeElement as HTMLElement | null)?.id
    const section = SECTIONS.find((s) => s.id === state.settingsSection) ?? SECTIONS[0]
    if (this.navSection !== section.id) {
      this.navSection = section.id
      this.nav.replaceChildren(...SECTIONS.map((s) => this.tab(s, s.id === section.id)))
    }
    this.title.textContent = section.label
    this.lede.textContent = section.lede
    this.panel.setAttribute('aria-labelledby', `settings-tab-${section.id}`)
    this.panel.replaceChildren(...this.body(section.id, state))
    if (focusedId && this.el.contains(document.activeElement) === false) document.getElementById(focusedId)?.focus()
  }

  private tab(section: (typeof SECTIONS)[number], selected: boolean): HTMLElement {
    return h(
      'button',
      {
        class: `settings-tab${selected ? ' selected' : ''}`,
        type: 'button',
        role: 'tab',
        id: `settings-tab-${section.id}`,
        'aria-selected': String(selected),
        tabindex: selected ? 0 : -1,
        onClick: () => showSettingsSection(section.id)
      },
      section.label
    )
  }

  private onNavKey(event: KeyboardEvent): void {
    const index = SECTIONS.findIndex((s) => s.id === store.state.settingsSection)
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? SECTIONS.length - 1 : (index + step + SECTIONS.length) % SECTIONS.length
    if (step === 0 && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    showSettingsSection(SECTIONS[target].id)
    requestAnimationFrame(() => document.getElementById(`settings-tab-${SECTIONS[target].id}`)?.focus())
  }

  private body(section: SettingsSection, state: AppState): HTMLElement[] {
    switch (section) {
      case 'general':
        return this.general(state)
      case 'notifications':
        return this.notifications(state)
      case 'agents':
        return this.agents(state)
      case 'updates':
        return this.updates(state)
      case 'changelog':
        return this.changelog(state)
      default:
        return this.about(state)
    }
  }

  private general(state: AppState): HTMLElement[] {
    const draft = this.shortcutDraft ?? state.settings.paletteShortcut
    const input = h('input', {
      class: `text-input mono${this.shortcutError ? ' invalid' : ''}`,
      type: 'text',
      id: 'palette-shortcut',
      value: draft,
      'aria-label': 'Command palette shortcut',
      'aria-invalid': String(this.shortcutError !== null),
      'aria-describedby': 'palette-shortcut-error',
      spellcheck: 'false'
    })
    input.addEventListener('input', () => {
      this.shortcutDraft = input.value
      if (this.shortcutError) {
        this.shortcutError = null
        input.classList.remove('invalid')
        document.getElementById('palette-shortcut-error')?.remove()
      }
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.commitShortcut(input.value)
      }
    })
    input.addEventListener('blur', () => {
      if (this.shortcutDraft !== null) this.commitShortcut(input.value)
    })
    const reset = h(
      'button',
      {
        class: 'btn ghost small',
        type: 'button',
        id: 'palette-shortcut-reset',
        disabled: state.settings.paletteShortcut === DEFAULT_PALETTE_SHORTCUT && this.shortcutDraft === null,
        onMouseDown: (event: Event) => event.preventDefault(),
        onClick: () => this.resetShortcut()
      },
      'Reset'
    )
    return [
      row(
        'Command palette shortcut',
        h('div', { class: 'set-inline' }, input, reset),
        h('p', { class: 'hint' }, `Ctrl or Alt plus a key, such as ${DEFAULT_PALETTE_SHORTCUT} or Alt+Space. Ctrl+Shift+P always works too.`),
        this.shortcutError ? h('p', { class: 'field-error', id: 'palette-shortcut-error', role: 'alert' }, this.shortcutError) : null
      ),
      row('Sidebar', checkbox('sidebar-collapsed', 'Start with the sidebar collapsed', state.settings.sidebarCollapsed, false, setSidebarCollapsed)),
      row(
        'Getting started',
        h('button', { class: 'btn ghost small', type: 'button', id: 'getting-started', onClick: () => openOnboarding() }, 'Getting started…'),
        h('p', { class: 'hint' }, 'Reopen the setup guide for projects, agents and session info.')
      )
    ]
  }

  private commitShortcut(text: string): void {
    const binding = parseShortcut(text)
    if (!binding) {
      this.shortcutDraft = text
      this.shortcutError = text.trim() === '' ? 'Enter a shortcut.' : `"${text.trim()}" is not a valid shortcut. Use Ctrl or Alt plus a letter, digit, F1–F12 or a named key.`
      this.refresh()
      return
    }
    this.shortcutDraft = null
    this.shortcutError = null
    setPaletteShortcut(formatShortcut(binding))
    this.refresh()
  }

  private resetShortcut(): void {
    this.shortcutDraft = null
    this.shortcutError = null
    setPaletteShortcut(DEFAULT_PALETTE_SHORTCUT)
    this.refresh()
  }

  private notifications(state: AppState): HTMLElement[] {
    const { bridge, settings } = state
    const info = settings.sessionInfo
    const toggleBridge = (on: boolean): void => {
      void (on ? enableBridge() : disableBridge()).finally(() => this.refresh())
    }
    return [
      row(
        'Session info',
        checkbox('bridge-toggle', 'Show live session info', bridge.installed, bridge.busy, toggleBridge),
        h('p', { class: 'hint' }, 'Adds a status line to ~/.claude/settings.json after you confirm. Turning it off restores the old one.'),
        bridge.error ? h('p', { class: 'note error set-note', id: 'bridge-error', role: 'alert' }, bridge.error) : null,
        bridge.note ? h('p', { class: 'note set-note', id: 'bridge-note' }, bridge.note) : null
      ),
      row(
        'Notifications',
        h(
          'div',
          { class: 'set-stack' },
          checkbox('notify-toggle', 'Notify when a session is done or needs you', info.notifications, false, (value) =>
            setSessionInfo({ notifications: value })
          ),
          checkbox('sound-toggle', 'Play a sound with notifications', info.sound, !info.notifications, (value) => setSessionInfo({ sound: value }))
        )
      )
    ]
  }

  private agents(state: AppState): HTMLElement[] {
    const rows = AGENTS.map((agent) =>
      row(
        AGENT_NAMES[agent],
        checkbox(`settings-full-access-${agent}`, 'Start with full access', state.settings.fullAccess[agent], false, (value) => setFullAccess(agent, value)),
        h('p', { class: 'hint' }, `Runs without approval prompts (${FULL_ACCESS_FLAGS[agent]}). Applies to new sessions.`)
      )
    )
    const manage = row(
      'Installs',
      h('button', { class: 'btn ghost small', type: 'button', id: 'settings-manage-agents', onClick: () => showView('agents') }, 'Manage installs in Agents'),
      h('p', { class: 'hint' }, 'Install or update the command-line agents.')
    )
    return [...rows, manage]
  }

  private updates(state: AppState): HTMLElement[] {
    const { update, settings, info } = state
    const busy = update.status === 'checking' || update.status === 'downloading' || update.mode === 'dev'
    return [
      row('Current version', h('span', { class: 'set-value mono', id: 'settings-version' }, info.version || 'unknown')),
      row('Automatic checks', checkbox('auto-update-toggle', 'Check for updates automatically', settings.autoUpdateCheck, false, setAutoUpdateCheck)),
      row(
        'Status',
        h('button', { class: 'btn ghost small', type: 'button', id: 'check-now', disabled: busy, onClick: () => void runUpdateAction('check') }, 'Check now'),
        h('p', { class: 'hint', id: 'update-status' }, updateStatusLine(update, Date.now()))
      )
    ]
  }

  private changelog(state: AppState): HTMLElement[] {
    const entries = [...CHANGELOG_ENTRIES].sort((a, b) => compareVersions(b.version, a.version))
    const current = state.info.version
    const toolbar = row(
      "What's new",
      h('button', { class: 'btn ghost small', type: 'button', id: 'whats-new', onClick: () => openWhatsNew() }, "Show what's new"),
      h('p', { class: 'hint' }, 'The release notes dialog for this version.')
    )
    const list = h(
      'div',
      { class: 'cl-list', id: 'changelog-list' },
      ...entries.map((entry) => {
        const block = entryBlock(entry)
        block.classList.add('cl-entry')
        if (entry.version === current) {
          block.classList.add('current')
          block.querySelector('h3')?.append(h('span', { class: 'cl-current' }, 'current'))
        }
        return block
      })
    )
    return [toolbar, entries.length === 0 ? h('p', { class: 'tool-empty' }, 'No changelog available.') : list]
  }

  private about(state: AppState): HTMLElement[] {
    const { version, userData } = state.info
    const sep = userData.includes('\\') ? '\\' : '/'
    const path = (label: string, value: string, id: string): HTMLElement =>
      row(label, null, h('code', { class: 'set-path', id }, value || 'unknown'))
    return [
      row('Paneon', h('span', { class: 'set-value mono', id: 'about-version' }, version || 'unknown')),
      row(
        'Links',
        h(
          'div',
          { class: 'set-links' },
          ...LINKS.map((link) =>
            h('button', { class: 'tool-link', type: 'button', id: link.id, onClick: () => openUpdateLink(link.url) }, link.label)
          )
        )
      ),
      row(
        'Data folder',
        h('button', { class: 'btn ghost small', type: 'button', id: 'open-data-folder', disabled: !userData, onClick: () => openDataFolder() }, 'Open data folder'),
        h('code', { class: 'set-path', id: 'about-user-data' }, userData || 'unknown')
      ),
      path('Settings file', userData ? `${userData}${sep}settings.json` : '', 'about-settings-file'),
      path('Usage history', userData ? `${userData}${sep}usage-history.json` : '', 'about-usage-file')
    ]
  }
}
