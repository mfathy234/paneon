import { AGENTS, AGENT_NAMES, agentLabel } from '../../shared/agents'
import { formatTokens, formatUsd, type LimitSeries, type UsageBucket, type UsageReport } from '../../shared/usage'
import type { AgentKind } from '../../shared/types'
import { h } from '../dom'

export type ChartMode = 'tokens' | 'cost'

const SVG_NS = 'http://www.w3.org/2000/svg'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function amountOf(bucket: UsageBucket, agent: AgentKind, mode: ChartMode): number {
  const value = bucket.perAgent[agent]
  return mode === 'tokens' ? value.tokens : (value.costUsd ?? 0)
}

const totalOf = (bucket: UsageBucket, mode: ChartMode): number => AGENTS.reduce((sum, agent) => sum + amountOf(bucket, agent, mode), 0)

const format = (value: number, mode: ChartMode): string => (mode === 'tokens' ? formatTokens(value) : formatUsd(value))

function bucketLabel(report: UsageReport, key: string, index: number): string {
  if (report.hourly) return index % 3 === 0 ? key.slice(11) : ''
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return report.buckets.length <= 7 ? WEEKDAYS[date.getDay()] : index % 5 === 0 || index === report.buckets.length - 1 ? String(day) : ''
}

function bucketTitle(report: UsageReport, bucket: UsageBucket, mode: ChartMode): string {
  const when = report.hourly ? `${bucket.key.slice(11)}:00` : bucket.key
  const parts = AGENTS.filter((agent) => amountOf(bucket, agent, mode) > 0).map(
    (agent) => `${agentLabel(agent)} ${format(amountOf(bucket, agent, mode), mode)}`
  )
  return `${when}: ${parts.length > 0 ? parts.join(', ') : 'no use'}`
}

export function buildBars(report: UsageReport, mode: ChartMode): HTMLElement {
  const max = Math.max(0, ...report.buckets.map((bucket) => totalOf(bucket, mode)))
  const columns = report.buckets.map((bucket, index) => {
    const stack = h('div', { class: 'usage-stack' })
    for (const agent of AGENTS) {
      const value = amountOf(bucket, agent, mode)
      if (value <= 0 || max <= 0) continue
      stack.append(h('div', { class: `usage-seg seg-${agent}`, style: `height:${((value / max) * 100).toFixed(2)}%` }))
    }
    return h(
      'div',
      { class: 'usage-col', title: bucketTitle(report, bucket, mode), 'data-bucket': bucket.key, 'data-total': String(totalOf(bucket, mode)) },
      stack,
      h('span', { class: 'usage-x' }, bucketLabel(report, bucket.key, index))
    )
  })
  const axis = h(
    'div',
    { class: 'usage-axis' },
    h('span', {}, max > 0 ? format(max, mode) : ''),
    h('span', {}, max > 0 ? format(max / 2, mode) : ''),
    h('span', {}, max > 0 ? '0' : '')
  )
  return h('div', { class: 'usage-bars' }, axis, h('div', { class: 'usage-cols' }, ...columns))
}

export function buildLegend(): HTMLElement {
  return h(
    'div',
    { class: 'usage-legend' },
    ...AGENTS.map((agent) => h('span', { class: 'usage-key' }, h('span', { class: `usage-swatch seg-${agent}` }), AGENT_NAMES[agent]))
  )
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value)
  return element
}

const WIDTH = 600
const HEIGHT = 120

export function buildLimitChart(report: UsageReport, series: LimitSeries[]): SVGSVGElement {
  const chart = svg('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'usage-limit-svg', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Limit usage over time' })
  for (const level of [0, 50, 100]) {
    const y = HEIGHT - (level / 100) * HEIGHT
    chart.append(svg('line', { x1: '0', x2: String(WIDTH), y1: String(y), y2: String(y), class: 'usage-grid-line' }))
  }
  const span = Math.max(1, report.end - report.start)
  series.forEach((entry, index) => {
    const points = entry.points
      .map((point) => `${(((point.at - report.start) / span) * WIDTH).toFixed(1)},${(HEIGHT - (point.percent / 100) * HEIGHT).toFixed(1)}`)
      .join(' ')
    chart.append(svg('polyline', { points, class: `usage-line usage-line-${index}`, fill: 'none' }))
    const last = entry.points[entry.points.length - 1]
    const x = ((last.at - report.start) / span) * WIDTH
    const y = HEIGHT - (last.percent / 100) * HEIGHT
    chart.append(svg('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)}l0 0`, class: `usage-dot usage-line-${index}` }))
  })
  return chart
}
