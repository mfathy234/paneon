import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { bufferText, closeApp, createSandbox, launchApp } from './helpers'

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

test('Ctrl+V with a screenshot on the clipboard saves it and pastes its path', async () => {
  const pasteDir = mkdtempSync(join(tmpdir(), 'paneon-paste-'))
  const { app, page } = await launchApp(createSandbox(), { PANEON_PASTE_DIR: pasteDir })
  try {
    await page.getByRole('button', { name: 'New Claude session in Smoke', exact: true }).click()
    await page.getByRole('button', { name: 'New terminal in SMOKE' }).click()
    await page.getByRole('menuitem', { name: 'Shell' }).click()
    const host = page.locator('.term-host.active')
    const id = (await host.getAttribute('data-term-id'))!
    await expect.poll(() => bufferText(page, id), { timeout: 30_000 }).toMatch(/>\s*$/m)

    await app.evaluate(async ({ clipboard, ClipboardItem }, base64) => {
      const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'image/png' })
      await clipboard.write([new ClipboardItem({ 'image/png': blob })])
    }, PNG_1PX)
    await host.click()
    await page.keyboard.press('Control+v')

    await expect.poll(() => readdirSync(pasteDir).filter((name) => name.endsWith('.png')).length, { timeout: 15_000 }).toBe(1)
    const saved = readdirSync(pasteDir)[0]
    await expect.poll(async () => (await bufferText(page, id)).replace(/\s+/g, ''), { timeout: 30_000 }).toContain(saved)
  } finally {
    await app.evaluate(async ({ clipboard }) => clipboard.writeText(''))
    await closeApp(app)
  }
})
