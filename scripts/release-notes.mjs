import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractSection } from './changelogSection.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const optional = args.includes('--optional')
const [versionArg, outArg] = args.filter((arg) => !arg.startsWith('--'))
const version = versionArg ?? JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
const target = resolve(root, outArg ?? 'build/release-notes.md')
const section = extractSection(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'), version)
if (section === null && !optional) {
  console.error(`CHANGELOG.md has no section for ${version}`)
  process.exit(1)
}
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, section === null ? '' : `${section}\n`, 'utf8')
console.log(section === null ? `No changelog section for ${version}; wrote an empty notes file` : `Wrote the ${version} notes to ${target}`)
