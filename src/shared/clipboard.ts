import type { TabAgent } from './types'

export type ClipboardContent = { kind: 'text'; text: string } | { kind: 'image'; path: string } | { kind: 'empty' }

export function imagePasteText(agent: TabAgent | undefined, path: string): string {
  const quoted = /\s/.test(path) ? `"${path}"` : path
  return agent === 'gemini' ? `@${quoted} ` : `${quoted} `
}

export function pasteText(content: ClipboardContent, agent: TabAgent | undefined): string {
  if (content.kind === 'text') return content.text
  if (content.kind === 'image') return imagePasteText(agent, content.path)
  return ''
}

export const DROP_FILE_LIMIT = 20

export function dropPasteText(agent: TabAgent | undefined, paths: readonly string[]): string {
  return paths
    .filter((path) => path !== '')
    .slice(0, DROP_FILE_LIMIT)
    .map((path) => imagePasteText(agent, path))
    .join('')
}

export function pathsFromUriList(list: string): string[] {
  return list
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('file://'))
    .map((line) => {
      const path = decodeURIComponent(line.slice('file://'.length).replace(/^localhost(?=\/)/, ''))
      return /^\/[A-Za-z]:/.test(path) ? path.slice(1).replace(/\//g, '\\') : path
    })
}
