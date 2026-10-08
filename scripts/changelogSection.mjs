export function extractSection(text, version) {
  const wanted = String(version).replace(/^v/, '')
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((line) => {
    const match = /^##\s+\[([^\]]+)\]/.exec(line)
    return match !== null && match[1].replace(/^v/, '') === wanted
  })
  if (start === -1) return null
  let end = lines.findIndex((line, index) => index > start && /^##\s+\[/.test(line))
  if (end === -1) end = lines.length
  const body = lines.slice(start + 1, end).join('\n').trim()
  return body === '' ? null : body
}
