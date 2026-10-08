const svg = (size: number, body: string, stroke = 1.75): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

export const ICONS = {
  folder: svg(16, '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  folderLarge: svg(18, '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  plus: svg(14, '<path d="M12 5v14 M5 12h14"/>'),
  close: svg(16, '<path d="M18 6L6 18 M6 6l12 12"/>'),
  closeSmall: svg(10, '<path d="M18 6L6 18 M6 6l12 12"/>', 2),
  prev: svg(16, '<polyline points="15 18 9 12 15 6"/>'),
  next: svg(16, '<polyline points="9 18 15 12 9 6"/>'),
  maximize: svg(16, '<path d="M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7"/>'),
  restore: svg(16, '<path d="M4 14h6v6 M20 10h-6V4 M14 10l7-7 M3 21l7-7"/>'),
  collapse: svg(16, '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>'),
  expand: svg(16, '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>'),
  search: svg(16, '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  branch: svg(12, '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 7.5v9 M18 11.5c0 4-6 3-12 5.5"/>'),
  more: svg(16, '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', 2.5),
  history: svg(14, '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
  chevronRight: svg(14, '<polyline points="9 18 15 12 9 6"/>'),
  chevronUp: svg(14, '<polyline points="18 15 12 9 6 15"/>'),
  chevronDown: svg(14, '<polyline points="6 9 12 15 18 9"/>'),
  palette: svg(16, '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="15.5" cy="10" r="1"/><path d="M12 21a2 2 0 0 1-2-2c0-1.5 1-1.5 1-3a2 2 0 0 1 2-2h3"/>')
}

export const logoMark = (size: number): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 32 32" role="img" aria-label="Paneon logo"><rect x="3" y="3" width="12" height="12" rx="3" fill="var(--accent)"/><g fill="currentColor" fill-opacity=".3"><rect x="17" y="3" width="12" height="12" rx="3"/><rect x="3" y="17" width="12" height="12" rx="3"/><rect x="17" y="17" width="12" height="12" rx="3"/></g></svg>`
