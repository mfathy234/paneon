import { homedir } from 'node:os'
import { join } from 'node:path'

export const claudeHome = (): string =>
  process.env.PANEON_CLAUDE_HOME ?? join(process.env.USERPROFILE ?? homedir(), '.claude')

export const claudeSettingsPath = (): string => join(claudeHome(), 'settings.json')

export const claudeProjectsDir = (): string => join(claudeHome(), 'projects')

export const bridgeDirs = (userData: string): { binDir: string; statusDir: string } => ({
  binDir: join(userData, 'bin'),
  statusDir: join(userData, 'status')
})

const roaming = (): string => process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')

export const opsDirs = (): string[] =>
  process.env.PANEON_OPS_DIR
    ? [process.env.PANEON_OPS_DIR]
    : [join(roaming(), 'paneon', 'ops'), join(roaming(), 'claude-grid', 'ops')]

export const legacyUserDataDir = (): string | null => {
  if (process.env.PANEON_LEGACY_USER_DATA) return process.env.PANEON_LEGACY_USER_DATA
  return process.env.PANEON_USER_DATA ? null : join(roaming(), 'claude-grid')
}
