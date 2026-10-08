import { h } from '../dom'

export interface ConfirmOptions {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
}

let dialogCount = 0

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    dialogCount += 1
    const titleId = `dlg-title-${dialogCount}`
    const bodyId = `dlg-body-${dialogCount}`
    const previous = document.activeElement as HTMLElement | null
    const cancel = h('button', { class: 'btn ghost', type: 'button' }, 'Cancel')
    const confirm = h(
      'button',
      { class: `btn ${options.danger === false ? 'primary' : 'danger'}`, type: 'button', 'data-confirm': '' },
      options.confirmLabel
    )
    const dialog = h(
      'div',
      { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': titleId, 'aria-describedby': bodyId },
      h('h2', { id: titleId }, options.title),
      h('p', { id: bodyId }, options.body),
      h('div', { class: 'dialog-actions' }, cancel, confirm)
    )
    const overlay = h('div', { class: 'overlay' }, dialog)

    const finish = (result: boolean): void => {
      document.removeEventListener('keydown', onKey, true)
      overlay.remove()
      previous?.focus()
      resolve(result)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        finish(false)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        ;(document.activeElement === cancel ? confirm : cancel).focus()
      } else if (event.key === 'Enter' && document.activeElement === confirm) {
        event.stopPropagation()
      }
    }
    cancel.addEventListener('click', () => finish(false))
    confirm.addEventListener('click', () => finish(true))
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) finish(false)
    })
    document.addEventListener('keydown', onKey, true)
    document.body.appendChild(overlay)
    cancel.focus()
  })
}
