import { parseChangelog } from '../shared/changelog'
import changelogText from '../../CHANGELOG.md?raw'

export const CHANGELOG_ENTRIES = parseChangelog(changelogText)
