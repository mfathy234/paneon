import { focusPane, openQuickPick, showView } from '../actions'
import { derivePanes, type PaneView } from '../derive'
import { clear, h } from '../dom'
import { pairOf } from '../../shared/compare'
import { layoutForCount } from '../../shared/layout'
import type { CompareLink } from '../../shared/types'
import type { AppState } from '../state'
import { getTerminal } from '../terminals'
import { ComparePairComponent } from './comparePair'
import { PaneComponent } from './pane'

const MIN_ROW_HEIGHT = '340px'

type Unit =
  | { kind: 'pane'; view: PaneView }
  | { kind: 'pair'; link: CompareLink; a: PaneView; b: PaneView }

function unitsOf(views: PaneView[]): Unit[] {
  const units: Unit[] = []
  const compared = views.map((view) => ({ compare: view.pane.compare, view }))
  for (let index = 0; index < views.length; index += 1) {
    const pair = pairOf(compared, index)
    if (pair) {
      units.push({ kind: 'pair', link: pair.link, a: pair.a.view, b: pair.b.view })
      index += 1
    } else {
      units.push({ kind: 'pane', view: views[index] })
    }
  }
  return units
}

const paneIds = (unit: Unit): string[] => (unit.kind === 'pane' ? [unit.view.pane.id] : [unit.a.pane.id, unit.b.pane.id])

export class GridComponent {
  readonly el: HTMLElement
  private readonly panes = new Map<string, PaneComponent>()
  private readonly pairs = new Map<string, ComparePairComponent>()
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
    const units = unitsOf(views)
    this.syncPanes(views)
    const elements = this.syncUnits(units)
    const maximized = state.maximizedId !== null && views.some((v) => v.pane.id === state.maximizedId)
    this.layout(units, elements, views, maximized ? state.maximizedId : null)
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
    for (const view of views) {
      if (!this.panes.has(view.pane.id)) this.panes.set(view.pane.id, new PaneComponent(view.pane.id))
    }
  }

  private syncUnits(units: Unit[]): HTMLElement[] {
    const live = new Set(units.flatMap((unit) => (unit.kind === 'pair' ? [unit.link.id] : [])))
    for (const [id, pair] of this.pairs) {
      if (!live.has(id)) {
        pair.dispose()
        this.pairs.delete(id)
      }
    }
    const elements = units.map((unit) => this.unitElement(unit))
    elements.forEach((element, position) => {
      if (this.grid.children[position] !== element) this.grid.insertBefore(element, this.grid.children[position] ?? null)
    })
    while (this.grid.children.length > elements.length) this.grid.lastElementChild?.remove()
    return elements
  }

  private unitElement(unit: Unit): HTMLElement {
    if (unit.kind === 'pane') return this.panes.get(unit.view.pane.id)?.el ?? h('div')
    let pair = this.pairs.get(unit.link.id)
    if (!pair) {
      pair = new ComparePairComponent()
      this.pairs.set(unit.link.id, pair)
    }
    pair.update(unit.link, unit.a.project?.name ?? '')
    const first = this.panes.get(unit.a.pane.id)?.el
    const second = this.panes.get(unit.b.pane.id)?.el
    if (first && first.parentElement !== pair.slotA) pair.slotA.append(first)
    if (second && second.parentElement !== pair.slotB) pair.slotB.append(second)
    return pair.el
  }

  private layout(units: Unit[], elements: HTMLElement[], views: PaneView[], maximizedId: string | null): void {
    const style = this.grid.style
    this.grid.classList.toggle('maximized', maximizedId !== null)
    this.el.classList.toggle('focus-view', maximizedId !== null)
    for (const view of views) {
      const component = this.panes.get(view.pane.id)
      if (component) component.el.hidden = maximizedId !== null && view.pane.id !== maximizedId
    }
    if (maximizedId !== null) {
      style.gridTemplateColumns = 'minmax(0, 1fr)'
      style.gridTemplateRows = 'minmax(0, 1fr)'
      this.grid.classList.remove('scrolls')
      units.forEach((unit, index) => {
        const contains = paneIds(unit).includes(maximizedId)
        const element = elements[index]
        element.hidden = !contains
        element.classList.toggle('solo', contains && unit.kind === 'pair')
        element.style.gridColumn = '1'
        element.style.gridRow = '1'
      })
      return
    }
    const layout = layoutForCount(units.length)
    style.gridTemplateColumns = `repeat(${layout.cols}, minmax(0, 1fr))`
    style.gridTemplateRows = layout.scrolls
      ? `repeat(${layout.rows}, minmax(${MIN_ROW_HEIGHT}, 1fr))`
      : `repeat(${layout.rows}, minmax(0, 1fr))`
    this.grid.classList.toggle('scrolls', layout.scrolls)
    elements.forEach((element, index) => {
      const cell = layout.cells[index]
      if (!cell) return
      element.hidden = false
      element.classList.remove('solo')
      element.style.gridColumn = `${cell.col} / span ${cell.colSpan}`
      element.style.gridRow = String(cell.row)
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
