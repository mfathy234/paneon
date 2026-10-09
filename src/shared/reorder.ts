export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items
  const target = Math.max(0, Math.min(items.length - 1, to))
  if (from === target) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

export function moveById<T extends { id: string }>(items: T[], id: string, to: number): T[] {
  return moveItem(items, items.findIndex((item) => item.id === id), to)
}
