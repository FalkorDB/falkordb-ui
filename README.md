# FalkorDB UI

[![CI](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui)
[![Storybook](https://img.shields.io/badge/Storybook-live-ff4785?logo=storybook&logoColor=white)](https://falkordb.github.io/falkordb-ui/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

FalkorDB's shared UI toolkit: themeable, accessible components used across FalkorDB products such as Browser, QueryWeaver, GraphRAG and Code Graph, so every product looks and behaves the same.

**[Documentation](./docs/README.md)** · **[Storybook](https://falkordb.github.io/falkordb-ui/)** · **[npm](https://www.npmjs.com/package/@falkordb/ui)**

## Packages

This repository publishes several npm packages, each versioned and released on its own. The badges show each package's current `latest` on npm.

| Package                                       | Latest                                                                                                  | What it is                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`@falkordb/ui`](#quick-start)                | [![npm](https://img.shields.io/npm/v/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui)         | React components and theme                             |
| [`@falkordb/canvas`](./web-components/canvas) | [![npm](https://img.shields.io/npm/v/@falkordb/canvas)](https://www.npmjs.com/package/@falkordb/canvas) | `<falkordb-canvas>` force-directed graph web component |

## Quick start

`@falkordb/ui` is a set of React components built on [Radix UI](https://www.radix-ui.com) and [Tailwind CSS](https://tailwindcss.com) v4, in the shadcn/ui style: accessible behaviour underneath, FalkorDB's look on top.

### 1. Install

React 18.3+ or 19 is a peer dependency.

```bash
npm install @falkordb/ui
```

### 2. Import the styles

Import them once, at your app's entry point. No Tailwind setup is needed.

```ts
import "@falkordb/ui/styles.css";
```

Already on Tailwind v4? You can [build from the theme source](./docs/getting-started.md#option-2--tailwind-v4-source) instead.

### 3. Use the components

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from "@falkordb/ui";

export function GraphCard({ run }: { run: () => void }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>social-network</CardTitle>
			</CardHeader>
			<CardContent>
				<Button onClick={run}>Run query</Button>
			</CardContent>
		</Card>
	);
}
```

Next: [Getting started](./docs/getting-started.md) covers dark mode and the conventions every component shares.

## Components

Each component has a reference page with usage, props and accessibility notes, and a live Storybook page.

| Component    | Description                                           | Docs                                       | Storybook                                                                                          |
| ------------ | ----------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Button       | Variants, loading state, trailing label and tooltip   | [Docs](./docs/components/button.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-button--docs)                 |
| Input        | Single-line text field                                | [Docs](./docs/components/input.md)         | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-input--docs)                  |
| Textarea     | Multi-line text field                                 | [Docs](./docs/components/textarea.md)      | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-textarea--docs)               |
| Label        | Accessible label for a control                        | [Docs](./docs/components/label.md)         | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--radios)            |
| Select       | Dropdown for choosing one value                       | [Docs](./docs/components/select.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-select--docs)                 |
| Checkbox     | Checkbox with an indeterminate state                  | [Docs](./docs/components/checkbox.md)      | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-checkbox--docs)               |
| Switch       | On/off toggle                                         | [Docs](./docs/components/switch.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-switch--docs)                 |
| RadioGroup   | Pick exactly one option                               | [Docs](./docs/components/radio-group.md)   | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--radios)            |
| Slider       | Draggable value or range                              | [Docs](./docs/components/slider.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--slider-with-value) |
| Form         | Validated field stack built from a config             | [Docs](./docs/components/form.md)          | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-form--docs)                   |
| Badge        | Pill for a status, count or tag                       | [Docs](./docs/components/badge.md)         | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-badge--docs)                  |
| Card         | Bordered surface for grouped content                  | [Docs](./docs/components/card.md)          | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-card--docs)                   |
| Table        | Styled table with a scrolling wrapper                 | [Docs](./docs/components/table.md)         | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-table--docs)                  |
| Progress     | Progress bar                                          | [Docs](./docs/components/progress.md)      | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--loading)           |
| Skeleton     | Pulsing loading placeholder                           | [Docs](./docs/components/skeleton.md)      | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--loading)           |
| Tooltip      | Short label on hover or focus                         | [Docs](./docs/components/tooltip.md)       | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-tooltip--docs)                |
| HintTip      | Info icon that reveals a hint, also on touch          | [Docs](./docs/components/hint-tip.md)      | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--hints)             |
| Popover      | Floating panel anchored to a trigger                  | [Docs](./docs/components/popover.md)       | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--popover-panel)     |
| DropdownMenu | Menu of actions, with checkboxes and submenus         | [Docs](./docs/components/dropdown-menu.md) | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--menu)              |
| Dialog       | Modal window for a focused task                       | [Docs](./docs/components/dialog.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-dialog--docs)                 |
| AlertDialog  | Confirm or cancel a destructive action                | [Docs](./docs/components/alert-dialog.md)  | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-alertdialog--docs)            |
| Drawer       | Draggable panel from the screen edge                  | [Docs](./docs/components/drawer.md)        | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--bottom-drawer)     |
| Toast        | Non-blocking notification, callable from anywhere     | [Docs](./docs/components/toast.md)         | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-toast--docs)                  |
| Tabs         | Switch between views in the same space                | [Docs](./docs/components/tabs.md)          | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-tabs--docs)                   |
| Resizable    | Panels with draggable dividers                        | [Docs](./docs/components/resizable.md)     | [Live](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--panels)            |
| Chat         | Header, conversation, input row and footer for a chat | [Docs](./docs/components/chat.md)          | [Live](https://falkordb.github.io/falkordb-ui/?path=/docs/patterns-chat--docs)                     |

## Theming

Every colour, radius and font is a CSS custom property, so a product can rebrand without forking a component:

```css
:root {
	--primary: hsl(200 100% 50%);
}
```

Dark mode follows a `dark` class on an ancestor; `ThemeProvider` and `ThemeToggle` can manage it for you. See [Theming](./docs/theming.md) for every token, dark mode and `cn()`.

## Web components

Self-contained components for any framework, or none at all. Each renders in its own shadow DOM and ships as a separate npm package from [`web-components/`](./web-components):

| Package                                       | Element             | What it is                  |
| --------------------------------------------- | ------------------- | --------------------------- |
| [`@falkordb/canvas`](./web-components/canvas) | `<falkordb-canvas>` | Force-directed graph canvas |

See the [web components overview](./web-components/README.md) for how they differ from the React components.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Theming](./docs/theming.md)
- [Component reference](./docs/README.md#components)
- [Storybook](https://falkordb.github.io/falkordb-ui/), published from `main`
- [Releasing](./docs/releasing.md), for maintainers

## Development

The repository is an npm workspace. The root is `@falkordb/ui`, and each folder in `web-components/` is its own package with its own build, lint and test scripts.

```bash
npm install
npm run storybook     # component workbench on :6006
npm run build         # dist/index.js + index.cjs + index.d.ts + styles.css
npm run test          # Vitest + Testing Library (jsdom)
npm run coverage      # enforces 100% coverage of src/
npm run typecheck
npm run lint
npm run format

npm run build:web-components
npm run test:web-components
npm run build -w web-components/canvas   # a single package
```

## License

[MIT](./LICENSE)
