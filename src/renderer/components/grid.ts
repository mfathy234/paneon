import { focusPane, openQuickPick, showView } from '../actions'
import { derivePanes, type PaneView } from '../derive'
import { clear, h } from '../dom'
import { layoutForCount } from '../../shared/layout'
import type { AppState } from '../state'
import { getTerminal } from '../terminals'
import { PaneComponent } from './pane'

const MIN_ROW_HEIGHT = '340px'

export class GridComponent {
  readonly el: HTMLElement
  private readonly panes = new Map<string, PaneComponent>()
  private readonly grid = h('div', { class: 'grid' })
  private readonly strip = h('div', { class: 'pane-strip', role: 'tablist', 'aria-label': 'Panes' })
  private readonly empty = h('div', { class: 'empty' })
  private readonly bg = h('div', { class: 'bg-layer', 'aria-hidden': 'true' })
  private lastFocused: string | null = null
  private stripSignature = ''

  constructor() {
    this.el = h('div', { class: 'grid-area' }, this.bg, this.strip, this.grid, this.empty)
  }

  update(state: AppState): void {
    const views = derivePanes(state)
    this.syncPanes(views)
    const maximized = state.maximizedId !== null && views.some((v) => v.pane.id === state.maximizedId)
    this.layout(views, maximized ? state.maximizedId : null)
    for (const view of views) {
      const isMax = maximized && view.pane.id === state.maximizedId
      this.panes.get(view.pane.id)?.update(view, view.pane.id === state.focusedId, isMax)
    }
    this.updateStrip(views, state, maximized)
    this.updateEmpty(state, views.length)
    this.restoreFocus(state)
  }

  private syncPanes(views: PaneView[]): void {
    const ids = new Set(views.map((v) => v.pane.id))
    for (const [id, component] of this.panes) {
      if (!ids.has(id)) {
        component.dispose()
        this.panes.delete(id)
      }
    }
    views.forEach((view, position) => {
      let component = this.panes.get(view.pane.id)
      if (!component) {
        component = new PaneComponent(view.pane.id)
        this.panes.set(view.pane.id, component)
      }
      if (this.grid.children[position] !== component.el) this.grid.insertBefore(component.el, this.grid.children[position] ?? null)
    })
  }

  private layout(views: PaneView[], maximizedId: string | null): void {
    const style = this.grid.style
    this.grid.classList.toggle('maximized', maximizedId !== null)
    this.el.classList.toggle('focus-view', maximizedId !== null)
    if (maximizedId !== null) {
      style.gridTemplateColumns = 'minmax(0, 1fr)'
      style.gridTemplateRows = 'minmax(0, 1fr)'
      this.grid.classList.remove('scrolls')
      views.forEach((view) => {
        const component = this.panes.get(view.pane.id)
        if (!component) return
        component.el.hidden = view.pane.id !== maximizedId
        component.el.style.gridColumn = '1'
        component.el.style.gridRow = '1'
      })
      return
    }
    const layout = layoutForCount(views.length)
    style.gridTemplateColumns = `repeat(${layout.cols}, minmax(0, 1fr))`
    style.gridTemplateRows = layout.scrolls
      ? `repeat(${layout.rows}, minmax(${MIN_ROW_HEIGHT}, 1fr))`
      : `repeat(${layout.rows}, minmax(0, 1fr))`
    this.grid.classList.toggle('scrolls', layout.scrolls)
    views.forEach((view, index) => {
      const component = this.panes.get(view.pane.id)
      const cell = layout.cells[index]
      if (!component || !cell) return
      component.el.hidden = false
      component.el.style.gridColumn = `${cell.col} / span ${cell.colSpan}`
      component.el.style.gridRow = String(cell.row)
    })
  }

  private updateStrip(views: PaneView[], state: AppState, maximized: boolean): void {
    this.strip.hidden = !maximized
    if (!maximized) return
    const signature = JSON.stringify([views.map((v) => [v.pane.id, v.title, v.status]), state.focusedId])
    if (signature === this.stripSignature) return
    this.stripSignature = signature
    clear(this.strip)
    for (const view of views) {
      const selected = view.pane.id === state.maximizedId
      const label = h('span', { class: 'strip-status' }, ` · ${view.status}`)
      label.classList.add(view.status)
      this.strip.append(
        h(
          'button',
          {
            class: `strip-tab${selected ? ' selected' : ''}`,
            type: 'button',
            role: 'tab',
            'aria-selected': selected ? 'true' : 'false',
            onClick: () => focusPane(view.pane.id)
          },
          `${view.index + 1} ${view.title.toUpperCase()}`,
          label
        )
      )
    }
    this.strip.append(
      h('span', { class: 'spacer' }),
      h('span', { class: 'strip-hint' }, 'Esc  back to grid · Ctrl+Alt+← → switch')
    )
  }

  private updateEmpty(state: AppState, count: number): void {
    this.empty.hidden = count > 0
    if (count > 0) return
    clear(this.empty)
    const hasProjects = state.settings.projects.length > 0
    this.empty.append(
      h('h2', {}, hasProjects ? 'No sessions yet' : 'Add a project to get started'),
      h(
        'p',
        {},
        hasProjects
          ? 'Press Ctrl+N or pick a project in the sidebar. Claude starts in its folder right away.'
          : 'A project is a name and a folder. Starting a session opens Claude in that folder.'
      ),
      hasProjects
        ? h('button', { class: 'btn primary', type: 'button', onClick: () => openQuickPick() }, 'New session')
        : h('button', { class: 'btn primary', type: 'button', onClick: () => showView('projects') }, 'Add a project')
    )
  }

  private restoreFocus(state: AppState): void {
    if (state.focusedId === this.lastFocused) return
    this.lastFocused = state.focusedId
    const pane = state.panes.find((p) => p.id === state.focusedId)
    if (!pane || state.view !== 'grid' || state.quickPickOpen || document.querySelector('.overlay')) return
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      if (!active.classList.contains('xterm-helper-textarea')) return
    }
    getTerminal(pane.activeTabId)?.focus()
  }
}
