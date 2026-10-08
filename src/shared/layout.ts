export interface Cell {
  row: number
  col: number
  colSpan: number
}

export interface GridLayout {
  cols: number
  rows: number
  scrolls: boolean
  cells: Cell[]
}

const columnsFor = (count: number): number => {
  if (count <= 1) return 1
  if (count <= 4) return 2
  return 3
}

export function layoutForCount(count: number): GridLayout {
  if (count <= 0) return { cols: 1, rows: 1, scrolls: false, cells: [] }
  const cols = columnsFor(count)
  const rows = Math.ceil(count / cols)
  const cells: Cell[] = []
  for (let index = 0; index < count; index += 1) {
    cells.push({ row: Math.floor(index / cols) + 1, col: (index % cols) + 1, colSpan: 1 })
  }
  const last = cells[count - 1]
  last.colSpan = cols - last.col + 1
  return { cols, rows, scrolls: count > 6, cells }
}
