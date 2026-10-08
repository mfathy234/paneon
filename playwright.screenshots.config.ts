import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/screenshots',
  timeout: 180_000,
  workers: 1,
  reporter: 'list'
})
