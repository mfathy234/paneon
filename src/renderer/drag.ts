const THRESHOLD = 6

export interface DragConfig<T extends HTMLElement> {
  ignore: string
  targetAt(x: number, y: number): T | null
  mark(target: T | null): void
  drop(target: T): void
}

export function enableDrag<T extends HTMLElement>(source: HTMLElement, config: DragConfig<T>): void {
  source.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(config.ignore)) return
    const startX = event.clientX
    const startY = event.clientY
    let active = false
    let target: T | null = null

    const finish = (commit: boolean): void => {
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', cancel, true)
      document.removeEventListener('keydown', key, true)
      if (!active) return
      document.body.classList.remove('dragging-ui')
      source.classList.remove('drag-source')
      config.mark(null)
      const swallow = (click: Event): void => click.stopPropagation()
      document.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => document.removeEventListener('click', swallow, true), 0)
      if (commit && target) config.drop(target)
    }

    function move(moveEvent: PointerEvent): void {
      if (!active) {
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < THRESHOLD) return
        active = true
        document.body.classList.add('dragging-ui')
        source.classList.add('drag-source')
      }
      const next = config.targetAt(moveEvent.clientX, moveEvent.clientY)
      if (next === target) return
      target = next
      config.mark(next)
    }
    function up(): void {
      finish(true)
    }
    function cancel(): void {
      finish(false)
    }
    function key(keyEvent: KeyboardEvent): void {
      if (keyEvent.key !== 'Escape') return
      keyEvent.stopPropagation()
      finish(false)
    }

    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', cancel, true)
    document.addEventListener('keydown', key, true)
  })
}
