# @falkordb/ui

[![npm version](https://img.shields.io/npm/v/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui)
[![npm downloads](https://img.shields.io/npm/dm/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui)
[![CI](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Shared UI component library for FalkorDB applications. Built with React, TypeScript, Tailwind CSS, and Radix UI.

## Installation

```bash
npm install @falkordb/ui
```

### Peer Dependencies

```bash
npm install react react-dom tailwindcss
```

## Setup

### 1. Import the theme tokens

```tsx
// main.tsx or layout.tsx
import '@falkordb/ui/theme/tokens.css'
```

### 2. Add the Tailwind preset

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { falkordbPreset } from '@falkordb/ui/theme'

export default {
  presets: [falkordbPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@falkordb/ui/**/*.{js,mjs}',
  ],
} satisfies Config
```

### 3. Set the theme

Add `data-theme="dark"` or `data-theme="light"` to your root HTML element:

```html
<html data-theme="dark">
```

## Components

### UI Components

| Component | Description |
|-----------|-------------|
| `Button` | Primary action button with variants (default, destructive, outline, secondary, ghost, link) |
| `Input` | Text input field |
| `Textarea` | Multi-line text input |
| `Label` | Form label |
| `Badge` | Status indicator with variants |
| `Card` | Container with header, content, footer |
| `Alert` | Feedback message with variants |
| `Dialog` | Modal dialog |
| `AlertDialog` | Confirmation dialog |
| `Select` | Dropdown select |
| `DropdownMenu` | Context/action menu |
| `Tooltip` | Hover tooltip |
| `Switch` | Toggle switch |
| `Avatar` | User avatar with image + fallback |
| `Table` | Data table |
| `Toast` / `Toaster` | Toast notifications |
| `Progress` | Progress bar |
| `Skeleton` | Loading placeholder |
| `Separator` | Visual divider |
| `LoadingSpinner` | Animated spinner |
| `ThemeToggle` | Light/dark theme switcher |

### Layout Components

| Component | Description |
|-----------|-------------|
| `Sidebar` | Collapsible icon sidebar with top/bottom sections |
| `SidebarIcon` | Icon button for use inside Sidebar |

## Usage

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@falkordb/ui'

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Get Started</Button>
      </CardContent>
    </Card>
  )
}
```

## Utilities

```tsx
import { cn } from '@falkordb/ui' // className merge utility (clsx + tailwind-merge)
```

## Hooks

```tsx
import { useIsMobile, useToast } from '@falkordb/ui'
```

## Development

```bash
npm install
npm run build          # Build the library
npm run storybook      # Start Storybook dev server
npm run build-storybook # Build static Storybook
```

## Publishing

Versions are published to npm automatically when a GitHub Release is created. Tag releases with `v` prefix (e.g., `v0.1.0`).

## License

MIT
