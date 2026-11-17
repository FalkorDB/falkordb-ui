# Getting started

This guide sets up [`@falkordb/ui`](https://www.npmjs.com/package/@falkordb/ui), the React component library. For the framework-agnostic web components, see [`web-components/`](../web-components/README.md).

## Install

```bash
npm install @falkordb/ui
```

React 18.3+ or 19 is a peer dependency.

## Add the styles

Pick the option that matches your project. Both give identical output.

### Option 1 — prebuilt CSS (no Tailwind required)

Works on any stack, including Tailwind v3 projects. Import it once, at your app's entry point:

```ts
import "@falkordb/ui/styles.css";
```

### Option 2 — Tailwind v4 source

Use this if you also want to write your own Tailwind utilities against the same tokens:

```css
@import "tailwindcss";
@import "@falkordb/ui/theme.css";

/* Tailwind cannot see inside node_modules by default. */
@source "../node_modules/@falkordb/ui/dist";
```

### Base rules only

Both options include FalkorDB's base rules, under which nothing draws a focus outline. An app that keeps its own design tokens can import only those rules:

```css
@import "@falkordb/ui/base.css";
```

## Turn on dark mode

The theme switches on a `dark` class on an ancestor element. Manage that class yourself, or let `ThemeProvider` do it:

```tsx
import { ThemeProvider, ThemeToggle } from "@falkordb/ui";

export function App() {
	return (
		<ThemeProvider defaultTheme="system">
			<ThemeToggle />
		</ThemeProvider>
	);
}
```

See [Theming](./theming.md) for every option.

## Render your first component

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

Every component is a named export of `@falkordb/ui`. Browse them in the [component index](./README.md#components) or try them live in [Storybook](https://falkordb.github.io/falkordb-ui/).

## Conventions shared by every component

- **Styling.** Every component accepts `className`, merged with [`cn()`](./theming.md#merging-classes-with-cn) so your classes win over the defaults. Where an inner part cannot be reached with `className`, the component exposes a dedicated prop such as `thumbClassName` or `overlayClassName`.
- **Refs.** Components forward their ref to the underlying DOM element.
- **Composition.** Components built on [Radix UI](https://www.radix-ui.com/primitives) accept that primitive's props too, including `asChild`. Each component page links the Radix docs it builds on.
- **No focus rings.** FalkorDB products draw no focus outline; this is deliberate.
