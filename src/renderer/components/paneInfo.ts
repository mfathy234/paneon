import { formatChanges } from '../../shared/gitChanges'
import { formatAge, formatCost, formatPercent, gauge, gaugeStage } from '../../shared/statusLine'
import { formatTokens } from '../../shared/usage'
import { modelLetter } from '../../shared/opsFeed'
import { contextLevel } from '../../shared/contextWarning'
import type { PaneInfo } from '../derive'
import { h, icon } from '../dom'
import { ICONS } from '../icons'

export interface StripHandlers {
  title: string
  onToggleAgents(): void
  onOpenChanges(): void
}

function opsItems(info: PaneInfo, handlers: StripHandlers): HTMLElement[] {
  const ops = info.ops
  if (!ops) return []
  const items: HTMLElement[] = []
  if (ops.plan) items.push(h('span', { class: 'info-plan', title: 'Plan progress' }, `▸ ${ops.plan.done}/${ops.plan.total}`))
  if (ops.running.length > 0) {
    items.push(h('span', { class: 'info-running', title: 'Running agents' }, `${ops.running.length} running`))
    items.push(
      h(
        'span',
        { class: 'info-letters', title: 'Models of the running agents' },
        ...ops.running.map((family) => h('span', { class: `agent-letter fam-${family}` }, modelLetter(family)))
      )
    )
  }
  items.push(h('span', { class: 'spacer' }))
  const label = `${ops.agentsOpen ? 'Hide' : 'Show'} agents of ${handlers.title}`
  items.push(
    h(
      'button',
      {
        class: `agents-toggle${ops.agentsOpen ? ' open' : ''}`,
        type: 'button',
        'aria-label': label,
        'aria-expanded': ops.agentsOpen ? 'true' : 'false',
        title: label,
        onClick: handlers.onToggleAgents
      },
      'agents',
      icon(ops.agentsOpen ? ICONS.chevronUp : ICONS.chevronDown)
    )
  )
  return items
}

export function paneInfoStrip(info: PaneInfo, handlers: StripHandlers): HTMLElement[] {
  const items: HTMLElement[] = []
  if (info.model) {
    items.push(h('span', { class: `info-model fam-${info.model.family}`, title: 'Model' }, info.model.label))
  }
  if (info.contextPercent !== null) {
    items.push(
      h(
        'span',
        { class: `info-gauge stage-${gaugeStage(info.contextPercent)} ctx-${contextLevel(info.contextPercent)}`, title: 'Context window used' },
        `${gauge(info.contextPercent)} ${formatPercent(info.contextPercent)}`
      )
    )
  }
  if (info.elapsed !== null) items.push(h('span', { class: 'info-elapsed', title: 'Session time' }, info.elapsed))
  if (info.tokens !== null) items.push(h('span', { class: 'info-tokens', title: 'Session tokens' }, `${formatTokens(info.tokens)} tokens`))
  if (info.costUsd !== null) items.push(h('span', { class: 'info-cost', title: 'Session cost' }, formatCost(info.costUsd)))
  if (info.changes) {
    const content =
      info.changes.files === 0
        ? [formatChanges(info.changes)]
        : [
            h('span', { class: 'add' }, `+${info.changes.added}`),
            ' ',
            h('span', { class: 'del' }, `−${info.changes.removed}`),
            ` · ${info.changes.files} file${info.changes.files === 1 ? '' : 's'}`
          ]
    items.push(
      h(
        'button',
        {
          class: 'info-changes',
          type: 'button',
          title: 'Review and commit changes',
          'aria-label': 'Review and commit changes',
          onClick: handlers.onOpenChanges
        },
        ...content
      )
    )
  }
  if (info.ageMs !== null) items.push(h('span', { class: 'info-age', title: 'Last activity' }, `${formatAge(info.ageMs)} ago`))
  return [...items, ...opsItems(info, handlers)]
}
