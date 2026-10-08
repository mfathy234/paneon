const path = require('node:path')

const ESC = String.fromCharCode(27)
const dim = (text) => `${ESC}[2m${text}${ESC}[0m`
const bold = (text) => `${ESC}[1m${text}${ESC}[0m`
const green = (text) => `${ESC}[32m${text}${ESC}[0m`
const amber = (text) => `${ESC}[33m${text}${ESC}[0m`
const cyan = (text) => `${ESC}[36m${text}${ESC}[0m`

const SCRIPTS = {
  'acme-web': [
    bold('> Add a dark mode toggle to the settings page'),
    '',
    `${green('●')} I will start with the settings components and the theme context.`,
    dim('  ⎿  Read src/components/Settings.tsx (84 lines)'),
    dim('  ⎿  Read src/context/theme.tsx (31 lines)'),
    '',
    `${green('●')} Adding a ${cyan('ThemeToggle')} and persisting the choice in localStorage.`,
    dim('  ⎿  Update src/context/theme.tsx  (+18 -3)'),
    dim('  ⎿  Update src/components/Settings.tsx  (+9 -0)'),
    dim('  ⎿  Create src/components/ThemeToggle.tsx  (+42)'),
    '',
    `${amber('✻')} Running the test suite… ${dim('(esc to interrupt)')}`
  ],
  'billing-api': [
    bold('> Refactor the invoice export into smaller functions'),
    '',
    `${green('●')} Splitting ${cyan('exportInvoices')} into query, format and write steps.`,
    dim('  ⎿  Update src/export/invoices.ts  (+37 -61)'),
    dim('  ⎿  Create src/export/formatRow.ts  (+22)'),
    '',
    `${green('●')} All 41 tests pass. The export output is byte-for-byte unchanged.`,
    '',
    dim('  Done. Ready for review.')
  ],
  'mobile-shell': [
    bold('› Fix the flaky login test'),
    '',
    `${green('•')} The test waits for a fixed 200 ms; the token refresh sometimes takes longer.`,
    `${green('•')} Replacing the sleep with a wait on the "session ready" event.`,
    dim('  edit  tests/login.spec.ts  (+6 -2)'),
    '',
    `${amber('⠧')} Working (12s • esc to interrupt)`
  ],
  'billing-api:codex': [
    bold('› Add pagination to the invoices endpoint'),
    '',
    `${green('•')} The list query has no limit; adding page and pageSize parameters.`,
    dim('  edit  src/routes/invoices.ts  (+14 -3)'),
    dim('  edit  tests/invoices.spec.ts  (+22)'),
    '',
    `${amber('⠧')} Working (4s • esc to interrupt)`
  ],
  'docs-site': [
    bold('> Rewrite the getting started guide for the new installer'),
    '',
    `${green('✦')} Drafting a three-step guide: download, first run, add a project.`,
    dim('  ✓  ReadFile docs/getting-started.md'),
    dim('  ✓  WriteFile docs/getting-started.md'),
    '',
    'Done. The guide now starts with the installer download.'
  ]
}

const compare = /-compare-[a-z0-9]+-([ab])$/.exec(path.basename(process.cwd()))
const asked = process.argv[3] ?? 'Why does the login test fail on CI but not locally?'

const COMPARE = {
  'a:claude': [
    bold(`> ${asked}`),
    '',
    `${green('●')} Reading the spec and the CI configuration.`,
    dim('  ⎿  Read tests/login.spec.ts (58 lines)'),
    dim('  ⎿  Bash npm test -- login'),
    '',
    `${green('●')} The spec waits 500 ms for the redirect. CI is slower, so the wait expires.`,
    '',
    `${amber('✻')} Testing a fix with waitForURL… ${dim('(esc to interrupt)')}`
  ],
  'b:codex': [
    bold(`› ${asked}`),
    '',
    `${green('•')} The token cookie is set after the redirect, not before it.`,
    `${green('•')} Running the CI environment variables locally to confirm.`,
    dim('  edit  tests/login.spec.ts  (+4 -1)'),
    '',
    `${amber('⠧')} Working (9s • esc to interrupt)`
  ]
}

const name = path.basename(process.cwd())
const fallback = compare ? COMPARE[`${compare[1]}:${process.argv[2]}`] : undefined
const lines = fallback ?? SCRIPTS[`${name}:${process.argv[2]}`] ?? SCRIPTS[name] ?? [bold('> Ready')]
process.stdout.write('\r\n')
for (const line of lines) process.stdout.write(`${line}\r\n`)
process.stdout.write('\r\n')
setInterval(() => undefined, 60_000)
