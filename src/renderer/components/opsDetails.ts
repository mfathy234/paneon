import {
  baseName,
  drawerRow,
  formatLeft,
  formatResets,
  latestCheck,
  opsModelLabel,
  verdictTone,
  type OpsCheck,
  type OpsSnapshot
} from '../../shared/opsFeed'
import { formatAge, formatPercent, gaugeParts, gaugeStage } from '../../shared/statusLine'
import type { ModelFamily, RateLimitWindow, StatusInfo } from '../../shared/types'
import type { PaneView } from '../derive'
import { h } from '../dom'

type Child = Node | string | null

const section = (title: string, ...children: Child[]): HTMLElement =>
  h('section', { class: 'details-section' }, h('h3', {}, title), ...children)

const line = (...children: Child[]): HTMLElement => h('div', { class: 'details-line' }, ...children)

const span = (cls: string, text: string): HTMLElement => h('span', { class: cls }, text)

function gaugeSpans(percent: number): HTMLElement[] {
  const parts = gaugeParts(percent)
  return [span(`stage-${gaugeStage(percent)}`, parts.filled), span('gauge-empty', parts.empty)]
}

function planSection(snapshot: OpsSnapshot, now: number): HTMLElement | null {
  const plan = snapshot.plan
  if (!plan && snapshot.agents.length === 0) return null
  const rows = snapshot.agents.map((agent) => {
    const row = drawerRow(agent, now)
    return line(
      span(`details-marker status-${row.status}`, row.marker),
      span(row.status === 'waiting' ? 'details-text muted' : 'details-text', row.description)
    )
  })
  return section(
    'Plan',
    plan ? line(span('details-title', plan.title ?? 'Plan'), span('muted', `${plan.done} of ${plan.total} done`)) : null,
    ...rows
  )
}

function advisorSection(snapshot: OpsSnapshot): HTMLElement | null {
  const advisor = snapshot.advisor
  if (!advisor) return null
  const verdict =
    advisor.status === 'running' || !advisor.verdict
      ? span('verdict tone-muted', 'reviewing')
      : span(`verdict tone-${verdictTone(advisor.verdict)}`, advisor.verdict)
  return section('Advisor', line(verdict), advisor.note ? h('div', { class: 'details-note' }, advisor.note) : null)
}

function contextSection(snapshot: OpsSnapshot | null, live: StatusInfo | null, now: number): HTMLElement | null {
  const context = snapshot?.context
  const percent = context?.percent ?? live?.contextPercent ?? null
  const model = snapshot?.model ? opsModelLabel(snapshot.model) : live?.modelName
  const rows: Child[] = []
  if (model) rows.push(line(span('muted', 'model'), span(`fam-${snapshot?.family ?? live?.family ?? 'other'}`, model)))
  if (percent !== null) {
    const tokens =
      context?.tokens != null && context.window != null
        ? span('', `${Math.round(context.tokens / 1000)}k of ${Math.round(context.window / 1000)}k`)
        : null
    const stage = context?.stage ? span(`stage-${gaugeStage(percent)}`, context.stage) : null
    rows.push(line(...gaugeSpans(percent), span('', formatPercent(percent)), tokens, stage))
  }
  const cache = snapshot?.cache
  if (snapshot && cache && cache.phase !== 'none') {
    const left = formatLeft(cache.leftMs === null ? null : cache.leftMs - (now - snapshot.updatedAt))
    const hit = cache.hitPercent === null ? '' : `${formatPercent(cache.hitPercent)} hit`
    rows.push(line(span('', 'cache'), span(`cache-${cache.phase}`, cache.phase), span('muted', left), span('muted', hit)))
  }
  const compactions = snapshot?.compactions
  if (compactions != null) {
    rows.push(line(span('muted', compactions === 0 ? 'no compactions' : `${compactions} compaction${compactions === 1 ? '' : 's'}`)))
  }
  return rows.length === 0 ? null : section('Context', ...rows)
}

function limitLine(window: RateLimitWindow, now: number): HTMLElement {
  const family: ModelFamily | undefined = window.family
  return line(
    span(`limit-name ${family ? `fam-${family}` : 'muted'}`, window.label),
    ...gaugeSpans(window.percent),
    span('limit-percent', formatPercent(window.percent)),
    span('muted', formatResets(window.resetsAt, now))
  )
}

function limitsSection(windows: RateLimitWindow[], now: number): HTMLElement | null {
  return windows.length === 0 ? null : section('Limits', ...windows.map((w) => limitLine(w, now)))
}

function filesSection(snapshot: OpsSnapshot): HTMLElement | null {
  if (snapshot.files.length === 0) return null
  return section(
    'Files',
    ...snapshot.files
      .map((file) => {
        const name = span('details-text', baseName(file.path))
        name.title = file.path
        return line(
          span(`file-kind kind-${file.kind}`, file.kind),
          name,
          file.family && file.family !== 'other' ? span(`fam-${file.family}`, file.family) : null
        )
      })
  )
}

function checkLines(label: string, check: OpsCheck | null, now: number): Child[] {
  if (!check) return []
  const outcome = check.kind === 'test' && check.summary ? check.summary : check.ok ? 'passed' : 'failed'
  const age = check.at ? span('muted', `${formatAge(now - check.at)} ago`) : null
  return [
    line(span('', label), span(check.ok ? 'tone-ok' : 'tone-bad', outcome), age),
    check.target ? line(span('muted', check.target)) : null
  ]
}

function checksSection(snapshot: OpsSnapshot, now: number): HTMLElement | null {
  const rows = [
    ...checkLines('Last build', latestCheck(snapshot.checks, 'build'), now),
    ...checkLines('Last tests', latestCheck(snapshot.checks, 'test'), now)
  ]
  return rows.length === 0 ? null : section('Checks', ...rows)
}

function footer(snapshot: OpsSnapshot | null, now: number, onClose: () => void): HTMLElement {
  const note = snapshot
    ? `From the ops mod in this session · updated ${formatAge(now - snapshot.updatedAt)} ago`
    : 'The ops mod adds plan, agents, files and checks to this panel.'
  return h(
    'div',
    { class: 'details-footer' },
    span('muted', note),
    h('button', { class: 'btn small', type: 'button', 'aria-label': 'Close details', onClick: onClose }, 'Close details')
  )
}

export function buildDetails(view: PaneView, now: number, onClose: () => void): HTMLElement[] {
  const snapshot = view.snapshot
  const live = view.live
  const windows = snapshot && snapshot.limits.length > 0 ? snapshot.limits : (live?.rateLimits ?? [])
  const sections = snapshot
    ? [
        planSection(snapshot, now),
        advisorSection(snapshot),
        contextSection(snapshot, live, now),
        limitsSection(windows, now),
        filesSection(snapshot),
        checksSection(snapshot, now)
      ]
    : [contextSection(null, live, now), limitsSection(windows, now)]
  const present = sections.filter((s): s is HTMLElement => s !== null)
  if (present.length === 0) present.push(h('p', { class: 'muted' }, 'No live data for this session yet.'))
  return [...present, footer(snapshot, now, onClose)]
}
