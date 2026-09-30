# `<falkordb-chat>`

A fully-featured chat Web Component that works in React, Angular, Vue, Svelte, or plain HTML. Drop it in anywhere and connect it to your own backend.

Built to serve **multiple FalkorDB products** — GraphRAG-UI, QueryWeaver, and future applications — through a single, extensible component. The core handles conversation management, streaming, persistence, and theming, while each product plugs in its own query logic and custom message types.

## Install

```bash
npm install @falkordb/ui-chat
```

## Quick start

```html
<script type="module">
  import '@falkordb/ui-chat'
</script>

<falkordb-chat user-name="Naseem"></falkordb-chat>

<script>
  const chat = document.querySelector('falkordb-chat')

  chat.setSuggestions([
    { title: 'Who knows who?',   question: 'Find all connections between people', category: 'connection' },
    { title: 'Compare entities', question: 'Compare the two most connected nodes',  category: 'comparison' },
    { title: 'Deep dive',        question: 'Detailed breakdown of the main topic',  category: 'deep-dive' },
    { title: 'Overview',         question: 'Summarize the knowledge graph',         category: 'overview' },
  ])

  chat.setConfig({
    onQuery: async (question, history, respond, streamToken, signal) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
        signal,
      })
      const data = await res.json()
      respond({ answer: data.answer, queryId: data.id })
    },
  })
</script>
```

---

## HTML Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `user-name` | string | — | Shown in the greeting: "Good morning, Naseem" |
| `placeholder` | string | `"Ask a question..."` | Input placeholder text |
| `read-only` | boolean | false | Disables the input |
| `namespace` | string | `"default"` | localStorage key prefix — use different values to isolate conversations between instances |

```html
<falkordb-chat
  user-name="Naseem"
  placeholder="Ask about your graph..."
  namespace="my-app"
></falkordb-chat>
```

---

## JavaScript API

All configuration that is too complex for attributes is done via JS methods after the element is in the DOM.

### `chat.setConfig(config)`

The main configuration method. Call this once after the element mounts.

```ts
chat.setConfig({
  // Required: called whenever the user submits a question
  onQuery: (question, history, respond, streamToken, signal, strategy) => void,

  // Optional: called when user clicks 👍 or 👎
  onFeedback: (queryId, rating) => void,

  // Optional: called when query strategy changes
  onStrategyChange: (strategy) => void,

  // Optional: called when user starts a new conversation
  onNewChat: () => void,

  // ── Product customization ──────────────────────────────────────

  // Custom message renderers keyed by message type string
  messageRenderers: { 'sql-query': (msg, helpers) => HTMLElement, ... },

  // Options shown in the strategy dropdown. If omitted or empty the
  // strategy button is hidden automatically.
  strategyOptions: [
    { value: 'multi_path', label: 'Deep Search', description: 'Comprehensive search across the full graph' },
    { value: 'local',      label: 'Fast',        description: 'Quick answers from nearby context' },
    { value: null,          label: 'Auto',        description: 'Let the system choose the best approach' },
  ],

  // Toggle built-in UI features on/off
  hideBookmarks: false,    // hide the Save/Bookmark button
  hideFeedback: false,     // hide the 👍👎 feedback buttons
  hideSources: false,      // hide the Graph retrieval path panel

  // Customise the empty state greeting
  emptyStateLabel: 'Your graph assistant',
  emptyStateSubtitle: 'Ask questions and explore the knowledge in your data',
})
```

#### `onQuery` in detail

```ts
onQuery: (
  question: string,                                   // what the user typed
  history:  { role: 'user' | 'assistant'; content: string }[],  // prior turns
  respond:  (result: QueryResult) => void,            // call this when done
  streamToken?: (accumulatedText: string) => void,    // call repeatedly for streaming
  signal?: AbortSignal,                               // fired when user clicks Stop
  strategy?: string | null,                           // currently selected strategy option value
) => void
```

> **Streaming:** `streamToken` receives the **full accumulated text so far** on every call (not a delta chunk). Call it as often as you like as tokens arrive.
>
> **Strategy:** The `strategy` value comes from whichever `strategyOptions` entry the user selected. If no `strategyOptions` are configured, `strategy` is `undefined`.

#### `QueryResult`

```ts
interface QueryResult {
  answer: string                                    // required: the AI response text (markdown supported)
  queryId?: string                                  // enables feedback thumbs if provided
  context?: ContextItem[]                           // enables "Graph retrieval path" sources panel
  explainGraph?: ExplainGraph                       // enables clickable entity annotations in the answer
  sourceMap?: Record<string, SourceMapEntry>        // maps [N] citation markers to sources
}
```

### `chat.setSuggestions(suggestions)`

Sets the suggestion cards shown on the empty state.

```ts
chat.setSuggestions([
  {
    title: 'Short label',         // shown as card heading (1 line, clipped)
    question: 'Full question...',  // sent as the query when clicked (2 lines, clipped)
    category: 'connection',        // controls icon + accent colour
  },
])
```

**Categories:**

| Value | Icon | Colour |
|-------|------|--------|
| `connection` | Link | Blue |
| `comparison` | Arrows | Amber |
| `deep-dive` | Search | Purple |
| `overview` | Grid | Primary |

### `chat.sendMessage(text)`

Programmatically send a message, as if the user typed and submitted it.

```js
chat.sendMessage('What are the most connected nodes?')
```

### `chat.newChat()`

Clear the conversation and return to the empty state.

```js
chat.newChat()
```

### `chat.addMessage(msg)`

Programmatically inject a message into the conversation. This is the primary way custom integrations add non-standard message types (SQL blocks, tables, confirmation dialogs, reasoning steps, etc.).

```ts
chat.addMessage({
  id: Date.now().toString(),
  type: 'sql-query',              // any string — looked up in messageRenderers
  content: 'SELECT * FROM users LIMIT 5',
  timestamp: new Date().toISOString(),
  data: {                          // arbitrary payload for the custom renderer
    confidence: 0.92,
    explanation: 'Fetching the first 5 users',
  },
})
```

### `chat.getMessages()`

Returns a readonly snapshot of the current messages array.

```ts
const messages = chat.getMessages()
console.log(messages.length)
```

---

## Custom Message Renderers

The `messageRenderers` config option lets each product define how to render its unique message types. The chat component handles `'user'` and `'ai'` internally — everything else is delegated.

```ts
chat.setConfig({
  messageRenderers: {
    'sql-query': (msg, { escapeHtml }) => {
      const el = document.createElement('div')
      el.className = 'my-sql-block'
      el.innerHTML = `
        <pre><code>${escapeHtml(msg.content)}</code></pre>
        ${msg.data?.confidence ? `<span>Confidence: ${msg.data.confidence}</span>` : ''}
      `
      return el
    },

    'query-result': (msg, { escapeHtml }) => {
      const rows = (msg.data?.rows as any[]) || []
      const el = document.createElement('div')
      // ... render a table from rows
      return el
    },

    'confirmation': (msg, { escapeHtml, host }) => {
      const el = document.createElement('div')
      el.innerHTML = `
        <p>⚠️ ${escapeHtml(msg.content)}</p>
        <button class="confirm-btn">Confirm</button>
        <button class="cancel-btn">Cancel</button>
      `
      el.querySelector('.confirm-btn')?.addEventListener('click', () => {
        host.dispatchEvent(new CustomEvent('falkordb-chat-confirm', {
          bubbles: true, composed: true,
          detail: { messageId: msg.id, data: msg.data },
        }))
      })
      return el
    },
  },
  onQuery: async (q, h, respond) => { /* ... */ },
})
```

### `MessageRenderHelpers`

Every renderer receives a helpers object:

| Helper | Type | Description |
|--------|------|-------------|
| `escapeHtml` | `(s: string) => string` | XSS-safe HTML escaping |
| `host` | `HTMLElement` | The `<falkordb-chat>` element itself — dispatch custom events on it |

---

## Events

The component fires DOM CustomEvents that bubble up through the shadow DOM (`composed: true`).

| Event | `detail` | Fired when |
|-------|----------|------------|
| `falkordb-chat-response` | `{ message, graph }` | AI response is complete |
| `falkordb-chat-entity-click` | `{ entityId, graph }` | User clicks an annotated entity in the answer |
| `falkordb-chat-source-click` | `{ entry, graph }` | User clicks a citation or source card |

Custom renderers can fire their own events via `host.dispatchEvent(...)`.

```js
chat.addEventListener('falkordb-chat-entity-click', (e) => {
  console.log('Entity clicked:', e.detail.entityId)
})
```

---

## Theming (CSS variables)

Override these on the element or any ancestor to match your design system:

```css
falkordb-chat {
  --fc-primary:     #7c3aed;   /* accent colour (buttons, links, borders) */
  --fc-background:  #ffffff;   /* chat background */
  --fc-foreground:  #0f0f0f;   /* text colour */
  --fc-muted:       #6b7280;   /* secondary text */
  --fc-border:      #e5e7eb;   /* borders */
  --fc-card:        #f9fafb;   /* suggestion card background */
  --fc-accent:      #f3f4f6;   /* hover backgrounds */
  --fc-radius:      12px;      /* border radius */
  --fc-destructive: #ef4444;   /* stop button, errors */
}
```

Dark mode example:

```css
falkordb-chat {
  --fc-primary:    #a78bfa;
  --fc-background: #0f0f0f;
  --fc-foreground: #f9fafb;
  --fc-muted:      #9ca3af;
  --fc-border:     #27272a;
  --fc-card:       #18181b;
  --fc-accent:     #27272a;
}
```

---

## Framework examples

### React

```tsx
import '@falkordb/ui-chat'
import { useEffect, useRef } from 'react'

// Tell TypeScript about the element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'falkordb-chat': React.HTMLAttributes<HTMLElement> & {
        'user-name'?: string
        namespace?: string
        placeholder?: string
        'read-only'?: boolean
      }
    }
  }
}

export function ChatPage() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const chat = ref.current as HTMLElement & {
      setConfig: (c: unknown) => void
      setSuggestions: (s: unknown) => void
    }
    if (!chat) return

    chat.setSuggestions([
      { title: 'Who knows who?', question: 'Find connections', category: 'connection' },
    ])

    chat.setConfig({
      onQuery: async (question, history, respond, streamToken, signal) => {
        const res = await fetch('/api/query', {
          method: 'POST',
          body: JSON.stringify({ question, history }),
          signal,
        })
        const data = await res.json()
        respond({ answer: data.answer, queryId: data.id })
      },
    })
  }, [])

  return (
    <div style={{ height: '100vh' }}>
      <falkordb-chat ref={ref} user-name="Naseem" namespace="react-app" />
    </div>
  )
}
```

### Vue

```vue
<template>
  <div style="height: 100vh">
    <falkordb-chat ref="chatRef" user-name="Naseem" namespace="vue-app" />
  </div>
</template>

<script setup>
import '@falkordb/ui-chat'
import { onMounted, ref } from 'vue'

const chatRef = ref(null)

onMounted(() => {
  const chat = chatRef.value
  chat.setSuggestions([
    { title: 'Who knows who?', question: 'Find connections', category: 'connection' },
  ])
  chat.setConfig({
    onQuery: async (question, history, respond, streamToken, signal) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        body: JSON.stringify({ question, history }),
        signal,
      })
      const data = await res.json()
      respond({ answer: data.answer, queryId: data.id })
    },
  })
})
</script>
```

### Angular

```ts
// app.component.ts
import '@falkordb/ui-chat'
import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core'

@Component({
  selector: 'app-root',
  template: `
    <div style="height: 100vh">
      <falkordb-chat #chat user-name="Naseem" namespace="angular-app"></falkordb-chat>
    </div>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild('chat') chatRef!: ElementRef

  ngAfterViewInit() {
    const chat = this.chatRef.nativeElement
    chat.setSuggestions([
      { title: 'Who knows who?', question: 'Find connections', category: 'connection' },
    ])
    chat.setConfig({
      onQuery: async (question, history, respond, streamToken, signal) => {
        const res = await fetch('/api/query', {
          method: 'POST',
          body: JSON.stringify({ question, history }),
          signal,
        })
        const data = await res.json()
        respond({ answer: data.answer, queryId: data.id })
      },
    })
  }
}

// app.module.ts — tell Angular about the custom element
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class AppModule {}
```

### Plain HTML

```html
<!DOCTYPE html>
<html>
<body style="margin:0; height:100vh; display:flex;">
  <script type="module" src="node_modules/@falkordb/ui-chat/dist/chat.js"></script>
  <falkordb-chat user-name="Naseem" style="flex:1"></falkordb-chat>
  <script>
    const chat = document.querySelector('falkordb-chat')
    chat.setSuggestions([
      { title: 'Who knows who?', question: 'Find connections', category: 'connection' },
    ])
    chat.setConfig({
      onQuery: async (question, history, respond) => {
        const res = await fetch('/api/query', {
          method: 'POST',
          body: JSON.stringify({ question, history }),
        })
        const data = await res.json()
        respond({ answer: data.answer })
      },
    })
  </script>
</body>
</html>
```

---

## Product examples

### GraphRAG-UI — knowledge graph RAG

Full-featured: streaming, suggestions, source citations, entity annotations, feedback, bookmarks, strategy picker.

```js
const chat = document.querySelector('falkordb-chat')

chat.setSuggestions([
  { title: 'Who knows who?', question: 'Find connections', category: 'connection' },
  { title: 'Compare entities', question: 'Compare top nodes', category: 'comparison' },
  { title: 'Deep dive', question: 'Detailed breakdown', category: 'deep-dive' },
  { title: 'Overview', question: 'Summarize the graph', category: 'overview' },
])

chat.setConfig({
  strategyOptions: [
    { value: 'multi_path', label: 'Deep Search', description: 'Comprehensive search across the full graph' },
    { value: 'local',      label: 'Fast',        description: 'Quick answers from nearby context' },
    { value: null,          label: 'Auto',        description: 'Let the system choose the best approach' },
  ],
  onQuery: async (question, history, respond, streamToken, signal, strategy) => {
    const res = await fetch('/api/query/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, strategy }),
      signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.token) { accumulated += data.token; streamToken?.(accumulated) }
          if (data.done) {
            respond({
              answer: accumulated,
              queryId: data.query_id,
              context: data.context,
              explainGraph: data.explain_graph,
              sourceMap: data.source_map,
            })
          }
        } catch {}
      }
    }
  },
  onFeedback: (queryId, rating) => fetch('/api/feedback', {
    method: 'POST', body: JSON.stringify({ query_id: queryId, rating }),
  }),
  onNewChat: () => console.log('New chat started'),
})
```

### QueryWeaver — text-to-SQL

Minimal chrome: no strategy picker, no bookmarks, no feedback, no sources. Custom renderers for SQL blocks, table results, and destructive operation confirmations.

```html
<falkordb-chat
  user-name="Naseem"
  placeholder="Ask me anything about your database..."
  namespace="queryweaver"
></falkordb-chat>

<script>
const chat = document.querySelector('falkordb-chat')

chat.setSuggestions([
  { title: 'Show customers',    question: 'Show me five customers',                category: 'overview' },
  { title: 'Top by revenue',    question: 'Show me the top customers by revenue',  category: 'deep-dive' },
  { title: 'Pending orders',    question: 'What are the pending orders?',          category: 'connection' },
])

chat.setConfig({
  // No strategyOptions → strategy button hidden automatically
  hideBookmarks: true,
  hideFeedback: true,
  hideSources: true,

  emptyStateLabel: 'Your database assistant',
  emptyStateSubtitle: 'Ask questions about your data in plain English',

  // Custom renderers for SQL-specific message types
  messageRenderers: {
    'sql-query': (msg, { escapeHtml }) => {
      const el = document.createElement('div')
      el.style.cssText = 'padding:0.5rem 1rem;'
      el.innerHTML = `
        <div style="font-weight:600;color:var(--fc-primary);margin-bottom:0.5rem;">Generated SQL</div>
        <pre style="background:var(--fc-accent);padding:0.75rem;border-radius:0.5rem;">
          <code>${escapeHtml(msg.content)}</code>
        </pre>
      `
      return el
    },

    'query-result': (msg, { escapeHtml }) => {
      const rows = (msg.data?.rows) || []
      const el = document.createElement('div')
      if (rows.length === 0) { el.textContent = 'No results'; return el }
      const cols = Object.keys(rows[0])
      el.innerHTML = `
        <table style="width:100%;font-size:0.8rem;border-collapse:collapse;">
          <thead><tr>${cols.map(c =>
            `<th style="text-align:left;padding:0.5rem;border-bottom:1px solid var(--fc-border);">${escapeHtml(c)}</th>`
          ).join('')}</tr></thead>
          <tbody>${rows.map(row =>
            `<tr>${cols.map(c =>
              `<td style="padding:0.5rem;border-bottom:1px solid var(--fc-border);">${escapeHtml(String(row[c] ?? ''))}</td>`
            ).join('')}</tr>`
          ).join('')}</tbody>
        </table>
      `
      return el
    },

    'confirmation': (msg, { escapeHtml, host }) => {
      const el = document.createElement('div')
      const op = (msg.data?.operationType || 'UNKNOWN').toUpperCase()
      el.innerHTML = `
        <div style="border:1px solid var(--fc-destructive);border-radius:var(--fc-radius);padding:1rem;">
          <p>⚠️ <strong>Destructive: ${escapeHtml(op)}</strong></p>
          <pre style="background:var(--fc-accent);padding:0.75rem;border-radius:0.5rem;">${escapeHtml(msg.data?.sqlQuery || msg.content)}</pre>
          <button class="fc-confirm">Confirm</button>
          <button class="fc-cancel">Cancel</button>
        </div>
      `
      el.querySelector('.fc-confirm')?.addEventListener('click', () => {
        host.dispatchEvent(new CustomEvent('falkordb-chat-confirm', {
          bubbles: true, composed: true, detail: { messageId: msg.id, data: msg.data },
        }))
      })
      el.querySelector('.fc-cancel')?.addEventListener('click', () => {
        host.dispatchEvent(new CustomEvent('falkordb-chat-cancel', {
          bubbles: true, composed: true, detail: { messageId: msg.id },
        }))
      })
      return el
    },
  },

  onQuery: async (question, history, respond, streamToken, signal) => {
    const res = await fetch('/api/graphs/my-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat: [...history.filter(m => m.role === 'user').map(m => m.content), question],
      }),
      signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', finalAnswer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n---\n')
      buffer = parts.pop() || ''
      for (const part of parts) {
        if (!part.trim()) continue
        try {
          const msg = JSON.parse(part.trim())
          if (msg.type === 'sql_query') {
            chat.addMessage({
              id: `sql-${Date.now()}`, type: 'sql-query',
              content: msg.data || '', timestamp: new Date().toISOString(),
              data: { confidence: msg.conf },
            })
          } else if (msg.type === 'query_result') {
            chat.addMessage({
              id: `result-${Date.now()}`, type: 'query-result',
              content: 'Results', timestamp: new Date().toISOString(),
              data: { rows: msg.data || [] },
            })
          } else if (msg.type === 'confirmation') {
            chat.addMessage({
              id: `confirm-${Date.now()}`, type: 'confirmation',
              content: msg.message, timestamp: new Date().toISOString(),
              data: { sqlQuery: msg.sql_query, operationType: msg.operation_type },
            })
          } else if (msg.type === 'ai_response') {
            finalAnswer = msg.message || ''
          }
        } catch {}
      }
    }
    if (finalAnswer) respond({ answer: finalAnswer })
  },
})
</script>
```

---

## TypeScript types

All types are exported from `@falkordb/ui-chat`:

```ts
import type {
  SuggestionItem,
  ChatConfig,
  QueryResult,
  ChatMessageData,
  ConversationData,
  ContextItem,
  ExplainGraph,
  ExplainNode,
  SourceMapEntry,
  QueryStrategy,
  StrategyOption,
  BookmarkData,
  ChatHistoryMessage,
  MessageRenderer,
  MessageRenderHelpers,
  MessageAction,
} from '@falkordb/ui-chat'
```
