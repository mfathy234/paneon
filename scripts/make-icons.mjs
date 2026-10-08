import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'build')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const PNG_SIZE = 512

const mark = readFileSync(join(root, 'src', 'renderer', 'assets', 'logo.svg'), 'utf8')
const inner = mark.slice(mark.indexOf('>') + 1, mark.lastIndexOf('</svg>'))

const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect x="1" y="1" width="254" height="254" rx="58" fill="#161b23" stroke="#2c3340" stroke-width="2"/>
<g transform="translate(48 48) scale(5)">${inner}</g>
</svg>`

const render = (size) => new Resvg(tile, { fitTo: { mode: 'width', value: size } }).render().asPng()

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'icon.png'), render(PNG_SIZE))
writeFileSync(join(out, 'icon.ico'), await pngToIco(ICO_SIZES.map((size) => render(size))))
console.log(`wrote build/icon.png (${PNG_SIZE}) and build/icon.ico (${ICO_SIZES.join(', ')})`)
