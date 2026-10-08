import { compareTitle } from '../../shared/compare'
import type { CompareLink } from '../../shared/types'
import { diffPair, keepBoth, keepSide } from '../compareActions'
import { h, icon } from '../dom'
import { ICONS } from '../icons'

export class ComparePairComponent {
  readonly el: HTMLElement
  readonly slotA = h('div', { class: 'compare-slot' })
  readonly slotB = h('div', { class: 'compare-slot' })
  private readonly prompt = h('span', { class: 'compare-prompt' })
  private readonly project = h('span', { class: 'compare-project' })
  private readonly diff = h('button', { class: 'btn small ghost', type: 'button' }, 'Diff A vs B')
  private linkId = ''

  constructor() {
    const header = h(
      'div',
      { class: 'compare-head' },
      icon(ICONS.compare),
      h('span', { class: 'compare-label' }, 'Compare'),
      this.prompt,
      h('span', { class: 'spacer' }),
      this.project
    )
    const footer = h(
      'div',
      { class: 'compare-foot' },
      this.action('Keep A', () => void keepSide(this.linkId, 'a')),
      this.action('Keep B', () => void keepSide(this.linkId, 'b')),
      this.action('Keep both', () => keepBoth(this.linkId)),
      this.diff,
      h('span', { class: 'spacer' }),
      h('span', { class: 'compare-foot-hint muted' }, 'Keeping one closes the other, then offers to remove its worktree')
    )
    this.diff.addEventListener('click', () => void diffPair(this.linkId))
    this.el = h('section', { class: 'compare-group', 'aria-label': 'Compare' }, header, h('div', { class: 'compare-panes' }, this.slotA, this.slotB), footer)
  }

  private action(label: string, run: () => void): HTMLElement {
    return h('button', { class: 'btn small ghost', type: 'button', onClick: run }, label)
  }

  update(link: CompareLink, projectName: string): void {
    this.linkId = link.id
    this.el.dataset.compare = link.id
    this.prompt.textContent = compareTitle(link.prompt)
    this.prompt.title = link.prompt
    this.project.textContent = projectName
    this.diff.disabled = link.sides === null
    this.diff.title = link.sides === null ? 'Both agents share one folder, so there is nothing to diff' : 'Diff the two worktrees in a shell tab'
  }

  dispose(): void {
    this.el.remove()
  }
}
