import { refreshAgentTools, runAgentTask, setFullAccess } from '../actions'
import { api } from '../api'
import { AGENTS, FULL_ACCESS_FLAGS } from '../../shared/agents'
import {
  NODE_DOWNLOAD_URL,
  NODE_NOTE,
  TOOL_NAMES,
  nodeProblem,
  sourceLine,
  toolCommand,
  toolState,
  type ToolReport
} from '../../shared/agentTools'
import type { AgentKind } from '../../shared/types'
import { clear, h } from '../dom'
import { agentMark } from './agentMark'
import type { AppState } from '../state'

export class AgentsViewComponent {
  readonly el = h('main', { class: 'agents-view', 'aria-label': 'Agents' })
  private readonly rows = h('div', { class: 'tool-list' })
  private readonly check = h(
    'button',
    { class: 'btn ghost', type: 'button', id: 'agents-check', onClick: () => void refreshAgentTools(true) },
    'Check again'
  )
  private readonly updateAll = h(
    'button',
    { class: 'btn primary', type: 'button', id: 'agents-update-all', onClick: () => void runAgentTask('updates') },
    'Update all'
  )
  private readonly shown = new Set<AgentKind>()
  private signature = ''
  private current: AppState | null = null

  constructor() {
    this.el.append(
      h(
        'div',
        { class: 'agents-head' },
        h(
          'div',
          { class: 'agents-title' },
          h('h1', {}, 'Agents'),
          h('p', { class: 'lede' }, 'Install or update the command-line agents this app runs. Commands run in a visible shell tab.')
        ),
        this.check,
        this.updateAll
      ),
      this.rows
    )
  }

  update(state: AppState): void {
    this.current = state
    const { report, checking } = state.agents
    const signature = JSON.stringify([report, checking, [...this.shown], state.info.shellCommand, state.settings.fullAccess])
    if (signature === this.signature) return
    this.signature = signature
    this.check.disabled = checking
    this.check.textContent = checking ? 'Checking…' : 'Check again'
    this.updateAll.disabled = !report || !report.tools.some((tool) => toolState(tool) === 'update')
    clear(this.rows)
    if (!report) {
      this.rows.append(h('p', { class: 'tool-empty' }, 'Checking installed agents…'))
      return
    }
    for (const agent of AGENTS) {
      const tool = report.tools.find((t) => t.agent === agent)
      if (tool) this.rows.append(this.row(tool, report.node, state.settings.fullAccess[agent]))
    }
  }

  private row(tool: ToolReport, node: NonNullable<AppState['agents']['report']>['node'], fullAccess: boolean): HTMLElement {
    const command = toolCommand(tool)
    const shown = this.shown.has(tool.agent)
    const toggle = h(
      'button',
      {
        class: 'tool-link',
        type: 'button',
        'aria-expanded': String(shown),
        onClick: () => {
          if (this.shown.has(tool.agent)) this.shown.delete(tool.agent)
          else this.shown.add(tool.agent)
          this.signature = ''
          if (this.current) this.update(this.current)
        }
      },
      shown ? 'Hide command' : 'Show command'
    )
    const row = h(
      'div',
      { class: 'tool-block', 'data-agent': tool.agent },
      h(
        'div',
        { class: 'tool-row' },
        agentMark(tool.agent, 'tool-badge'),
        h('div', { class: 'tool-id' }, h('div', { class: 'tool-name' }, TOOL_NAMES[tool.agent]), h('div', { class: 'tool-source' }, sourceLine(tool))),
        this.status(tool),
        toggle,
        this.action(tool, command, node)
      )
    )
    row.append(this.fullAccessToggle(tool.agent, fullAccess))
    if (shown) row.append(h('pre', { class: 'tool-command' }, command.text))
    return row
  }

  private fullAccessToggle(agent: AgentKind, checked: boolean): HTMLElement {
    const id = `full-access-${agent}`
    const input = h('input', { type: 'checkbox', id })
    input.checked = checked
    input.addEventListener('change', () => setFullAccess(agent, input.checked))
    return h(
      'div',
      { class: 'tool-access' },
      h('label', { class: 'check', for: id }, input, 'Start with full access'),
      h('span', { class: 'hint' }, `Runs without approval prompts (${FULL_ACCESS_FLAGS[agent]}). Applies to new sessions.`)
    )
  }

  private status(tool: ToolReport): HTMLElement {
    const state = toolState(tool)
    const parts: (Node | string)[] = []
    parts.push(tool.present ? `Installed ${tool.installed ?? 'version unknown'}` : 'Not installed')
    if (tool.latest !== null) parts.push(` · Latest ${tool.latest} `)
    if (state === 'update') parts.push(h('span', { class: 'tool-flag update' }, 'update available'))
    else if (state === 'current') parts.push(h('span', { class: 'tool-flag current' }, 'up to date'))
    else if (tool.latest === null) parts.push(` · `, h('span', { class: 'tool-flag muted' }, "couldn't check latest"))
    return h('div', { class: 'tool-status', 'data-state': state }, ...parts)
  }

  private action(
    tool: ToolReport,
    command: ReturnType<typeof toolCommand>,
    node: NonNullable<AppState['agents']['report']>['node']
  ): HTMLElement {
    const state = toolState(tool)
    const name = TOOL_NAMES[tool.agent]
    if (state === 'current') {
      return h('button', { class: 'btn ghost', type: 'button', disabled: true, 'aria-disabled': 'true' }, 'Up to date')
    }
    if (command.needsNode && nodeProblem(node)) {
      return h(
        'button',
        { class: 'tool-link node-link', type: 'button', onClick: () => void api.openExternal(NODE_DOWNLOAD_URL) },
        NODE_NOTE
      )
    }
    const label = command.action === 'install' ? 'Install' : 'Update'
    return h(
      'button',
      {
        class: `btn ${state === 'unknown' ? 'ghost' : 'primary'}`,
        type: 'button',
        'aria-label': `${label} ${name}`,
        onClick: () => void runAgentTask([tool.agent])
      },
      label
    )
  }
}
