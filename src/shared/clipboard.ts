import type { TabAgent } from './types'

export type ClipboardContent = { kind: 'text'; text: string } | { kind: 'image'; path: string } | { kind: 'empty' }

export type ShellKind = 'powershell' | 'cmd'

export const shellKindOf = (command: string): ShellKind => (/(^|[\\/])cmd(\.exe)?$/i.test(command.trim()) ? 'cmd' : 'powershell')

const PLAIN = /^[A-Za-z0-9_\-.:\\/]+$/

function quotePath(path: string, agent: TabAgent | undefined, shell: ShellKind): string {
  if (agent === 'shell') {
    if (PLAIN.test(path)) return path
    return shell === 'cmd' ? `"${path}"` : `'${path.replace(/'/g, "''")}'`
  }
  return /\s/.test(path) ? `"${path}"` : path
}

export function imagePasteText(agent: TabAgent | undefined, path: string, shell: ShellKind = 'powershell'): string {
  const quoted = quotePath(path, agent, shell)
  return agent === 'gemini' ? `@${quoted} ` : `${quoted} `
}

export function pasteText(content: ClipboardContent, agent: TabAgent | undefined, shell: ShellKind = 'powershell'): string {
  if (content.kind === 'text') return content.text
  if (content.kind === 'image') return imagePasteText(agent, content.path, shell)
  return ''
}

export const DROP_FILE_LIMIT = 20

export function dropPasteText(agent: TabAgent | undefined, paths: readonly string[], shell: ShellKind = 'powershell'): string {
  return paths
    .filter((path) => path !== '')
    .slice(0, DROP_FILE_LIMIT)
    .map((path) => imagePasteText(agent, path, shell))
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
