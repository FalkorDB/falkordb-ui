# FalkorDB Chat Web Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `<falkordb-chat>` — a vanilla Web Component that ports the full GraphRAG-UI ChatView into a standalone, framework-agnostic element published as `@falkordb/ui/chat`.

**Architecture:** Extends `HTMLElement` with open shadow DOM, plain CSS injected at construction, TypeScript compiled via the existing Vite build. The host app supplies an `onQuery` callback; the component handles all UI state (messages, streaming, suggestions, sources, bookmarks, feedback).

**Tech Stack:** TypeScript, Vite (lib mode, new entry), vanilla Web Components API, localStorage, no React.

**Reference source:** `/Users/naseemali/Documents/GitHub/GraphRAG-UI/app/src/components/chat/` — port logic from here, removing React/Router/Context dependencies.

---

## Task 1: Types file

**Files:**
- Create: `src/web-components/chat/types.ts`

**Step 1: Create the types file**

```typescript
// src/web-components/chat/types.ts

export interface SuggestionItem {
  title: string
  question: string
  category: 'connection' | 'comparison' | 'deep-dive' | 'overview'
}

export interface ContextItem {
  content: string
  score: number | null
  metadata: Record<string, unknown> | null
}

export interface ExplainNode {
  id: string
  label: string
  name: string
  type: 'entity' | 'chunk' | 'document'
}

export interface ExplainLink {
  source: string
  target: string
  type: string
}

export interface ExplainGraph {
  nodes: ExplainNode[]
  links: ExplainLink[]
}

export interface SourceMapEntry {
  section: string
  index: number
  citation_index?: number
  content?: string
  source_doc?: string
  node_ids?: string[]
}

export interface QueryResult {
  answer: string
  queryId?: string | null
  context?: ContextItem[]
  explainGraph?: ExplainGraph | null
  sourceMap?: Record<string, SourceMapEntry> | null
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export type QueryStrategy = 'multi_path' | 'local' | null

export interface ChatConfig {
  userName?: string
  onQuery: (
    question: string,
    history: ChatHistoryMessage[],
    respond: (result: QueryResult) => void,
    streamToken?: (token: string) => void,
    signal?: AbortSignal
  ) => void
  onFeedback?: (queryId: string, rating: 'positive' | 'negative') => void
  onStrategyChange?: (strategy: QueryStrategy) => void
  onNewChat?: () => void
}

export interface ChatMessageData {
  id: string
  type: 'user' | 'ai'
  content: string
  context?: ContextItem[]
  explainGraph?: ExplainGraph | null
  sourceMap?: Record<string, SourceMapEntry> | null
  queryId?: string | null
  feedback?: 'positive' | 'negative' | null
  isStreaming?: boolean
  timestamp: string
}

export interface ConversationData {
  id: string
  title: string
  messages: ChatMessageData[]
  createdAt: string
}

export interface BookmarkData {
  id: string
  messageContent: string
  question: string
  conversationId: string
  createdAt: string
}
```

**Step 2: Commit**

```bash
git add src/web-components/chat/types.ts
git commit -m "feat(chat-wc): add types"
```

---

## Task 2: Utilities

**Files:**
- Create: `src/web-components/chat/utils.ts`

**Step 1: Create utils**

Port `getGreeting`, `formatRelativeTime`, `annotateEntities`, `annotateSources` from GraphRAG-UI — removing all React/framework imports. These are pure functions.

```typescript
// src/web-components/chat/utils.ts
import type { ExplainNode, SourceMapEntry, BookmarkData } from './types.js'

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
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```[\s\S]*?```/g, m => `<pre><code>${m.slice(3, -3).replace(/^[a-z]*\n/, '')}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links — handle entity links (#eN) and source links (#source:N) and regular
    .replace(/\[([^\]]*)\]\(#e(\d+)\)/g, '<button class="fc-entity-link" data-entity-idx="$2">$1</button>')
    .replace(/\[\\\[(\d+)\\\]\]\(#source:(\d+)\)/g, '<button class="fc-source-link" data-source-num="$2">$1</button>')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Unordered lists
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newline
    .replace(/\n/g, '<br>')
  return `<p>${html}</p>`
}

// ── Conversation storage ──────────────────────────────────────────────────

import type { ConversationData } from './types.js'

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
```

**Step 2: Commit**

```bash
git add src/web-components/chat/utils.ts
git commit -m "feat(chat-wc): add utilities (greeting, bookmarks, annotation, markdown, storage)"
```

---

## Task 3: CSS styles

**Files:**
- Create: `src/web-components/chat/styles.ts`

**Step 1: Create the styles module**

This exports a single string injected into shadow DOM. Uses CSS custom properties for theming.

```typescript
// src/web-components/chat/styles.ts

export const CHAT_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    --fc-primary: #7c3aed;
    --fc-primary-10: rgba(124,58,237,0.10);
    --fc-primary-20: rgba(124,58,237,0.20);
    --fc-primary-30: rgba(124,58,237,0.30);
    --fc-background: #ffffff;
    --fc-foreground: #0f0f0f;
    --fc-muted: #6b7280;
    --fc-muted-50: rgba(107,114,128,0.50);
    --fc-border: #e5e7eb;
    --fc-border-40: rgba(229,231,235,0.40);
    --fc-card: #f9fafb;
    --fc-accent: #f3f4f6;
    --fc-radius: 12px;
    --fc-destructive: #ef4444;
    --fc-green: #22c55e;
    --fc-blue: #3b82f6;
    --fc-amber: #f59e0b;
    --fc-purple: #a855f7;
    font-family: inherit;
    font-size: 14px;
    color: var(--fc-foreground);
    background: var(--fc-background);
    box-sizing: border-box;
  }

  *, *::before, *::after { box-sizing: inherit; }

  /* ── Scrollable message area ── */
  .fc-conversation {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 1rem;
    scroll-behavior: smooth;
  }

  /* ── Empty state ── */
  .fc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 1rem;
    text-align: center;
    gap: 0.5rem;
  }
  .fc-empty-label { font-size: 0.75rem; color: var(--fc-muted); font-weight: 500; }
  .fc-empty-title { font-size: 1.25rem; font-weight: 600; margin: 0; }
  .fc-empty-subtitle { font-size: 0.875rem; color: var(--fc-muted); max-width: 24rem; margin: 0; }

  /* ── Suggestion grid ── */
  .fc-suggestions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    max-width: 32rem;
    width: 100%;
    margin-top: 2rem;
  }
  .fc-suggestion-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    border-radius: var(--fc-radius);
    border: 1px solid var(--fc-border);
    background: var(--fc-card);
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .fc-suggestion-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); transform: translateY(-2px); }
  .fc-suggestion-card:disabled { opacity: 0.5; pointer-events: none; }
  .fc-suggestion-icon {
    display: flex; align-items: center; justify-content: center;
    width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; flex-shrink: 0;
    transition: transform 0.2s;
  }
  .fc-suggestion-card:hover .fc-suggestion-icon { transform: scale(1.1); }
  .fc-suggestion-title { font-size: 0.875rem; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .fc-suggestion-question { font-size: 0.75rem; color: var(--fc-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .fc-suggestion-arrow { font-size: 0.875rem; color: var(--fc-muted); opacity: 0; margin-left: auto; flex-shrink: 0; transition: all 0.2s; }
  .fc-suggestion-card:hover .fc-suggestion-arrow { opacity: 0.5; }

  /* Category colour accents */
  .fc-cat-connection .fc-suggestion-icon { background: rgba(59,130,246,0.10); color: #3b82f6; }
  .fc-cat-comparison .fc-suggestion-icon { background: rgba(245,158,11,0.10); color: #f59e0b; }
  .fc-cat-deep-dive  .fc-suggestion-icon { background: rgba(168,85,247,0.10); color: #a855f7; }
  .fc-cat-overview   .fc-suggestion-icon { background: var(--fc-primary-10); color: var(--fc-primary); }

  /* ── Messages ── */
  .fc-messages { display: flex; flex-direction: column; gap: 1.5rem; max-width: 48rem; margin: 0 auto; }

  .fc-msg-user { display: flex; justify-content: flex-end; }
  .fc-msg-user-bubble {
    background: var(--fc-primary-10); border: 1px solid var(--fc-primary-20);
    border-radius: var(--fc-radius); padding: 0.625rem 1rem;
    max-width: 80%; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap;
  }

  .fc-msg-ai { display: flex; flex-direction: column; }
  .fc-msg-ai-content {
    border-left: 2px solid var(--fc-primary-30);
    padding-left: 1rem;
    font-size: 0.875rem; line-height: 1.7;
  }
  .fc-msg-ai-content p { margin: 0 0 0.5rem; }
  .fc-msg-ai-content p:last-child { margin-bottom: 0; }
  .fc-msg-ai-content h1, .fc-msg-ai-content h2, .fc-msg-ai-content h3 { margin: 0.75rem 0 0.25rem; font-weight: 600; }
  .fc-msg-ai-content ul { margin: 0.25rem 0; padding-left: 1.25rem; }
  .fc-msg-ai-content li { margin: 0.125rem 0; }
  .fc-msg-ai-content code { font-family: monospace; font-size: 0.8em; background: var(--fc-accent); padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
  .fc-msg-ai-content pre { background: var(--fc-accent); padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.5rem 0; }
  .fc-msg-ai-content pre code { background: none; padding: 0; }
  .fc-msg-ai-content a { color: var(--fc-primary); }

  .fc-cursor { display: inline-block; width: 0.5rem; height: 1rem; background: var(--fc-primary); opacity: 0.7; border-radius: 2px; margin-left: 2px; vertical-align: text-bottom; animation: fc-blink 1s step-end infinite; }
  @keyframes fc-blink { 0%,100%{opacity:.7} 50%{opacity:0} }

  /* Entity / source buttons inside AI content */
  button.fc-entity-link { color: var(--fc-primary); font-weight: 500; text-decoration: underline; text-underline-offset: 2px; background: none; border: none; cursor: pointer; font-size: inherit; padding: 0; }
  button.fc-source-link { display: inline-flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; color: var(--fc-primary); background: var(--fc-primary-10); border: none; border-radius: 0.25rem; padding: 0 0.25rem; min-width: 1.25rem; cursor: pointer; vertical-align: super; line-height: 1.4; }

  /* ── AI toolbar (copy / bookmark / feedback) ── */
  .fc-msg-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 0.375rem; padding-left: 1rem; opacity: 0; transition: opacity 0.15s;
  }
  .fc-msg-ai:hover .fc-msg-toolbar { opacity: 1; }
  .fc-toolbar-left { display: flex; align-items: center; gap: 0.5rem; }
  .fc-toolbar-btn {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.125rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem;
    color: var(--fc-muted); background: none; border: none; cursor: pointer; transition: all 0.15s;
  }
  .fc-toolbar-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }
  .fc-toolbar-btn.fc-bookmarked { color: var(--fc-primary); opacity: 1; }
  .fc-toolbar-timestamp { font-size: 0.6875rem; color: var(--fc-muted-50); }
  .fc-feedback-wrap { display: inline-flex; align-items: center; border: 1px solid var(--fc-border); border-radius: 0.5rem; padding: 0.125rem; }
  .fc-feedback-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;
    background: none; border: none; cursor: pointer; color: var(--fc-muted); transition: all 0.15s;
  }
  .fc-feedback-btn:hover.fc-thumb-up   { color: var(--fc-green); background: rgba(34,197,94,0.1); }
  .fc-feedback-btn:hover.fc-thumb-down { color: var(--fc-destructive); background: rgba(239,68,68,0.1); }
  .fc-feedback-btn.fc-active-up   { color: var(--fc-green); background: rgba(34,197,94,0.15); }
  .fc-feedback-btn.fc-active-down { color: var(--fc-destructive); background: rgba(239,68,68,0.15); }

  /* ── Sources panel ── */
  .fc-sources { margin-top: 0.5rem; padding-left: 1rem; }
  .fc-sources-toggle { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 500; color: var(--fc-primary); background: none; border: none; cursor: pointer; padding: 0; }
  .fc-sources-toggle svg { transition: transform 0.2s; }
  .fc-sources-toggle.fc-open svg { transform: rotate(180deg); }
  .fc-sources-body { margin-top: 0.5rem; max-width: 32rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .fc-source-section-label { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; }
  .fc-source-section-text { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .fc-source-section-line { flex: 1; height: 1px; }
  .fc-source-card {
    width: 100%; text-align: left; border-radius: 0.5rem; border: 1px solid var(--fc-border);
    padding: 0.5rem 0.75rem; cursor: pointer; background: var(--fc-accent); transition: all 0.15s;
    font-size: inherit;
  }
  .fc-source-card:hover { background: var(--fc-card); }
  .fc-source-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
  .fc-source-badge { font-size: 0.625rem; font-weight: 700; border-radius: 0.25rem; border: 1px solid; padding: 0.125rem 0.375rem; display: inline-flex; align-items: center; gap: 0.25rem; }
  .fc-source-idx { font-size: 0.625rem; font-family: monospace; color: var(--fc-muted-50); }
  .fc-source-content { font-size: 0.75rem; color: var(--fc-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }
  .fc-source-doc { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.375rem; font-size: 0.625rem; color: var(--fc-muted-50); }

  /* Section colours */
  .fc-sect-entity .fc-source-section-text  { color: var(--fc-green); }
  .fc-sect-entity .fc-source-section-line  { background: rgba(34,197,94,0.2); }
  .fc-sect-entity .fc-source-badge         { color: var(--fc-green); border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); }
  .fc-sect-rel    .fc-source-section-text  { color: var(--fc-blue); }
  .fc-sect-rel    .fc-source-section-line  { background: rgba(59,130,246,0.2); }
  .fc-sect-rel    .fc-source-badge         { color: var(--fc-blue); border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); }
  .fc-sect-passage .fc-source-section-text { color: var(--fc-amber); }
  .fc-sect-passage .fc-source-section-line { background: rgba(245,158,11,0.2); }
  .fc-sect-passage .fc-source-badge        { color: var(--fc-amber); border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); }

  /* ── Bottom input area ── */
  .fc-bottom { padding: 1rem; background: var(--fc-background); }
  .fc-input-row { display: flex; align-items: center; gap: 0.5rem; max-width: 48rem; margin: 0 auto; }
  .fc-new-chat-btn {
    display: flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border-radius: var(--fc-radius); flex-shrink: 0;
    border: 1px solid var(--fc-border); background: var(--fc-background); cursor: pointer; color: var(--fc-muted);
    transition: all 0.15s;
  }
  .fc-new-chat-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }

  /* ── Query input ── */
  .fc-query-wrap { flex: 1; border: 1px solid var(--fc-border); border-radius: var(--fc-radius); background: var(--fc-background); overflow: hidden; }
  .fc-query-inner { display: flex; align-items: flex-end; padding: 0.375rem 0.5rem; gap: 0.25rem; }
  .fc-query-textarea {
    flex: 1; resize: none; border: none; outline: none; background: transparent;
    font-family: inherit; font-size: 0.875rem; color: var(--fc-foreground);
    max-height: 8rem; min-height: 2rem; line-height: 1.5; padding: 0.25rem 0.25rem;
  }
  .fc-query-textarea::placeholder { color: var(--fc-muted); }
  .fc-query-textarea:disabled { opacity: 0.5; }
  .fc-action-btn {
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem; border-radius: 0.5rem; border: none;
    cursor: pointer; flex-shrink: 0; transition: all 0.15s;
  }
  .fc-send-btn { background: var(--fc-primary); color: white; }
  .fc-send-btn:hover { opacity: 0.9; }
  .fc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fc-stop-btn { background: var(--fc-destructive); color: white; }
  .fc-stop-btn:hover { opacity: 0.9; }
  .fc-strategy-btn { background: none; color: var(--fc-muted); }
  .fc-strategy-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }

  /* ── Strategy popover ── */
  .fc-popover {
    position: absolute; bottom: calc(100% + 0.5rem); right: 0;
    background: var(--fc-background); border: 1px solid var(--fc-border);
    border-radius: var(--fc-radius); padding: 0.5rem; min-width: 14rem; z-index: 50;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    display: none;
  }
  .fc-popover.fc-open { display: block; }
  .fc-popover-label { font-size: 0.75rem; font-weight: 600; color: var(--fc-muted); padding: 0 0.25rem; margin-bottom: 0.25rem; }
  .fc-strategy-option {
    display: flex; flex-direction: column; align-items: flex-start;
    width: 100%; border-radius: 0.375rem; padding: 0.375rem 0.5rem;
    border: none; cursor: pointer; background: none; transition: all 0.15s; text-align: left;
  }
  .fc-strategy-option:hover { background: var(--fc-accent); }
  .fc-strategy-option.fc-active { background: var(--fc-primary-10); color: var(--fc-primary); }
  .fc-strategy-name { font-size: 0.75rem; font-weight: 500; }
  .fc-strategy-desc { font-size: 0.625rem; color: var(--fc-muted); }

  /* ── Scroll to bottom ── */
  .fc-scroll-btn {
    position: absolute; bottom: 5rem; left: 50%; transform: translateX(-50%);
    background: var(--fc-background); border: 1px solid var(--fc-border);
    border-radius: 9999px; padding: 0.375rem 0.75rem; font-size: 0.75rem;
    color: var(--fc-muted); cursor: pointer; display: none; z-index: 10;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.15s;
  }
  .fc-scroll-btn.fc-visible { display: block; }
  .fc-scroll-btn:hover { color: var(--fc-foreground); }

  /* ── SVG icons inline ── */
  svg { display: inline-block; vertical-align: middle; }
`
```

**Step 2: Commit**

```bash
git add src/web-components/chat/styles.ts
git commit -m "feat(chat-wc): add shadow DOM styles"
```

---

## Task 4: Main chat class — skeleton + lifecycle

**Files:**
- Create: `src/web-components/chat/chat.ts`

**Step 1: Create the class skeleton**

This is the core file. Build it in stages — start with lifecycle, state, and shadow DOM setup. No rendering logic yet.

```typescript
// src/web-components/chat/chat.ts

import { CHAT_STYLES } from './styles.js'
import type { ChatConfig, ChatMessageData, ConversationData, SuggestionItem, QueryStrategy } from './types.js'
import {
  getGreeting, formatRelativeTime, annotateEntities, annotateSources, renderMarkdown,
  loadConversations, saveConversations, getActiveId, setActiveId,
  addBookmark, removeBookmark, isBookmarked, getBookmarks,
} from './utils.js'

export class FalkorDBChat extends HTMLElement {
  private shadow: ShadowRoot
  private config: ChatConfig | null = null
  private suggestions: SuggestionItem[] = []
  private messages: ChatMessageData[] = []
  private conversationId: string | null = null
  private isProcessing = false
  private isStreaming = false
  private abortController: AbortController | null = null
  private strategy: QueryStrategy = 'multi_path'
  private namespace = 'default'

  // DOM refs
  private conversationEl!: HTMLElement
  private inputEl!: HTMLTextAreaElement
  private sendBtn!: HTMLButtonElement
  private stopBtn!: HTMLButtonElement
  private newChatBtn!: HTMLButtonElement
  private strategyBtn!: HTMLButtonElement
  private strategyPopover!: HTMLElement
  private scrollBtn!: HTMLButtonElement

  static get observedAttributes() {
    return ['user-name', 'placeholder', 'read-only', 'namespace']
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.namespace = this.getAttribute('namespace') || 'default'
    this.render()
    this.bindEvents()
    this.loadState()
    this.refresh()
  }

  disconnectedCallback() {
    this.abortController?.abort()
  }

  attributeChangedCallback(name: string, _old: string, value: string) {
    if (name === 'namespace') this.namespace = value || 'default'
    if (this.shadow.innerHTML) this.refresh()
  }

  // ── Public API ──────────────────────────────────────────────────────────

  setConfig(config: ChatConfig) {
    this.config = config
    if (config.userName && this.shadow.innerHTML) this.refresh()
  }

  setSuggestions(suggestions: SuggestionItem[]) {
    this.suggestions = suggestions
    if (this.shadow.innerHTML) this.refresh()
  }

  sendMessage(text: string) {
    if (text.trim()) this.handleSend(text.trim())
  }

  newChat() {
    this.handleNewChat()
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private getUserName(): string {
    return this.config?.userName || this.getAttribute('user-name') || ''
  }

  private getPlaceholder(): string {
    return this.getAttribute('placeholder') || 'Ask a question...'
  }

  private isReadOnly(): boolean {
    return this.hasAttribute('read-only')
  }

  private loadState() {
    const activeId = getActiveId(this.namespace)
    if (activeId) {
      const convos = loadConversations(this.namespace)
      const convo = convos.find(c => c.id === activeId)
      if (convo) {
        this.conversationId = convo.id
        this.messages = convo.messages
      }
    }
  }

  private persistMessages(id: string, msgs: ChatMessageData[]) {
    const convos = loadConversations(this.namespace)
    const idx = convos.findIndex(c => c.id === id)
    const title = msgs.find(m => m.type === 'user')?.content.slice(0, 50) || 'New Chat'
    const convo: ConversationData = {
      id, title, messages: msgs,
      createdAt: idx >= 0 ? convos[idx].createdAt : new Date().toISOString(),
    }
    if (idx >= 0) convos[idx] = convo
    else convos.unshift(convo)
    saveConversations(convos, this.namespace)
  }

  // render(), bindEvents(), refresh(), handleSend(), handleNewChat(), etc.
  // — implemented in subsequent tasks
  private render() { /* Task 5 */ }
  private bindEvents() { /* Task 6 */ }
  private refresh() { /* Task 7 */ }
  private async handleSend(_text: string) { /* Task 8 */ }
  private handleNewChat() { /* Task 9 */ }
}

customElements.define('falkordb-chat', FalkorDBChat)
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): add FalkorDBChat class skeleton"
```

---

## Task 5: render() — shadow DOM HTML structure

**Files:**
- Modify: `src/web-components/chat/chat.ts` — replace `render()` stub

**Step 1: Implement render()**

Replace the `private render() { /* Task 5 */ }` line with:

```typescript
  private render() {
    const style = document.createElement('style')
    style.textContent = CHAT_STYLES
    this.shadow.appendChild(style)

    const wrapper = document.createElement('div')
    wrapper.className = 'fc-wrapper'
    wrapper.style.cssText = 'display:flex;flex-direction:column;height:100%;width:100%;position:relative;'
    wrapper.innerHTML = `
      <div class="fc-conversation"></div>
      <button class="fc-scroll-btn" aria-label="Scroll to bottom">↓ Latest</button>
      <div class="fc-bottom">
        <div class="fc-input-row">
          <button class="fc-new-chat-btn" title="New chat" style="display:none">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div class="fc-query-wrap" style="position:relative">
            <div class="fc-popover">
              <p class="fc-popover-label">Query Mode</p>
              <button class="fc-strategy-option" data-value="multi_path">
                <span class="fc-strategy-name">Deep Search</span>
                <span class="fc-strategy-desc">Comprehensive search across the full graph</span>
              </button>
              <button class="fc-strategy-option" data-value="local">
                <span class="fc-strategy-name">Fast</span>
                <span class="fc-strategy-desc">Quick answers from nearby context</span>
              </button>
              <button class="fc-strategy-option" data-value="null">
                <span class="fc-strategy-name">Auto</span>
                <span class="fc-strategy-desc">Let the system choose the best approach</span>
              </button>
            </div>
            <div class="fc-query-inner">
              <textarea class="fc-query-textarea" rows="1" placeholder="${this.getPlaceholder()}"></textarea>
              <button class="fc-action-btn fc-strategy-btn" title="Query strategy" type="button">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="fc-action-btn fc-send-btn" type="button" title="Send (Enter)">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
              <button class="fc-action-btn fc-stop-btn" type="button" title="Stop" style="display:none">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    this.shadow.appendChild(wrapper)

    this.conversationEl = this.shadow.querySelector('.fc-conversation')!
    this.inputEl = this.shadow.querySelector('.fc-query-textarea')!
    this.sendBtn = this.shadow.querySelector('.fc-send-btn')!
    this.stopBtn = this.shadow.querySelector('.fc-stop-btn')!
    this.newChatBtn = this.shadow.querySelector('.fc-new-chat-btn')!
    this.strategyBtn = this.shadow.querySelector('.fc-strategy-btn')!
    this.strategyPopover = this.shadow.querySelector('.fc-popover')!
    this.scrollBtn = this.shadow.querySelector('.fc-scroll-btn')!
  }
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): implement render() shadow DOM structure"
```

---

## Task 6: bindEvents()

**Files:**
- Modify: `src/web-components/chat/chat.ts` — replace `bindEvents()` stub

**Step 1: Implement bindEvents()**

```typescript
  private bindEvents() {
    // Send on Enter (not Shift+Enter)
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = this.inputEl.value.trim()
        if (text && !this.isProcessing) this.handleSend(text)
      }
    })

    // Auto-resize textarea
    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto'
      this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 128)}px`
    })

    // Send button
    this.sendBtn.addEventListener('click', () => {
      const text = this.inputEl.value.trim()
      if (text && !this.isProcessing) this.handleSend(text)
    })

    // Stop button
    this.stopBtn.addEventListener('click', () => this.handleStop())

    // New chat
    this.newChatBtn.addEventListener('click', () => this.handleNewChat())

    // Strategy popover toggle
    this.strategyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.strategyPopover.classList.toggle('fc-open')
    })

    // Strategy options
    this.strategyPopover.querySelectorAll('.fc-strategy-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = (btn as HTMLElement).dataset.value
        this.strategy = (val === 'null' ? null : val) as QueryStrategy
        this.config?.onStrategyChange?.(this.strategy)
        this.strategyPopover.classList.remove('fc-open')
        this.updateStrategyUI()
      })
    })

    // Close popover on outside click
    this.shadow.addEventListener('click', () => this.strategyPopover.classList.remove('fc-open'))

    // Scroll to bottom button
    this.conversationEl.addEventListener('scroll', () => {
      const el = this.conversationEl
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      this.scrollBtn.classList.toggle('fc-visible', !atBottom)
    })
    this.scrollBtn.addEventListener('click', () => {
      this.conversationEl.scrollTo({ top: this.conversationEl.scrollHeight, behavior: 'smooth' })
    })
  }

  private updateStrategyUI() {
    this.strategyPopover.querySelectorAll('.fc-strategy-option').forEach(btn => {
      const val = (btn as HTMLElement).dataset.value
      const active = (val === 'null' && this.strategy === null) || val === this.strategy
      btn.classList.toggle('fc-active', active)
    })
  }
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): implement bindEvents()"
```

---

## Task 7: refresh() — render messages or empty state

**Files:**
- Modify: `src/web-components/chat/chat.ts` — replace `refresh()` stub

**Step 1: Implement refresh() and all rendering helpers**

```typescript
  private refresh() {
    if (!this.conversationEl) return
    this.conversationEl.innerHTML = ''
    const inner = document.createElement('div')
    inner.className = 'fc-messages'
    inner.style.cssText = 'max-width:48rem;margin:0 auto;'

    if (this.messages.length === 0) {
      inner.appendChild(this.renderEmptyState())
    } else {
      this.messages.forEach((msg, idx) => {
        const question = msg.type === 'ai'
          ? this.messages.slice(0, idx).reverse().find(m => m.type === 'user')?.content
          : undefined
        inner.appendChild(this.renderMessage(msg, question))
      })
    }

    this.conversationEl.appendChild(inner)
    this.scrollToBottom()

    // Toggle new chat button
    this.newChatBtn.style.display = this.messages.length > 0 ? 'flex' : 'none'

    // Update send/stop visibility
    this.sendBtn.style.display = this.isStreaming ? 'none' : 'flex'
    this.stopBtn.style.display = this.isStreaming ? 'flex' : 'none'
    this.sendBtn.disabled = this.isProcessing || this.isReadOnly()
    this.inputEl.disabled = this.isProcessing || this.isReadOnly()
    this.inputEl.placeholder = this.isReadOnly()
      ? 'Read only mode'
      : this.getPlaceholder()

    this.updateStrategyUI()
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      this.conversationEl.scrollTop = this.conversationEl.scrollHeight
    })
  }

  private renderEmptyState(): HTMLElement {
    const userName = this.getUserName()
    const greeting = getGreeting()

    const el = document.createElement('div')
    el.className = 'fc-empty'
    el.innerHTML = `
      <span class="fc-empty-label">Your graph assistant</span>
      <h2 class="fc-empty-title">${userName ? `${greeting}, ${userName}` : 'Explore your knowledge graph'}</h2>
      <p class="fc-empty-subtitle">Ask questions and explore the knowledge in your data</p>
    `

    if (this.suggestions.length > 0) {
      const grid = document.createElement('div')
      grid.className = 'fc-suggestions'
      this.suggestions.forEach(s => {
        const card = this.renderSuggestionCard(s)
        grid.appendChild(card)
      })
      el.appendChild(grid)
    }

    return el
  }

  private renderSuggestionCard(s: SuggestionItem): HTMLElement {
    const catClass = `fc-cat-${s.category}`
    const icons: Record<string, string> = {
      connection: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      comparison: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`,
      'deep-dive': `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      overview: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    }
    const btn = document.createElement('button')
    btn.className = `fc-suggestion-card ${catClass}`
    btn.innerHTML = `
      <div class="fc-suggestion-icon">${icons[s.category] || icons.overview}</div>
      <div style="flex:1;min-width:0">
        <p class="fc-suggestion-title">${s.title}</p>
        <p class="fc-suggestion-question">${s.question}</p>
      </div>
      <span class="fc-suggestion-arrow">→</span>
    `
    btn.addEventListener('click', () => this.handleSend(s.question))
    return btn
  }

  private renderMessage(msg: ChatMessageData, question?: string): HTMLElement {
    if (msg.type === 'user') {
      const el = document.createElement('div')
      el.className = 'fc-msg-user'
      el.innerHTML = `<div class="fc-msg-user-bubble">${msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`
      return el
    }

    // AI message
    const el = document.createElement('div')
    el.className = 'fc-msg-ai'
    el.dataset.msgId = msg.id

    // Annotate content
    let displayContent = msg.content
    const entityMap = new Map<number, string>()
    if (msg.explainGraph) {
      const ann = annotateEntities(displayContent, msg.explainGraph.nodes)
      displayContent = ann.text
      ann.entityMap.forEach((v, k) => entityMap.set(k, v))
    }
    displayContent = annotateSources(displayContent, msg.sourceMap)

    const contentEl = document.createElement('div')
    contentEl.className = 'fc-msg-ai-content'
    contentEl.innerHTML = renderMarkdown(displayContent)

    if (msg.isStreaming) {
      const cursor = document.createElement('span')
      cursor.className = 'fc-cursor'
      contentEl.appendChild(cursor)
    }

    el.appendChild(contentEl)

    // Wire up entity & source link clicks
    contentEl.querySelectorAll('.fc-entity-link').forEach(btn => {
      const idx = parseInt((btn as HTMLElement).dataset.entityIdx || '0')
      const entityId = entityMap.get(idx)
      if (entityId) {
        btn.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('falkordb-chat-entity-click', {
            bubbles: true, composed: true, detail: { entityId, graph: msg.explainGraph }
          }))
        })
      }
    })
    contentEl.querySelectorAll('.fc-source-link').forEach(btn => {
      const num = (btn as HTMLElement).dataset.sourceNum
      if (num && msg.sourceMap?.[num]) {
        btn.addEventListener('click', () => {
          const entry = msg.sourceMap![num]
          this.dispatchEvent(new CustomEvent('falkordb-chat-source-click', {
            bubbles: true, composed: true, detail: { entry, graph: msg.explainGraph }
          }))
        })
      }
    })

    // Toolbar (hidden while streaming)
    if (!msg.isStreaming) {
      const toolbar = this.renderToolbar(msg, question)
      el.appendChild(toolbar)

      // Sources panel
      if (msg.context && msg.context.length > 0) {
        el.appendChild(this.renderSourcesPanel(msg))
      }
    }

    return el
  }

  private renderToolbar(msg: ChatMessageData, question?: string): HTMLElement {
    const toolbar = document.createElement('div')
    toolbar.className = 'fc-msg-toolbar'

    const left = document.createElement('div')
    left.className = 'fc-toolbar-left'

    // Timestamp
    if (msg.timestamp) {
      const ts = document.createElement('span')
      ts.className = 'fc-toolbar-timestamp'
      ts.textContent = formatRelativeTime(msg.timestamp)
      left.appendChild(ts)
    }

    // Copy
    const copyBtn = document.createElement('button')
    copyBtn.className = 'fc-toolbar-btn'
    copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(msg.content)
      copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> <span style="color:var(--fc-green)">Copied</span>`
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`
      }, 2000)
    })
    left.appendChild(copyBtn)

    // Bookmark
    const bkmBtn = document.createElement('button')
    const bookmarked = isBookmarked(msg.content)
    bkmBtn.className = `fc-toolbar-btn${bookmarked ? ' fc-bookmarked' : ''}`
    const bookmarkIcon = `<svg width="12" height="12" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
    bkmBtn.innerHTML = `${bookmarkIcon} ${bookmarked ? 'Saved' : 'Save'}`
    bkmBtn.addEventListener('click', () => {
      if (isBookmarked(msg.content)) {
        const bkms = getBookmarks()
        const existing = bkms.find(b => b.messageContent === msg.content)
        if (existing) removeBookmark(existing.id)
        bkmBtn.className = 'fc-toolbar-btn'
        bkmBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save`
      } else {
        addBookmark({ messageContent: msg.content, question: question || '', conversationId: this.conversationId || '' })
        bkmBtn.className = 'fc-toolbar-btn fc-bookmarked'
        bkmBtn.innerHTML = `<svg width="12" height="12" fill="currentColor" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saved`
      }
    })
    left.appendChild(bkmBtn)
    toolbar.appendChild(left)

    // Feedback
    if (msg.queryId && this.config?.onFeedback) {
      const feedbackWrap = document.createElement('div')
      feedbackWrap.className = 'fc-feedback-wrap'

      const upBtn = document.createElement('button')
      upBtn.className = `fc-feedback-btn fc-thumb-up${msg.feedback === 'positive' ? ' fc-active-up' : ''}`
      upBtn.title = 'Good response'
      upBtn.innerHTML = `<svg width="14" height="14" fill="${msg.feedback === 'positive' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`
      upBtn.addEventListener('click', () => {
        this.config!.onFeedback!(msg.queryId!, 'positive')
        this.updateMessageFeedback(msg.id, 'positive')
      })

      const downBtn = document.createElement('button')
      downBtn.className = `fc-feedback-btn fc-thumb-down${msg.feedback === 'negative' ? ' fc-active-down' : ''}`
      downBtn.title = 'Bad response'
      downBtn.innerHTML = `<svg width="14" height="14" fill="${msg.feedback === 'negative' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`
      downBtn.addEventListener('click', () => {
        this.config!.onFeedback!(msg.queryId!, 'negative')
        this.updateMessageFeedback(msg.id, 'negative')
      })

      feedbackWrap.appendChild(upBtn)
      feedbackWrap.appendChild(downBtn)
      toolbar.appendChild(feedbackWrap)
    }

    return toolbar
  }

  private updateMessageFeedback(msgId: string, rating: 'positive' | 'negative') {
    const idx = this.messages.findIndex(m => m.id === msgId)
    if (idx >= 0) {
      this.messages[idx] = { ...this.messages[idx], feedback: rating }
      if (this.conversationId) this.persistMessages(this.conversationId, this.messages)
      // Re-render just the toolbar for that message
      const msgEl = this.shadow.querySelector(`[data-msg-id="${msgId}"]`)
      if (msgEl) {
        const toolbarEl = msgEl.querySelector('.fc-msg-toolbar')
        if (toolbarEl) {
          const question = this.messages.slice(0, idx).reverse().find(m => m.type === 'user')?.content
          toolbarEl.replaceWith(this.renderToolbar(this.messages[idx], question))
        }
      }
    }
  }

  private renderSourcesPanel(msg: ChatMessageData): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'fc-sources'

    const toggle = document.createElement('button')
    toggle.className = 'fc-sources-toggle'
    toggle.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Graph retrieval path <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`

    const body = document.createElement('div')
    body.className = 'fc-sources-body'
    body.style.display = 'none'

    toggle.addEventListener('click', () => {
      const open = body.style.display !== 'none'
      body.style.display = open ? 'none' : 'flex'
      toggle.classList.toggle('fc-open', !open)

      if (!open && body.childElementCount === 0) {
        this.populateSourcesPanel(body, msg)
      }
    })

    wrap.appendChild(toggle)
    wrap.appendChild(body)
    return wrap
  }

  private populateSourcesPanel(body: HTMLElement, msg: ChatMessageData) {
    const context = msg.context || []
    const entities = context.filter(i => (i.metadata as Record<string,unknown>)?.section === 'entity')
    const relationships = context.filter(i => (i.metadata as Record<string,unknown>)?.section === 'relationship')
    const passages = context.filter(i => {
      const s = (i.metadata as Record<string,unknown>)?.section as string
      return s !== 'entity' && s !== 'relationship' && s !== 'entities' && s !== 'relationships'
    })

    const makeSection = (items: typeof context, sectClass: string, label: string, badgeLabel: string) => {
      if (items.length === 0) return
      const sec = document.createElement('div')
      sec.innerHTML = `
        <div class="fc-source-section-label ${sectClass}">
          <span class="fc-source-section-text">${label}</span>
          <div class="fc-source-section-line"></div>
        </div>
      `
      items.forEach((item, i) => {
        const card = document.createElement('button')
        card.className = 'fc-source-card'
        const sourceDoc = (item.metadata as Record<string,unknown>)?.source_doc as string | undefined
        card.innerHTML = `
          <div class="fc-source-card-header ${sectClass}">
            <span class="fc-source-badge">${badgeLabel}</span>
            <span class="fc-source-idx">[${i + 1}]</span>
          </div>
          <p class="fc-source-content">${item.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
          ${sourceDoc ? `<div class="fc-source-doc">📄 ${sourceDoc}</div>` : ''}
        `
        card.addEventListener('click', () => {
          const section = (item.metadata as Record<string,unknown>)?.section as string
          this.dispatchEvent(new CustomEvent('falkordb-chat-source-click', {
            bubbles: true, composed: true,
            detail: { entry: { section, content: item.content }, graph: msg.explainGraph }
          }))
        })
        sec.appendChild(card)
      })
      body.appendChild(sec)
    }

    makeSection(entities, 'fc-sect-entity', 'Graph Entities', 'Entity')
    makeSection(relationships, 'fc-sect-rel', 'Graph Knowledge', 'Graph Edge')
    makeSection(passages, 'fc-sect-passage', 'Source Passages', 'Passage')
  }
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): implement refresh(), renderEmptyState(), renderMessage(), renderToolbar(), renderSourcesPanel()"
```

---

## Task 8: handleSend() — query flow with streaming support

**Files:**
- Modify: `src/web-components/chat/chat.ts` — replace `handleSend()` stub

**Step 1: Implement handleSend()**

```typescript
  private async handleSend(text: string) {
    if (this.isProcessing || !this.config) return

    this.isProcessing = true
    this.isStreaming = false
    this.abortController = new AbortController()

    const currentId = this.conversationId || Date.now().toString()
    if (!this.conversationId) {
      this.conversationId = currentId
      setActiveId(currentId, this.namespace)
    }

    const userMsg: ChatMessageData = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const aiMsgId = (Date.now() + 1).toString()
    const streamingMsg: ChatMessageData = {
      id: aiMsgId,
      type: 'ai',
      content: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    }

    this.messages = [...this.messages, userMsg, streamingMsg]
    this.inputEl.value = ''
    this.inputEl.style.height = 'auto'
    this.isStreaming = true
    this.refresh()
    this.persistMessages(currentId, this.messages.filter(m => !m.isStreaming))

    const history = this.messages
      .filter(m => !m.isStreaming && m.id !== userMsg.id)
      .map(m => ({ role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }))

    const streamToken = (token: string) => {
      const idx = this.messages.findIndex(m => m.id === aiMsgId)
      if (idx >= 0) {
        this.messages[idx] = { ...this.messages[idx], content: token }
        // Update just the AI content in DOM without full re-render
        const msgEl = this.shadow.querySelector(`[data-msg-id="${aiMsgId}"]`)
        if (msgEl) {
          const contentEl = msgEl.querySelector('.fc-msg-ai-content')
          if (contentEl) {
            contentEl.innerHTML = renderMarkdown(token)
            const cursor = document.createElement('span')
            cursor.className = 'fc-cursor'
            contentEl.appendChild(cursor)
          }
        }
        this.scrollToBottom()
      }
    }

    const respond = (result: import('./types.js').QueryResult) => {
      const noContextPatterns = [
        /does not provide/i,
        /do(es)?n't (have|contain|include|mention|provide)/i,
        /no (relevant|related|matching) (information|data|context|results)/i,
        /cannot (find|answer|determine)/i,
        /I (don't|do not) have (enough )?(information|context|data)/i,
      ]
      const answerLooksEmpty = noContextPatterns.some(p => p.test(result.answer))
      const effectiveGraph = answerLooksEmpty ? null : (result.explainGraph ?? null)

      const aiMsg: ChatMessageData = {
        id: aiMsgId,
        type: 'ai',
        content: result.answer,
        context: result.context,
        explainGraph: effectiveGraph,
        sourceMap: result.sourceMap,
        queryId: result.queryId,
        feedback: null,
        isStreaming: false,
        timestamp: new Date().toISOString(),
      }

      const withUser = this.messages.filter(m => m.id !== aiMsgId)
      this.messages = [...withUser, aiMsg]
      this.isProcessing = false
      this.isStreaming = false
      this.persistMessages(currentId, this.messages)
      this.refresh()

      this.dispatchEvent(new CustomEvent('falkordb-chat-response', {
        bubbles: true, composed: true,
        detail: { message: aiMsg, graph: effectiveGraph }
      }))
    }

    try {
      await this.config.onQuery(text, history, respond, streamToken, this.abortController.signal)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const errMsg: ChatMessageData = {
        id: aiMsgId, type: 'ai',
        content: `Failed to process query: ${(err as Error).message}`,
        isStreaming: false, timestamp: new Date().toISOString(),
      }
      this.messages = [...this.messages.filter(m => m.id !== aiMsgId), errMsg]
      this.isProcessing = false
      this.isStreaming = false
      this.refresh()
    }
  }
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): implement handleSend() with streaming support"
```

---

## Task 9: handleStop() + handleNewChat()

**Files:**
- Modify: `src/web-components/chat/chat.ts` — replace stubs

**Step 1: Implement handleStop() and handleNewChat()**

```typescript
  private handleStop() {
    this.abortController?.abort()
    this.isProcessing = false
    this.isStreaming = false
    const streamingIdx = this.messages.findIndex(m => m.isStreaming)
    if (streamingIdx >= 0) {
      this.messages[streamingIdx] = {
        ...this.messages[streamingIdx],
        isStreaming: false,
        content: this.messages[streamingIdx].content || 'Generation stopped.',
      }
      if (this.conversationId) this.persistMessages(this.conversationId, this.messages)
    }
    this.refresh()
  }

  private handleNewChat() {
    this.conversationId = null
    this.messages = []
    this.isProcessing = false
    this.isStreaming = false
    setActiveId(null, this.namespace)
    this.config?.onNewChat?.()
    this.refresh()
  }
```

**Step 2: Commit**

```bash
git add src/web-components/chat/chat.ts
git commit -m "feat(chat-wc): implement handleStop() and handleNewChat()"
```

---

## Task 10: index.ts entry point + type re-exports

**Files:**
- Create: `src/web-components/chat/index.ts`

**Step 1: Create index**

```typescript
// src/web-components/chat/index.ts
import './chat.js'

export type {
  SuggestionItem,
  ChatConfig,
  QueryResult,
  ChatMessageData,
  ContextItem,
  ExplainGraph,
  ExplainNode,
  ExplainLink,
  SourceMapEntry,
  BookmarkData,
  QueryStrategy,
} from './types.js'
```

**Step 2: Commit**

```bash
git add src/web-components/chat/index.ts
git commit -m "feat(chat-wc): add entry point index.ts"
```

---

## Task 11: Wire up Vite build + package.json exports

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.build.json`

**Step 1: Add chat entry to vite.config.ts**

In the `lib.entry` object, add:
```typescript
'chat': path.resolve(__dirname, 'src/web-components/chat/index.ts'),
```

So the entry block becomes:
```typescript
entry: {
  index: path.resolve(__dirname, 'src/index.ts'),
  'tailwind-preset': path.resolve(__dirname, 'src/theme/tailwind-preset.ts'),
  'chat': path.resolve(__dirname, 'src/web-components/chat/index.ts'),
},
```

Note: the chat web component has **no external dependencies** (no React, no d3) so no changes needed to `rollupOptions.external`.

**Step 2: Add export to package.json**

In the `exports` object, add:
```json
"./chat": {
  "types": "./dist/chat.d.ts",
  "import": "./dist/chat.js",
  "require": "./dist/chat.cjs"
}
```

**Step 3: Check tsconfig.build.json**

Read `tsconfig.build.json`. Verify `include` covers `src/**/*`. If it only lists specific paths, add `src/web-components/**/*`.

**Step 4: Build**

```bash
npm run build
```

Expected: `dist/chat.js` and `dist/chat.cjs` appear in `dist/`. No errors.

**Step 5: Commit**

```bash
git add vite.config.ts package.json tsconfig.build.json
git commit -m "feat(chat-wc): wire up build entry and package.json export"
```

---

## Task 12: Manual smoke test with example HTML

**Files:**
- Create: `examples/chat-demo.html` (gitignored — delete after testing)

**Step 1: Create demo file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FalkorDB Chat Demo</title>
  <style>
    body { margin: 0; height: 100vh; display: flex; }
    falkordb-chat { flex: 1; }
  </style>
</head>
<body>
  <script type="module" src="../dist/chat.js"></script>
  <falkordb-chat user-name="Naseem" namespace="demo"></falkordb-chat>
  <script>
    const chat = document.querySelector('falkordb-chat')
    chat.setSuggestions([
      { title: 'Who knows who?', question: 'Find all connections between people', category: 'connection' },
      { title: 'Compare entities', question: 'Compare two key entities in the graph', category: 'comparison' },
      { title: 'Deep dive', question: 'Give me a detailed breakdown of the main topic', category: 'deep-dive' },
      { title: 'Overview', question: 'Summarize the entire knowledge graph', category: 'overview' },
    ])
    chat.setConfig({
      onQuery: async (question, history, respond, streamToken) => {
        // Simulate streaming
        const words = `This is a simulated response to: "${question}". The graph contains many interesting connections.`.split(' ')
        let accumulated = ''
        for (const word of words) {
          accumulated += (accumulated ? ' ' : '') + word
          streamToken?.(accumulated)
          await new Promise(r => setTimeout(r, 80))
        }
        respond({
          answer: accumulated,
          queryId: 'test-' + Date.now(),
          context: [
            { content: 'Example entity: Person A is connected to Person B.', score: 0.9, metadata: { section: 'entity' } },
            { content: 'Person A → KNOWS → Person B (since 2020)', score: 0.8, metadata: { section: 'relationship' } },
          ],
        })
      },
      onFeedback: (queryId, rating) => console.log('Feedback:', queryId, rating),
    })
  </script>
</body>
</html>
```

**Step 2: Serve and test**

```bash
npx serve . -p 3333
# Open http://localhost:3333/examples/chat-demo.html
```

Verify:
- [ ] Empty state renders with greeting and 4 suggestion cards
- [ ] Clicking a suggestion card sends the message
- [ ] Streaming text appears token by token with blinking cursor
- [ ] After response: copy button, bookmark button, feedback thumbs visible on hover
- [ ] Sources panel toggle appears and expands
- [ ] New chat button clears the conversation
- [ ] Stop button appears during streaming and works

**Step 3: Delete example file, commit**

```bash
rm examples/chat-demo.html
git commit -m "feat(chat-wc): complete falkordb-chat web component"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | TypeScript types |
| 2 | Utilities (greeting, bookmarks, annotation, markdown, storage) |
| 3 | Shadow DOM CSS |
| 4 | FalkorDBChat class skeleton |
| 5 | render() — shadow DOM structure |
| 6 | bindEvents() — keyboard, click, scroll |
| 7 | refresh() — message list + empty state |
| 8 | handleSend() — query + streaming |
| 9 | handleStop() + handleNewChat() |
| 10 | index.ts entry point |
| 11 | Vite build + package.json wiring |
| 12 | Smoke test + verify |

**Usage after publish:**
```bash
npm install @falkordb/ui
import '@falkordb/ui/chat'
// <falkordb-chat user-name="Naseem"></falkordb-chat>
```
