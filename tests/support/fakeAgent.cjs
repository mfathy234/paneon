const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const name = process.argv[2] || 'agent'
const record = { name, cwd: process.cwd(), args: process.argv.slice(3) }
if (process.env.FAKE_AGENT_LOG) {
  mkdirSync(process.env.FAKE_AGENT_LOG, { recursive: true })
  writeFileSync(join(process.env.FAKE_AGENT_LOG, `${name}.json`), JSON.stringify(record), 'utf8')
}
process.stdout.write(`READY ${name}\r\n`)
setInterval(() => undefined, 60_000)
