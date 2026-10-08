const OPTION_YES = /\b1\.\s+Yes\b/
const OPTION_NO = /\b\d\.\s+No\b/
const HINT = /Do you want to|Esc to cancel/i
const TAIL_LINES = 18

export function detectPermissionPrompt(tail: string): boolean {
  const text = tail
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-TAIL_LINES)
    .join('\n')
  return OPTION_YES.test(text) && (OPTION_NO.test(text) || HINT.test(text))
}
