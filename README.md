# FalkorDB UI

[![CI](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Monorepo for FalkorDB UI packages. Build once, use across all FalkorDB projects.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `packages/ui` | [![npm](https://img.shields.io/npm/v/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui) | React component library (Button, Card, Input, etc.) |
| `web-components/chat` | [![npm](https://img.shields.io/npm/v/@falkordb/ui-chat)](https://www.npmjs.com/package/@falkordb/ui-chat) | Chat web component — framework-agnostic |
| `web-components/graphrag-widget` | [![npm](https://img.shields.io/npm/v/@falkordb/graphrag-widget)](https://www.npmjs.com/package/@falkordb/graphrag-widget) | Embeddable GraphRAG-powered chat widget — one `<script>` tag |

---

## @falkordb/ui — React Components

```bash
npm install @falkordb/ui
```

### Setup

```tsx
// 1. Import theme tokens
import '@falkordb/ui/theme/tokens.css'
```

```ts
// 2. tailwind.config.ts
import { falkordbPreset } from '@falkordb/ui/theme'

export default {
  presets: [falkordbPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@falkordb/ui/**/*.{js,mjs}',
  ],
}
```

```html
<!-- 3. Set theme on root element -->
<html data-theme="dark">
```

### Usage

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@falkordb/ui'

function App() {
  return (
    <Card>
      <CardHeader><CardTitle>Welcome</CardTitle></CardHeader>
      <CardContent><Button>Get Started</Button></CardContent>
    </Card>
  )
}
```

### Components

| Component | Description |
|-----------|-------------|
| `Button` | Action button with variants |
| `Input` | Text input field |
| `Textarea` | Multi-line text input |
| `Label` | Form label |
| `Badge` | Status indicator |
| `Card` | Container with header, content, footer |
| `Alert` / `AlertDialog` | Feedback and confirmation dialogs |
| `Dialog` | Modal dialog |
| `Select` | Dropdown select |
| `DropdownMenu` | Context/action menu |
| `Tooltip` | Hover tooltip |
| `Switch` | Toggle switch |
| `Avatar` | User avatar |
| `Table` | Data table |
| `Toast` / `Toaster` | Toast notifications |
| `Progress` | Progress bar |
| `Skeleton` | Loading placeholder |
| `Sidebar` / `SidebarIcon` | Collapsible icon sidebar |
| `LoadingSpinner` | Animated spinner |
| `ThemeToggle` | Light/dark theme switcher |

---

## @falkordb/ui-chat — Chat Web Component

```bash
npm install @falkordb/ui-chat
```

```js
import '@falkordb/ui-chat'
```

```html
<falkordb-chat namespace="myGraph"></falkordb-chat>
```

See [web-components/chat/README.md](web-components/chat/README.md) for full documentation.

---

## Development

```bash
npm install               # Install all workspace packages
npm run build             # Build all packages
npm run storybook         # Start Storybook dev server
npm run build-storybook   # Build static Storybook
```

### Build a specific package

```bash
npm run build --workspace=packages/ui
npm run build --workspace=web-components/chat
```

## Publishing

Each package is published independently to npm when a GitHub Release is created. Tag releases with `v` prefix (e.g., `v0.1.0`).

## License

MIT
