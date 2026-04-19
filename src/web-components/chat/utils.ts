// src/web-components/chat/utils.ts
import type { ExplainNode, SourceMapEntry, BookmarkData, ConversationData } from './types.js'

// ── Greeting ──────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

// ── Relative time ─────────────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Bookmarks ─────────────────────────────────────────────────────────────

const BOOKMARK_KEY = 'falkordb-chat-bookmarks'

function loadBookmarks(): BookmarkData[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveBookmarks(bookmarks: BookmarkData[]): void {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks))
}

export function getBookmarks(): BookmarkData[] { return loadBookmarks() }

export function addBookmark(bookmark: Omit<BookmarkData, 'id' | 'createdAt'>): BookmarkData {
  const bookmarks = loadBookmarks()
  const newBookmark: BookmarkData = { ...bookmark, id: Date.now().toString(), createdAt: new Date().toISOString() }
  bookmarks.unshift(newBookmark)
  saveBookmarks(bookmarks)
  return newBookmark
}

export function removeBookmark(id: string): void {
  saveBookmarks(loadBookmarks().filter(b => b.id !== id))
}

export function isBookmarked(messageContent: string): boolean {
  return loadBookmarks().some(b => b.messageContent === messageContent)
}

// ── Entity annotation ─────────────────────────────────────────────────────
// Ported directly from GraphRAG-UI/app/src/lib/annotateEntities.ts

const PROTECTED_RE_SOURCE = '(```[\\s\\S]*?```|`[^`]+`|\\[[^\\]]*\\]\\([^)]*\\))'

export function annotateEntities(
  markdown: string,
  nodes: ExplainNode[] | undefined,
): { text: string; entityMap: Map<number, string> } {
  const entityMap = new Map<number, string>()
  if (!nodes || nodes.length === 0) return { text: markdown, entityMap }
  const entities = nodes.filter(n => n.type === 'entity')
  if (entities.length === 0) return { text: markdown, entityMap }
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  const protectedRe = new RegExp(PROTECTED_RE_SOURCE, 'g')
  const parts: { text: string; protected: boolean }[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = protectedRe.exec(markdown)) !== null) {
    if (match.index > lastIdx) parts.push({ text: markdown.slice(lastIdx, match.index), protected: false })
    parts.push({ text: match[0], protected: true })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < markdown.length) parts.push({ text: markdown.slice(lastIdx), protected: false })
  const searchEntries: { pattern: RegExp; entity: ExplainNode }[] = []
  for (const entity of sorted) {
    const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    searchEntries.push({ pattern: new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i'), entity })
  }
  for (const entity of sorted) {
    const words = entity.name.trim().split(/\s+/)
    if (words.length > 1) {
      const last = words[words.length - 1]
      if (last.length >= 3) {
        const escapedLast = last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        searchEntries.push({ pattern: new RegExp(`(?<!\\w)${escapedLast}(?!\\w)`, 'i'), entity })
      }
    }
  }
  const matched = new Set<string>()
  let entityIdx = 0
  for (const { pattern, entity } of searchEntries) {
    if (matched.has(entity.id)) continue
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].protected) continue
      const seg = parts[i].text
      const m = pattern.exec(seg)
      if (m) {
        const before = seg.slice(0, m.index)
        const after = seg.slice(m.index + m[0].length)
        const idx = entityIdx++
        entityMap.set(idx, entity.id)
        const link = `[${m[0]}](#e${idx})`
        const newParts: { text: string; protected: boolean }[] = []
        if (before) newParts.push({ text: before, protected: false })
        newParts.push({ text: link, protected: true })
        if (after) newParts.push({ text: after, protected: false })
        parts.splice(i, 1, ...newParts)
        matched.add(entity.id)
        break
      }
    }
  }
  return { text: parts.map(p => p.text).join(''), entityMap }
}

export function annotateSources(
  markdown: string,
  sourceMap: Record<string, SourceMapEntry> | undefined | null,
): string {
  if (!sourceMap || Object.keys(sourceMap).length === 0) return markdown
  const protectedRe = new RegExp(PROTECTED_RE_SOURCE, 'g')
  const parts: { text: string; protected: boolean }[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = protectedRe.exec(markdown)) !== null) {
    if (match.index > lastIdx) parts.push({ text: markdown.slice(lastIdx, match.index), protected: false })
    parts.push({ text: match[0], protected: true })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < markdown.length) parts.push({ text: markdown.slice(lastIdx), protected: false })
  const citationRe = /\[([\d,\s]+)\]/g
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].protected) continue
    parts[i].text = parts[i].text.replace(citationRe, (_full, inner: string) => {
      const nums = inner.split(',').map((s: string) => s.trim()).filter(Boolean)
      const mapped = nums.map((num: string) => sourceMap[num] ? `[\\[${num}\\]](#source:${num})` : `[${num}]`)
      if (mapped.every((m: string, idx: number) => m === `[${nums[idx]}]`)) return _full
      return mapped.join(' ')
    })
  }
  return parts.map(p => p.text).join('')
}

// ── Simple markdown → HTML ────────────────────────────────────────────────
// Minimal renderer for AI message content (bold, italic, code, links, lists)

export function renderMarkdown(md: string): string {
  // Step 1: Extract code blocks into placeholders BEFORE any other processing
  const codeBlocks: string[] = []
  let processed = md.replace(/```([\s\S]*?)```/g, (_m, inner: string) => {
    const content = inner.replace(/^[a-z]*\n/, '')
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const idx = codeBlocks.length
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`)
    return `\x00CODE${idx}\x00`
  })

  // Step 2: Escape HTML in the remaining text
  processed = processed
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Step 3: Inline code
    .replace(/`([^`]+)`/g, (_m, c: string) => `<code>${c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`)

  // Step 4: Bold / italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Step 5: Entity/source/regular links — sanitize href
    .replace(/\[([^\]]*)\]\(#e(\d+)\)/g, '<button class="fc-entity-link" data-entity-idx="$2">$1</button>')
    .replace(/\[\\\[(\d+)\\\]\]\(#source:(\d+)\)/g, '<button class="fc-source-link" data-source-num="$2">$1</button>')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
      // Block javascript: and data: URIs
      if (/^(javascript|data|vbscript):/i.test(href.trim())) return text
      return `<a href="${href.replace(/"/g, '%22')}" target="_blank" rel="noopener noreferrer">${text}</a>`
    })

  // Step 6: Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Step 7: Lists
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)

  // Step 8: Paragraphs and line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  // Step 9: Restore code blocks
  processed = processed.replace(/\x00CODE(\d+)\x00/g, (_m, idx: string) => codeBlocks[parseInt(idx)])

  return `<p>${processed}</p>`
}

// ── Conversation storage ──────────────────────────────────────────────────

const MAX_CONVERSATIONS = 20

export function storageKey(namespace: string): string { return `falkordb-chat-convos-${namespace}` }
export function activeKey(namespace: string): string { return `falkordb-chat-active-${namespace}` }

export function loadConversations(namespace: string): ConversationData[] {
  try {
    const raw = localStorage.getItem(storageKey(namespace))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveConversations(convos: ConversationData[], namespace: string): void {
  localStorage.setItem(storageKey(namespace), JSON.stringify(convos.slice(0, MAX_CONVERSATIONS)))
}

export function getActiveId(namespace: string): string | null {
  return localStorage.getItem(activeKey(namespace))
}

export function setActiveId(id: string | null, namespace: string): void {
  if (id) localStorage.setItem(activeKey(namespace), id)
  else localStorage.removeItem(activeKey(namespace))
}
