import { snippetPreview } from '../../shared/snippets'
import type { Snippet } from '../../shared/types'
import { deleteSnippet, editSnippet } from '../snippetActions'
import { clear, h } from '../dom'
import type { AppState } from '../state'

export class SnippetsPanelComponent {
  readonly el = h('section', { class: 'snippets-panel', 'aria-label': 'Snippets' })
  private readonly rows = h('div', { class: 'snippet-list' })
  private signature = ''

  constructor() {
    this.el.append(
      h(
        'p',
        { class: 'lede' },
        'Short prompts you insert into the focused terminal without sending them. Use them from the command palette or with Alt+1 to Alt+9.'
      ),
      h(
        'div',
        { class: 'snippet-bar' },
        h('button', { class: 'btn ghost', type: 'button', id: 'add-snippet', onClick: () => void editSnippet() }, 'New snippet')
      ),
      this.rows
    )
  }

  update(state: AppState): void {
    const { snippets, projects } = state.settings
    const signature = JSON.stringify([snippets, projects.map((p) => [p.id, p.name])])
    if (signature === this.signature) return
    this.signature = signature
    clear(this.rows)
    if (snippets.length === 0) {
      this.rows.append(h('p', { class: 'proj-empty' }, 'No snippets yet. Add one to reuse a prompt in any session.'))
      return
    }
    for (const snippet of snippets) {
      const scope = snippet.projectId ? (projects.find((p) => p.id === snippet.projectId)?.name ?? 'removed project') : 'all projects'
      this.rows.append(this.row(snippet, scope))
    }
  }

  private row(snippet: Snippet, scope: string): HTMLElement {
    return h(
      'div',
      { class: 'snippet-row', 'data-snippet': snippet.name },
      h(
        'div',
        { class: 'snippet-main' },
        h('strong', {}, snippet.name),
        h('span', { class: 'snippet-preview muted' }, snippetPreview(snippet.text))
      ),
      h('span', { class: 'snippet-scope' }, scope),
      h('span', { class: 'snippet-key' }, snippet.shortcut === null ? '' : `Alt+${snippet.shortcut}`),
      h(
        'button',
        { class: 'btn small ghost', type: 'button', 'aria-label': `Edit snippet ${snippet.name}`, onClick: () => void editSnippet(snippet.id) },
        'Edit'
      ),
      h(
        'button',
        { class: 'btn small ghost', type: 'button', 'aria-label': `Delete snippet ${snippet.name}`, onClick: () => void deleteSnippet(snippet.id) },
        'Delete'
      )
    )
  }
}
