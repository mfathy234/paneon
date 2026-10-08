import { app } from 'electron'

export const appVersion = (): string => process.env.PANEON_APP_VERSION || app.getVersion()
