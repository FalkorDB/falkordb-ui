# @falkordb/ui

[![CI](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/FalkorDB/falkordb-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@falkordb/ui)](https://www.npmjs.com/package/@falkordb/ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The shared FalkorDB design system. One themeable set of React primitives so every
FalkorDB product — Browser, QueryWeaver, GraphRAG, Code Graph — renders buttons,
inputs and dialogs the same way.

Built on [Radix UI](https://www.radix-ui.com) primitives and
[Tailwind CSS](https://tailwindcss.com) v4, in the shadcn/ui style: unstyled,
accessible behaviour underneath, FalkorDB's palette on top.

## Install

```bash
npm install @falkordb/ui
```

React 18.3+ or 19 is a peer dependency.

## Setup

Pick the option that matches your project. Both give identical output.

### Option 1 — prebuilt CSS (no Tailwind required)

Works on any stack, including Tailwind v3 projects.

```ts
import "@falkordb/ui/styles.css";
```

### Option 2 — Tailwind v4 source

Use this if you want to build your own utilities from the same tokens.

```css
@import "tailwindcss";
@import "@falkordb/ui/theme.css";

/* Tailwind cannot see inside node_modules by default. */
@source "../node_modules/@falkordb/ui/dist";
```

### Dark mode

The theme is driven by a `dark` class on an ancestor element. Either manage it
yourself, or let `ThemeProvider` do it:

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

`ThemeProvider` persists the choice to `localStorage` (pass `storageKey={null}`
to opt out) and follows the OS setting while the theme is `"system"`.

## Usage

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from "@falkordb/ui";

export function GraphCard() {
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

## Components

| Component | Exports                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Button    | `Button`, `buttonVariants`                                                                                                    |
| Input     | `Input`                                                                                                                       |
| Textarea  | `Textarea`                                                                                                                    |
| Select    | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`      |
| Checkbox  | `Checkbox`                                                                                                                    |
| Switch    | `Switch`                                                                                                                      |
| Badge     | `Badge`, `badgeVariants`                                                                                                      |
| Card      | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                                             |
| Tooltip   | `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent`                                                              |
| Dialog    | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` |
| Toast     | `Toaster`, `toast`, `useToast`, `dismiss`, `ToastAction`                                                                      |
| Table     | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`                      |
| Tabs      | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                              |
| Theme     | `ThemeProvider`, `useTheme`, `ThemeToggle`                                                                                    |

Plus the `cn()` class-merging helper.

### Buttons and tooltips

Icon-only buttons need an accessible name. Pass `tooltip` and the button supplies
its own `TooltipProvider`, so it works without any setup in the surrounding tree:

```tsx
<Button size="icon" variant="ghost" tooltip="Export graph as CSV">
	<Download />
</Button>
```

### Toasts

Mount `<Toaster />` once near the root; `toast()` then works from anywhere,
including outside React:

```tsx
import { Toaster, toast } from "@falkordb/ui";

toast({ variant: "destructive", title: "Query failed", description: error.message });
```

## Theming

Every colour is a CSS custom property, so a product can rebrand without forking a
component:

```css
:root {
	--primary: hsl(200 100% 50%);
}
```

| Group    | Tokens                                                                      |
| -------- | --------------------------------------------------------------------------- |
| Surfaces | `--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent` |
| Intent   | `--primary`, `--destructive`, `--success`, `--warning`                      |
| Chrome   | `--border`, `--input`, `--ring`, `--radius`                                 |
| Brand    | `--brand-coral`, `--brand-orchid`, `--brand-violet`, `--brand-gradient`     |
| Type     | `--font-sans`, `--font-mono`                                                |

Each surface and intent token has a matching `-foreground` pair.

## Development

```bash
npm install
npm run storybook     # component workbench on :6006
npm run build         # dist/index.js + index.cjs + index.d.ts + styles.css
npm run test          # Vitest + Testing Library (jsdom)
npm run coverage      # enforces 100% coverage of src/
npm run typecheck
npm run lint
npm run format
```

Storybook is published from `main` to GitHub Pages.

## Releasing

Publishing runs on GitHub Release creation with a `v<version>` tag, using npm
OIDC trusted publishing — no tokens in the repo.

## License

MIT
