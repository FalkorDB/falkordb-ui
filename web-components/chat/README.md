# `<falkordb-chat>`

A fully-featured chat Web Component that works in React, Angular, Vue, Svelte, or plain HTML. Drop it in anywhere and connect it to your own backend.

## Install

```bash
npm install @falkordb/ui
```

## Quick start

```html
<script type="module">
  import '@falkordb/ui/chat'
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
  onQuery: (question, history, respond, streamToken, signal) => void,

  // Optional: called when user clicks 👍 or 👎
  onFeedback: (queryId, rating) => void,

  // Optional: called when query strategy changes (Deep Search / Fast / Auto)
  onStrategyChange: (strategy) => void,

  // Optional: called when user starts a new conversation
  onNewChat: () => void,
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
) => void
```

> **Streaming:** `streamToken` receives the **full accumulated text so far** on every call (not a delta chunk). Call it as often as you like as tokens arrive.

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

---

## Events

The component fires DOM CustomEvents that bubble up through the shadow DOM (`composed: true`).

| Event | `detail` | Fired when |
|-------|----------|------------|
| `falkordb-chat-response` | `{ message, graph }` | AI response is complete |
| `falkordb-chat-entity-click` | `{ entityId, graph }` | User clicks an annotated entity in the answer |
| `falkordb-chat-source-click` | `{ entry, graph }` | User clicks a citation or source card |

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
import '@falkordb/ui/chat'
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
import '@falkordb/ui/chat'
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
import '@falkordb/ui/chat'
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
  <script type="module" src="node_modules/@falkordb/ui/dist/chat.js"></script>
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

## Streaming with GraphRAG-UI backend

If your backend is [GraphRAG-UI](https://github.com/FalkorDB/GraphRAG-UI), you can stream responses using the SSE endpoint:

```js
chat.setConfig({
  onQuery: async (question, history, respond, streamToken, signal) => {
    const res = await fetch('/api/query/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, strategy: 'multi_path' }),
      signal,
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      // Parse SSE lines
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) {
              accumulated += data.token
              streamToken?.(accumulated)      // pass full accumulated text
            }
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
    }
  },
})
```

---

## TypeScript types

All types are exported from `@falkordb/ui/chat`:

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
  BookmarkData,
} from '@falkordb/ui/chat'
```
