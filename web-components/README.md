# Web Components

Framework-agnostic Web Components published as part of `@falkordb/ui`. Each component works in any environment — React, Angular, Vue, Svelte, or plain HTML/JS — with no build setup required.

## Available Components

| Component | Import | Element |
|-----------|--------|---------|
| [Chat](./chat/README.md) | `@falkordb/ui/chat` | `<falkordb-chat>` |

---

## How Web Components differ from React components

The React components in `@falkordb/ui` (Button, Card, etc.) require React and Tailwind in the host app. The Web Components in this directory have **no dependencies** — styles are injected into shadow DOM, and they work anywhere a `<script>` tag loads.

| | React components | Web Components |
|---|---|---|
| Import | `@falkordb/ui` | `@falkordb/ui/chat` |
| Requires React | Yes | No |
| Requires Tailwind | Yes | No |
| Works in Angular/Vue | With wrappers | Natively |
| Styled by host app | Via Tailwind classes | Via CSS variables |
| Data passed via | Props | JS methods + attributes |
| Events | React callbacks | DOM CustomEvents |
