import { derivePanes } from '../derive'
import { h } from '../dom'
import type { AppState } from '../state'
import { AgentsViewComponent } from './agentsView'
import { GridComponent } from './grid'
import { ProjectsViewComponent } from './projectsView'
import { QuickPickComponent } from './quickpick'
import { SidebarComponent } from './sidebar'
import { ThemePickerComponent } from './themePicker'
import { TopBarComponent } from './topbar'

export class AppShell {
  readonly el: HTMLElement
  private readonly topbar = new TopBarComponent()
  private readonly sidebar = new SidebarComponent()
  private readonly grid = new GridComponent()
  private readonly projects = new ProjectsViewComponent()
  private readonly agents = new AgentsViewComponent()
  private readonly quickPick = new QuickPickComponent(() => this.topbar.newSession)
  private readonly themePicker = new ThemePickerComponent(() => this.topbar.themeButton)
  private lastView: AppState['view'] = 'grid'

  constructor() {
    const main = h('div', { class: 'main' }, this.grid.el, this.projects.el, this.agents.el)
    this.el = h('div', { class: 'app' }, this.topbar.el, h('div', { class: 'body' }, this.sidebar.el, main))
  }

  render(state: AppState): void {
    const views = derivePanes(state)
    this.topbar.update(state, views)
    this.sidebar.update(state, views)
    this.grid.el.hidden = state.view !== 'grid'
    this.projects.el.hidden = state.view !== 'projects'
    if (state.view === 'projects' && this.lastView !== 'projects') this.projects.show(state)
    else if (state.view === 'projects') this.projects.update(state)
    this.agents.el.hidden = state.view !== 'agents'
    if (state.view === 'agents') this.agents.update(state)
    this.lastView = state.view
    this.grid.update(state)
    this.quickPick.update(state)
    this.themePicker.update(state)
  }
}
