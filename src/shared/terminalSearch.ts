export function searchCountLabel(query: string, index: number, count: number): string {
  if (!query) return ''
  if (count === 0) return 'No results'
  if (count > 999) return index < 0 ? '999+' : `${index + 1} of 999+`
  return index < 0 ? `${count} found` : `${index + 1} of ${count}`
}
