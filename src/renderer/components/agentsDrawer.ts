import { drawerRow, verdictTone, type DrawerRow, type OpsSnapshot } from '../../shared/opsFeed'
import { h } from '../dom'

function rowElement(row: DrawerRow): HTMLElement {
  const main = h(
    'div',
    { class: `drawer-row status-${row.status}` },
    h('span', { class: 'drawer-marker' }, row.marker),
    h('span', { class: 'drawer-desc' }, row.description),
    h('span', { class: `drawer-model fam-${row.family ?? 'other'}` }, row.modelLabel),
    h('span', { class: 'drawer-elapsed' }, row.elapsed),
    h('span', { class: 'drawer-tokens' }, row.tokens)
  )
  return h('div', { class: 'drawer-item', 'data-agent-id': row.id }, main, row.detail ? h('div', { class: 'drawer-detail' }, row.detail) : null)
}

function advisorElement(snapshot: OpsSnapshot): HTMLElement | null {
  const advisor = snapshot.advisor
  if (!advisor) return null
  const verdict =
    advisor.status === 'running' || !advisor.verdict
      ? h('span', { class: 'verdict tone-muted' }, 'reviewing')
      : h('span', { class: `verdict tone-${verdictTone(advisor.verdict)}` }, advisor.verdict)
  return h(
    'div',
    { class: 'drawer-advisor' },
    h('span', { class: 'advisor-label' }, 'Advisor on the plan'),
    verdict,
    advisor.note ? h('span', { class: 'advisor-note' }, advisor.note) : null
  )
}

export class AgentsDrawer {
  readonly el: HTMLElement
  private readonly rows = h('div', { class: 'drawer-rows' })
  private readonly footer = h('div', { class: 'drawer-footer' })
  private signature = ''

  constructor() {
    this.el = h('div', { class: 'agents-drawer', role: 'region', hidden: true }, this.rows, this.footer)
  }

  update(snapshot: OpsSnapshot | null, open: boolean, title: string, now: number): void {
    this.el.hidden = !open || !snapshot
    if (this.el.hidden || !snapshot) return
    this.el.setAttribute('aria-label', `Agents of ${title}`)
    const rows = snapshot.agents.map((agent) => drawerRow(agent, now))
    const signature = JSON.stringify([rows, snapshot.advisor])
    if (signature === this.signature) return
    this.signature = signature
    this.rows.replaceChildren(...(rows.length > 0 ? rows.map(rowElement) : [h('div', { class: 'drawer-empty' }, 'No agents yet')]))
    const advisor = advisorElement(snapshot)
    this.footer.hidden = advisor === null
    this.footer.replaceChildren(...(advisor ? [advisor] : []))
  }
}
