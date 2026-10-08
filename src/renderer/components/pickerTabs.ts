import { setQuickPickMode } from '../actions'
import { h, icon } from '../dom'
import { ICONS } from '../icons'
import type { QuickPickMode } from '../state'

export function modeTabs(mode: QuickPickMode): HTMLElement {
  const tab = (value: QuickPickMode, label: string, svg: string): HTMLElement =>
    h(
      'button',
      {
        class: `rp-tab${mode === value ? ' selected' : ''}`,
        type: 'button',
        role: 'tab',
        id: `picker-tab-${value}`,
        'aria-selected': String(mode === value),
        tabindex: mode === value ? undefined : '-1',
        onClick: () => {
          if (mode !== value) setQuickPickMode(value)
        }
      },
      icon(svg),
      label
    )
  return h(
    'div',
    { class: 'rp-tabs', role: 'tablist', 'aria-label': 'Session mode' },
    tab('new', 'New', ICONS.plus),
    tab('resume', 'Resume', ICONS.history)
  )
}
