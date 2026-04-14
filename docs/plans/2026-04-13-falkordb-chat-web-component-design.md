# FalkorDB Chat Web Component Design

## Overview

Build `<falkordb-chat>` — a framework-agnostic Web Component that ports the full GraphRAG-UI `ChatView` experience into a standalone, embeddable element. Published as a separate entry point of `@falkordb/ui`:

```bash
npm install @falkordb/ui
import '@falkordb/ui/chat'
```

Used in HTML or any framework:
```html
<falkordb-chat user-name="Naseem"></falkordb-chat>
```

---

## Architecture

### Technology

- **Vanilla Web Component** — extends `HTMLElement`, no React
- **Shadow DOM** (open mode) — same pattern as `falkordb-canvas`
- **Plain CSS** injected into shadow DOM — CSS variables for theming
- **TypeScript + tsc** — same build toolchain as existing repo
- Separate build entry: `src/web-components/chat/index.ts` → `dist/chat.js`

### Package entry point

Add to `package.json` exports:
```json
"./chat": {
  "types": "./dist/chat.d.ts",
  "import": "./dist/chat.js",
  "require": "./dist/chat.cjs"
}
```

---

## Component API

### HTML Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `user-name` | string | Displayed in greeting ("Good morning, Naseem") |
| `placeholder` | string | Input placeholder text |
| `read-only` | boolean | Disables input |

### JS Methods

```ts
// Set suggestion cards shown on empty state
chat.setSuggestions(suggestions: SuggestionItem[])

// Full configuration — callbacks for data flow
chat.setConfig(config: ChatConfig)

// Programmatically send a message
chat.sendMessage(text: string)

// Clear conversation
chat.newChat()
```

### Config Object

```ts
interface ChatConfig {
  userName?: string

  // Called when user submits a query
  onQuery: (
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    respond: (result: QueryResult) => void,
    streamToken?: (token: string) => void  // for streaming
  ) => void

  // Optional callbacks
  onFeedback?: (queryId: string, rating: 'positive' | 'negative') => void
  onStrategyChange?: (strategy: string | null) => void
  onNewChat?: () => void
}

interface QueryResult {
  answer: string
  queryId?: string
  context?: ContextItem[]       // enables sources panel
  explainGraph?: ExplainGraph   // enables entity annotations
  sourceMap?: Record<string, SourceMapEntry>
}

interface SuggestionItem {
  title: string
  question: string
  category: 'connection' | 'comparison' | 'deep-dive' | 'overview'
}
```

---

## Features Ported

| Feature | Included | Notes |
|---------|----------|-------|
| Message list (user + AI bubbles) | Yes | |
| Streaming token rendering | Yes | via `streamToken` callback |
| Suggestion cards (empty state) | Yes | `setSuggestions()` |
| Greeting with time of day | Yes | `user-name` attribute |
| Conversation persistence | Yes | localStorage, keyed by config |
| Copy message | Yes | |
| Feedback 👍👎 | Yes | fires `onFeedback` |
| Bookmark messages | Yes | localStorage |
| Query strategy selector | Yes | fires `onStrategyChange` |
| Sources panel | Yes | rendered when `context` provided |
| Entity annotation links | Yes | rendered when `explainGraph` provided |
| Stop generation | Yes | fires cancel signal to host |
| Background graph animation | No | skip v1 |
| Navigate to /ingest | No | fires `falkordb-chat-ingest` DOM event instead |

---

## File Structure

```
src/
  web-components/
    chat/
      index.ts          # registers <falkordb-chat>, re-exports types
      chat.ts           # FalkorDBChat class (extends HTMLElement)
      styles.ts         # CSS string for shadow DOM injection
      types.ts          # SuggestionItem, ChatConfig, QueryResult, etc.
      utils.ts          # greeting, relative time, annotation helpers
      components/
        message-list.ts   # renders message bubbles
        suggestion-grid.ts # renders suggestion cards
        query-input.ts    # textarea + send/stop button
        sources-panel.ts  # graph retrieval path panel
```

---

## CSS Variables (Theming)

Host apps override these to match their design:

```css
falkordb-chat {
  --fc-primary: #7c3aed;
  --fc-background: #ffffff;
  --fc-foreground: #0f0f0f;
  --fc-muted: #6b7280;
  --fc-border: #e5e7eb;
  --fc-card: #f9fafb;
  --fc-radius: 12px;
}
```

---

## Build Changes

1. Add `src/web-components/chat/index.ts` as a new Vite entry in `vite.config.ts`
2. Add `./chat` export to `package.json`
3. Add `dist/chat.d.ts` types output

---

## Usage Examples

### Vanilla JS
```html
<script type="module">
  import '@falkordb/ui/chat'
</script>

<falkordb-chat user-name="Naseem"></falkordb-chat>

<script>
  const chat = document.querySelector('falkordb-chat')
  chat.setSuggestions([
    { title: "Who knows who?", question: "Find all connections between people", category: "connection" },
    { title: "Compare entities", question: "Compare two key entities", category: "comparison" },
  ])
  chat.setConfig({
    onQuery: async (question, history, respond, streamToken) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        body: JSON.stringify({ question, history }),
      })
      const data = await res.json()
      respond({ answer: data.answer, queryId: data.id, context: data.sources })
    },
    onFeedback: (queryId, rating) => fetch(`/api/feedback`, {
      method: 'POST',
      body: JSON.stringify({ queryId, rating })
    }),
  })
</script>
```

### React
```tsx
import '@falkordb/ui/chat'

export function ChatPage() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    ref.current?.setConfig({ onQuery: ... })
    ref.current?.setSuggestions([...])
  }, [])

  return <falkordb-chat ref={ref} user-name="Naseem" />
}
```

### Angular / Vue
Same pattern — import the module, use the element, call methods via ref.
