import { describe, expect, it } from 'vitest'
import {
  TOOL_ARG_MAX,
  formatFromPath,
  groupTurns,
  parseClaudeSession,
  parseCodexSession,
  parseGeminiSession,
  renderHtml,
  renderMarkdown,
  sanitizeNamePart,
  toolArg,
  transcriptFileName,
  type TranscriptDoc
} from '../../src/shared/transcript'

const ESC = String.fromCharCode(27)
const BEL = String.fromCharCode(7)
const lines = (...records: unknown[]): string => records.map((r) => JSON.stringify(r)).join('\n') + '\n'

const claudeText = lines(
  { type: 'user', timestamp: '2026-10-08T09:12:00.000Z', message: { content: 'Add a dark mode toggle' } },
  { type: 'user', isMeta: true, message: { content: 'meta note' } },
  { type: 'user', message: { content: '<command-name>/clear</command-name>' } },
  {
    type: 'assistant',
    timestamp: '2026-10-08T09:12:05.000Z',
    message: {
      model: 'claude-opus-5-5',
      content: [
        { type: 'text', text: 'Looking at the settings page.' },
        { type: 'tool_use', name: 'Read', input: { file_path: 'src/settings.ts' } }
      ]
    }
  },
  { type: 'user', message: { content: [{ type: 'tool_result', content: 'file body', tool_use_id: 'a' }] } },
  {
    type: 'assistant',
    timestamp: '2026-10-08T09:30:00.000Z',
    message: { content: [{ type: 'text', text: 'Done.' }, { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] }
  },
  { type: 'assistant', isSidechain: true, message: { content: [{ type: 'text', text: 'sub agent chatter' }] } },
  { type: 'ai-title', aiTitle: 'Add dark mode toggle' }
)

const doc = (over: Partial<TranscriptDoc> = {}): TranscriptDoc => ({
  title: 'Add dark mode toggle',
  agent: 'Claude',
  model: 'claude-opus-5-5',
  project: 'acme-web',
  folder: 'C:\\work\\acme-web',
  sessionId: 'abc-123',
  startedAt: Date.parse('2026-10-08T09:12:00.000Z'),
  endedAt: Date.parse('2026-10-08T09:30:00.000Z'),
  entries: [
    { kind: 'user', text: 'Add a dark mode toggle' },
    { kind: 'assistant', text: 'Looking at it.' },
    { kind: 'tool', name: 'Read', arg: 'src/settings.ts' }
  ],
  ...over
})

describe('toolArg', () => {
  it('picks the most telling field and flattens whitespace', () => {
    expect(toolArg({ command: 'npm   test\n--run' })).toBe('npm test --run')
    expect(toolArg({ file_path: 'a.ts', content: 'x' })).toBe('a.ts')
    expect(toolArg({ command: ['git', 'status'] })).toBe('git status')
  })

  it('falls back to compact JSON, a plain string, or nothing', () => {
    expect(toolArg({ todos: [1] })).toBe('{"todos":[1]}')
    expect(toolArg('echo hi')).toBe('echo hi')
    expect(toolArg({})).toBe('')
    expect(toolArg(undefined)).toBe('')
  })

  it('truncates long arguments with an ellipsis', () => {
    const out = toolArg({ command: 'x'.repeat(500) })
    expect(out).toHaveLength(TOOL_ARG_MAX)
    expect(out.endsWith('…')).toBe(true)
  })

  it('strips ANSI and control characters', () => {
    expect(toolArg({ command: `${ESC}[31mred${ESC}[0m${BEL} text` })).toBe('red text')
  })
})

describe('parseClaudeSession', () => {
  const parsed = parseClaudeSession(claudeText)

  it('keeps prompts, replies and tool calls in order and drops results, meta and sub agents', () => {
    expect(parsed.entries).toEqual([
      { kind: 'user', text: 'Add a dark mode toggle' },
      { kind: 'assistant', text: 'Looking at the settings page.' },
      { kind: 'tool', name: 'Read', arg: 'src/settings.ts' },
      { kind: 'assistant', text: 'Done.' },
      { kind: 'tool', name: 'Bash', arg: 'npm test' }
    ])
  })

  it('reads title, model and the time span', () => {
    expect(parsed.title).toBe('Add dark mode toggle')
    expect(parsed.model).toBe('claude-opus-5-5')
    expect(parsed.startedAt).toBe(Date.parse('2026-10-08T09:12:00.000Z'))
    expect(parsed.endedAt).toBe(Date.parse('2026-10-08T09:30:00.000Z'))
  })

  it('prefers a custom title and survives garbage lines and an empty file', () => {
    const text = `not json\n{broken\n${lines({ type: 'ai-title', aiTitle: 'auto' }, { type: 'custom-title', customTitle: 'Mine' })}`
    expect(parseClaudeSession(text).title).toBe('Mine')
    expect(parseClaudeSession('').entries).toEqual([])
  })

  it('strips ANSI from message text', () => {
    const out = parseClaudeSession(lines({ type: 'assistant', message: { content: [{ type: 'text', text: `${ESC}[1mbold${ESC}[0m` }] } }))
    expect(out.entries).toEqual([{ kind: 'assistant', text: 'bold' }])
  })
})

describe('parseCodexSession', () => {
  it('uses event messages for text and response items for tool calls', () => {
    const parsed = parseCodexSession(
      lines(
        { type: 'session_meta', payload: { id: 'x', cwd: 'C:\\w', timestamp: '2026-10-08T12:00:00.000Z' } },
        { type: 'turn_context', payload: { model: 'gpt-5-codex' } },
        { type: 'event_msg', payload: { type: 'user_message', message: 'Fix the flaky login test' } },
        { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Fix the flaky login test' }] } },
        { type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: '{"cmd":"npm test"}' } },
        { type: 'response_item', payload: { type: 'function_call_output', output: 'ok' } },
        { type: 'response_item', payload: { type: 'local_shell_call', action: { command: ['git', 'diff'] } } },
        { type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', input: '*** Begin Patch\n*** Update File: a.ts' } },
        { type: 'event_msg', payload: { type: 'agent_message', message: 'Fixed.' } }
      )
    )
    expect(parsed.entries).toEqual([
      { kind: 'user', text: 'Fix the flaky login test' },
      { kind: 'tool', name: 'exec_command', arg: 'npm test' },
      { kind: 'tool', name: 'shell', arg: 'git diff' },
      { kind: 'tool', name: 'apply_patch', arg: '*** Begin Patch *** Update File: a.ts' },
      { kind: 'assistant', text: 'Fixed.' }
    ])
    expect(parsed.model).toBe('gpt-5-codex')
    expect(parsed.startedAt).toBe(Date.parse('2026-10-08T12:00:00.000Z'))
  })

  it('falls back to response item messages and skips injected context', () => {
    const parsed = parseCodexSession(
      lines(
        { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>cwd</environment_context>' }] } },
        { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hello' }] } },
        { type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hi' }] } },
        { type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: 'not json' } }
      )
    )
    expect(parsed.entries).toEqual([
      { kind: 'user', text: 'Hello' },
      { kind: 'assistant', text: 'Hi' },
      { kind: 'tool', name: 'shell', arg: 'not json' }
    ])
  })
})

describe('parseGeminiSession', () => {
  const chat = lines(
    { sessionId: 's1', startTime: '2026-10-08T10:00:00.000Z', lastUpdated: '2026-10-08T10:05:00.000Z' },
    { id: 'm1', timestamp: '2026-10-08T10:00:01.000Z', type: 'user', content: [{ text: 'Rename the helper' }] },
    { id: 'm2', type: 'user', content: '/clear' },
    { id: 'm3', timestamp: '2026-10-08T10:00:09.000Z', type: 'gemini', model: 'gemini-3-pro', content: 'partial', toolCalls: [{ name: 'read_file', args: { path: 'util.ts' } }] },
    { id: 'm3', timestamp: '2026-10-08T10:00:10.000Z', type: 'gemini', model: 'gemini-3-pro', content: 'Renamed it.', toolCalls: [{ name: 'read_file', args: { path: 'util.ts' } }] },
    { $set: { summary: 'Rename helper' } }
  )

  it('reads jsonl chats, dedupes updated messages by id and lists tool calls', () => {
    const parsed = parseGeminiSession(chat)
    expect(parsed.entries).toEqual([
      { kind: 'user', text: 'Rename the helper' },
      { kind: 'assistant', text: 'Renamed it.' },
      { kind: 'tool', name: 'read_file', arg: 'util.ts' }
    ])
    expect(parsed.title).toBe('Rename helper')
    expect(parsed.model).toBe('gemini-3-pro')
    expect(parsed.startedAt).toBe(Date.parse('2026-10-08T10:00:00.000Z'))
    expect(parsed.endedAt).toBe(Date.parse('2026-10-08T10:05:00.000Z'))
  })

  it('reads a single-object chat with embedded messages', () => {
    const text = JSON.stringify({ sessionId: 's2', messages: [{ id: 'a', type: 'user', content: 'Hi' }, { id: 'b', type: 'gemini', content: 'Hello' }] })
    expect(parseGeminiSession(text).entries.map((e) => e.kind)).toEqual(['user', 'assistant'])
  })
})

describe('groupTurns', () => {
  it('merges consecutive entries of one speaker and keeps tools with the assistant', () => {
    const turns = groupTurns(doc().entries)
    expect(turns.map((t) => [t.role, t.items.length])).toEqual([
      ['user', 1],
      ['assistant', 2]
    ])
  })
})

describe('renderMarkdown', () => {
  it('writes the header block then the turns', () => {
    const md = renderMarkdown(doc())
    expect(md.startsWith('# Add dark mode toggle\n')).toBe(true)
    for (const row of [
      '**Agent:** Claude',
      '**Model:** claude-opus-5-5',
      '**Project:** acme-web',
      '**Folder:** C:\\work\\acme-web',
      '**Started:** 2026-10-08 09:12 UTC',
      '**Last activity:** 2026-10-08 09:30 UTC',
      '**Session:** abc-123'
    ]) {
      expect(md).toContain(row)
    }
    expect(md).toContain('### User\n\n> Add a dark mode toggle')
    expect(md).toContain('### Assistant\n\nLooking at it.\n\n- **Read** `src/settings.ts`')
  })

  it('quotes prompts line by line and closes an open code fence', () => {
    const md = renderMarkdown(doc({ entries: [{ kind: 'user', text: 'a\n\nb' }, { kind: 'assistant', text: '```ts\nlet x' }] }))
    expect(md).toContain('> a\n>\n> b')
    expect(md).toContain('```ts\nlet x\n```')
  })

  it('keeps backticks in tool arguments from breaking the span', () => {
    const md = renderMarkdown(doc({ entries: [{ kind: 'tool', name: 'Bash', arg: 'echo `date`' }] }))
    expect(md).toContain('- **Bash** `` echo `date` ``')
  })

  it('says so for an empty session', () => {
    expect(renderMarkdown(doc({ entries: [] }))).toContain('_No messages in this session._')
  })

  it('omits unknown header rows', () => {
    const md = renderMarkdown(doc({ model: undefined, sessionId: undefined, startedAt: undefined, endedAt: undefined }))
    expect(md).not.toContain('**Model:**')
    expect(md).not.toContain('**Session:**')
    expect(md).not.toContain('**Started:**')
  })

  it('appends the changes section', () => {
    const md = renderMarkdown(doc({ changes: ' a.txt | 2 +-\n 1 file changed' }))
    expect(md).toContain('## Changes\n\n```\n a.txt | 2 +-\n 1 file changed\n```')
  })

  it('exports terminal text as a fenced block and says so in the header', () => {
    const md = renderMarkdown(doc({ entries: [], sessionId: undefined, scrollback: `${ESC}[32mgreen${ESC}[0m line\n\n\n` }))
    expect(md).toContain('**Source:** Terminal text only')
    expect(md).toContain('## Terminal output\n\n```\ngreen line\n```')
    expect(md).not.toContain('## Conversation')
  })

  it('uses a longer fence when the terminal text contains one', () => {
    const md = renderMarkdown(doc({ entries: [], scrollback: '```\ninner\n```' }))
    expect(md).toContain('````\n```\ninner\n```\n````')
  })
})

describe('renderHtml', () => {
  const html = renderHtml(
    doc({
      title: '<script>alert(1)</script>',
      entries: [
        { kind: 'user', text: 'a & b <b>x</b> "q"' },
        { kind: 'tool', name: 'Bash', arg: '<img onerror=x>' }
      ]
    })
  )

  it('is a self-contained page with light and dark colours', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('prefers-color-scheme:dark')
    expect(html).not.toMatch(/<link|<script|src=|https?:\/\//)
  })

  it('escapes every piece of content', () => {
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('a &amp; b &lt;b&gt;x&lt;/b&gt; &quot;q&quot;')
    expect(html).toContain('<b>Bash</b> &lt;img onerror=x&gt;')
  })

  it('renders the fallback and empty states', () => {
    expect(renderHtml(doc({ entries: [], scrollback: 'x < y' }))).toContain('<pre>x &lt; y</pre>')
    expect(renderHtml(doc({ entries: [] }))).toContain('No messages in this session.')
  })

  it('includes changes when given', () => {
    expect(renderHtml(doc({ changes: 'a | 1 +' }))).toContain('<h2>Changes</h2>\n<pre>a | 1 +</pre>')
  })
})

describe('file names', () => {
  const now = new Date(2026, 9, 9, 12)

  it('builds project, title and date', () => {
    expect(transcriptFileName({ project: 'acme-web', title: 'Add dark mode toggle', agent: 'Claude', now, format: 'md' })).toBe(
      'acme-web-Add-dark-mode-toggle-2026-10-09.md'
    )
  })

  it('falls back to the agent and picks the extension', () => {
    expect(transcriptFileName({ project: 'billing api', agent: 'Codex', now, format: 'html' })).toBe('billing-api-Codex-2026-10-09.html')
  })

  it('removes characters Windows rejects and trailing dots', () => {
    expect(sanitizeNamePart('Fix: a/b\\c*d?"e"<f>|g.  ', 50)).toBe('Fix-a-b-c-d-e-f-g')
    expect(sanitizeNamePart('...', 10)).toBe('')
  })

  it('limits the length', () => {
    expect(sanitizeNamePart('x'.repeat(200), 50)).toHaveLength(50)
  })

  it('reads the format from the chosen path', () => {
    expect(formatFromPath('C:\\a\\b.HTML')).toBe('html')
    expect(formatFromPath('C:\\a\\b.md')).toBe('md')
    expect(formatFromPath('C:\\a\\b')).toBe('md')
  })
})
