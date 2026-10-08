export interface KeyBinding {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}

export interface KeyEventLike {
  key: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

const NAMED_KEYS = ['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Space']
const FUNCTION_KEY = /^F([1-9]|1[0-2])$/i

function normalizeKey(raw: string): string | null {
  if (raw.length === 1) return /[a-z0-9]/i.test(raw) ? raw.toLowerCase() : null
  const named = NAMED_KEYS.find((name) => name.toLowerCase() === raw.toLowerCase())
  if (named) return named
  return FUNCTION_KEY.test(raw) ? raw.toUpperCase() : null
}

export function parseShortcut(text: string): KeyBinding | null {
  const parts = text.split('+').map((part) => part.trim())
  const rawKey = parts.pop()
  if (!rawKey) return null
  const binding: KeyBinding = { key: '', ctrl: false, shift: false, alt: false }
  for (const part of parts) {
    const word = part.toLowerCase()
    if (word === 'ctrl' || word === 'control') binding.ctrl = true
    else if (word === 'shift') binding.shift = true
    else if (word === 'alt') binding.alt = true
    else return null
  }
  const key = normalizeKey(rawKey)
  if (!key || (!binding.ctrl && !binding.alt)) return null
  return { ...binding, key }
}

export function formatShortcut(binding: KeyBinding): string {
  const key = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key
  return [binding.ctrl && 'Ctrl', binding.shift && 'Shift', binding.alt && 'Alt', key].filter(Boolean).join('+')
}

export function matchesBinding(event: KeyEventLike, binding: KeyBinding): boolean {
  if (event.metaKey) return false
  if (event.ctrlKey !== binding.ctrl || event.shiftKey !== binding.shift || event.altKey !== binding.alt) return false
  return binding.key.length === 1 ? event.key.toLowerCase() === binding.key : event.key === binding.key
}

export const bind = (text: string): KeyBinding => {
  const binding = parseShortcut(text)
  if (!binding) throw new Error(`Invalid shortcut: ${text}`)
  return binding
}
