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

Each component has a [Storybook](https://falkordb.github.io/falkordb-ui/) page with live examples, usage, props and accessibility notes.

| Component                                                                                        | Description                                           |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [Button](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-button--docs)             | Variants, loading state, trailing label and tooltip   |
| [Input](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-input--docs)               | Single-line text field                                |
| [Textarea](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-textarea--docs)         | Multi-line text field                                 |
| [Label](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-label--docs)               | Accessible label for a control                        |
| [Select](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-select--docs)             | Dropdown for choosing one value                       |
| [Checkbox](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-checkbox--docs)         | Checkbox with an indeterminate state                  |
| [Switch](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-switch--docs)             | On/off toggle                                         |
| [RadioGroup](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-radiogroup--docs)     | Pick exactly one option                               |
| [Slider](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-slider--docs)             | Draggable value or range                              |
| [Form](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-form--docs)                 | Validated field stack built from a config             |
| [Badge](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-badge--docs)               | Pill for a status, count or tag                       |
| [Card](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-card--docs)                 | Bordered surface for grouped content                  |
| [Table](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-table--docs)               | Styled table with a scrolling wrapper                 |
| [Progress](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-progress--docs)         | Progress bar                                          |
| [Skeleton](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-skeleton--docs)         | Pulsing loading placeholder                           |
| [Tooltip](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-tooltip--docs)           | Short label on hover or focus                         |
| [HintTip](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-hinttip--docs)           | Info icon that reveals a hint, also on touch          |
| [Popover](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-popover--docs)           | Floating panel anchored to a trigger                  |
| [DropdownMenu](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-dropdownmenu--docs) | Menu of actions, with checkboxes and submenus         |
| [Dialog](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-dialog--docs)             | Modal window for a focused task                       |
| [AlertDialog](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-alertdialog--docs)   | Confirm or cancel a destructive action                |
| [Drawer](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-drawer--docs)             | Draggable panel from the screen edge                  |
| [Toast](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-toast--docs)               | Non-blocking notification, callable from anywhere     |
| [Tabs](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-tabs--docs)                 | Switch between views in the same space                |
| [Resizable](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-resizable--docs)       | Panels with draggable dividers                        |
| [Chat](https://falkordb.github.io/falkordb-ui/?path=/docs/patterns-chat--docs)                   | Header, conversation, input row and footer for a chat |

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
- [Component reference](#components)
- [Storybook](https://falkordb.github.io/falkordb-ui/), published from `main`
- [Releasing](./docs/releasing.md), for maintainers

## Development

The repository is an npm workspace. The root is `@falkordb/ui`, and each folder in `web-components/` is its own package with its own build, lint and test scripts.

```bash
npm install
npm run storybook     # component docs and workbench on :6006
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

Component docs live next to their stories as `stories/<Component>.mdx`. Update the page in the same change as the component.

## License

[MIT](./LICENSE)
