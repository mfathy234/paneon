import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, extname, isAbsolute, join } from 'node:path'

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

export function resolveExecutable(command: string, extraDirs: string[] = []): string | null {
  if (isAbsolute(command) || command.includes('\\') || command.includes('/')) {
    return isFile(command) ? command : null
  }
  const extensions = extname(command)
    ? ['']
    : (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean)
  const dirs = [...(process.env.PATH ?? '').split(delimiter), ...extraDirs].filter(Boolean)
  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = join(dir, command + ext)
      if (existsSync(candidate) && isFile(candidate)) return candidate
    }
  }
  return null
}

export const claudeFallbackDirs = (): string[] => [join(homedir(), '.local', 'bin')]

export function splitArgs(value: string | undefined): string[] {
  if (!value) return []
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return []
    }
  }
  return trimmed.split(/\s+/).filter(Boolean)
}
