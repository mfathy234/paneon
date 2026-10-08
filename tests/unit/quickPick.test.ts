import { describe, expect, it } from 'vitest'
import { filterProjects, moveSelection, pickedAgent, toggleAgent } from '../../src/shared/quickPick'
import type { Project } from '../../src/shared/types'

const projects: Project[] = ['acme-web', 'billing-api', 'mobile-shell', 'docs-site', 'Admin-Tools'].map(
  (name, index): Project => ({
    id: `p${index}`,
    name,
    folder: `C:\\${name}`,
    defaultAgent: index === 1 ? 'codex' : 'claude'
  })
)

describe('filterProjects', () => {
  it('returns everything for an empty query', () => {
    expect(filterProjects(projects, '  ')).toEqual(projects)
  })

  it('is case-insensitive and lists prefix matches before substring matches', () => {
    const names = filterProjects(projects, 'A').map((p) => p.name)
    expect(names).toEqual(['acme-web', 'Admin-Tools', 'billing-api'])
  })

  it('returns nothing when no project matches', () => {
    expect(filterProjects(projects, 'zzz')).toEqual([])
  })
})

describe('moveSelection', () => {
  it('wraps in both directions', () => {
    expect(moveSelection(0, -1, 5)).toBe(4)
    expect(moveSelection(4, 1, 5)).toBe(0)
    expect(moveSelection(2, 1, 5)).toBe(3)
  })

  it('is safe on an empty list', () => {
    expect(moveSelection(0, 1, 0)).toBe(0)
  })
})

describe('quick-pick agent choice', () => {
  const [claudeProject, codexProject] = projects

  it('uses each project default agent', () => {
    expect(pickedAgent(claudeProject, {}, 'default')).toBe('claude')
    expect(pickedAgent(codexProject, {}, 'default')).toBe('codex')
  })

  it('the other-agent preset moves every project to the next agent', () => {
    expect(pickedAgent(claudeProject, {}, 'other')).toBe('codex')
    expect(pickedAgent(codexProject, {}, 'other')).toBe('gemini')
  })

  it('an agent preset starts every project on that agent, Tab still toggles from it', () => {
    expect(pickedAgent(claudeProject, {}, 'gemini')).toBe('gemini')
    expect(pickedAgent(codexProject, {}, 'claude')).toBe('claude')
    const toggled = toggleAgent(claudeProject, {}, 'gemini')
    expect(pickedAgent(claudeProject, toggled, 'gemini')).toBe('claude')
  })

  it('Tab toggles only the highlighted project and toggles back', () => {
    const once = toggleAgent(claudeProject, {}, 'default')
    expect(pickedAgent(claudeProject, once, 'default')).toBe('codex')
    expect(pickedAgent(codexProject, once, 'default')).toBe('codex')
    const twice = toggleAgent(claudeProject, once, 'default')
    expect(pickedAgent(claudeProject, twice, 'default')).toBe('gemini')
    const thrice = toggleAgent(claudeProject, twice, 'default')
    expect(pickedAgent(claudeProject, thrice, 'default')).toBe('claude')
  })

  it('a toggle on top of the other preset starts from the preset agent', () => {
    const toggled = toggleAgent(claudeProject, {}, 'other')
    expect(pickedAgent(claudeProject, toggled, 'other')).toBe('gemini')
  })

  it('does not mutate the previous overrides', () => {
    const before = {}
    toggleAgent(claudeProject, before, 'default')
    expect(before).toEqual({})
  })
})
