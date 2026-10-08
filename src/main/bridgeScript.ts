export const BRIDGE_SCRIPT_NAME = 'statusline-bridge.js'
export const BRIDGE_CONFIG_NAME = 'bridge-config.json'

export const BRIDGE_SCRIPT = String.raw`'use strict'
const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const chunks = []
process.stdin.on('data', (chunk) => chunks.push(chunk))
process.stdin.on('end', () => {
  const input = Buffer.concat(chunks)
  const config = readConfig()
  save(input.toString('utf8'), config)
  passThrough(input, config)
})
process.stdin.on('error', () => process.exit(0))

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '` + BRIDGE_CONFIG_NAME + String.raw`'), 'utf8'))
  } catch (error) {
    return {}
  }
}

function save(text, config) {
  try {
    if (!config.statusDir) return
    const id = JSON.parse(text).session_id
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) return
    fs.mkdirSync(config.statusDir, { recursive: true })
    const file = path.join(config.statusDir, id + '.json')
    const temp = file + '.' + process.pid + '.tmp'
    fs.writeFileSync(temp, text)
    try {
      fs.renameSync(temp, file)
    } catch (error) {
      fs.writeFileSync(file, text)
      fs.rmSync(temp, { force: true })
    }
  } catch (error) {
    return
  }
}

function passThrough(input, config) {
  if (typeof config.previousCommand !== 'string' || config.previousCommand.trim() === '') return
  try {
    const result = cp.spawnSync(config.previousCommand, { shell: true, input, timeout: 10000, windowsHide: true })
    if (result.stdout && result.stdout.length > 0) process.stdout.write(result.stdout)
  } catch (error) {
    return
  }
}
`
