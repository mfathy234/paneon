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
