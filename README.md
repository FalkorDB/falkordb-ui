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

### Base rules only

Both options include FalkorDB's base rules: nothing draws a focus outline. An
app that keeps its own design tokens can import only those rules:

```css
@import "@falkordb/ui/base.css";
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

| Component    | Exports                                                                                                                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button       | `Button`, `buttonVariants`                                                                                                                                                                                                                                                                                                        |
| Input        | `Input`                                                                                                                                                                                                                                                                                                                           |
| Textarea     | `Textarea`                                                                                                                                                                                                                                                                                                                        |
| Label        | `Label`                                                                                                                                                                                                                                                                                                                           |
| Select       | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`                                                                                                                                                                                                          |
| Checkbox     | `Checkbox`                                                                                                                                                                                                                                                                                                                        |
| Switch       | `Switch`                                                                                                                                                                                                                                                                                                                          |
| RadioGroup   | `RadioGroup`, `RadioGroupItem`                                                                                                                                                                                                                                                                                                    |
| Slider       | `Slider`                                                                                                                                                                                                                                                                                                                          |
| Form         | `Form`, `FormField`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormFooter`, `useFormField`                                                                                                                                                                                                                   |
| Badge        | `Badge`, `badgeVariants`                                                                                                                                                                                                                                                                                                          |
| Card         | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                                                                                                                                                                                                                                                 |
| Progress     | `Progress`                                                                                                                                                                                                                                                                                                                        |
| Skeleton     | `Skeleton`                                                                                                                                                                                                                                                                                                                        |
| Tooltip      | `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent`                                                                                                                                                                                                                                                                  |
| HintTip      | `HintTip`                                                                                                                                                                                                                                                                                                                         |
| Popover      | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, `PopoverClose`                                                                                                                                                                                                                                                    |
| DropdownMenu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` |
| Dialog       | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`                                                                                                                                                                                                     |
| AlertDialog  | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`                                                                                                                                       |
| Drawer       | `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`, `DrawerClose`                                                                                                                                                                                                     |
| Toast        | `Toaster`, `toast`, `useToast`, `dismiss`, `ToastAction`                                                                                                                                                                                                                                                                          |
| Table        | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`                                                                                                                                                                                                                          |
| Tabs         | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                                                                                                                                                                                                                                  |
| Resizable    | `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`                                                                                                                                                                                                                                                                        |
| Theme        | `ThemeProvider`, `useTheme`, `ThemeToggle`                                                                                                                                                                                                                                                                                        |

Plus the `cn()` class-merging helper.

### Buttons and tooltips

`Button` comes in FalkorDB's looks:

- **`variant`:** `default` (filled primary), `secondary`, `cancel` and `destructive` (outlined), `link`, and `none`.
- **`size`:** `default`, `wide` (for the outlined pair) and `none`.

`none` on both axes leaves the geometry to your own classes.

Icon-only buttons need an accessible name. Pass `tooltip` and the button supplies
its own `TooltipProvider`, so it works without any setup in the surrounding tree:

```tsx
<Button variant="none" size="none" className="rounded-md p-2 hover:bg-accent" tooltip="Export graph as CSV">
	<Download />
</Button>
```

`isLoading` swaps the content for a spinner, and `label` adds truncating trailing text. Both also work with `asChild`, where they render inside your element.

### Forms

`Form` takes a `fields` array and renders the whole stack — labels, info
hints, descriptions, controls, per-field errors, a form-level error and a
submit footer. Values stay controlled by you; validation is declared per field
as `errors`, and each rule's `condition` receives the field's value plus every
other field's value, so cross-field rules are just a lookup:

```tsx
<Form
	fields={[
		{
			name: "host",
			label: "Host",
			value: host,
			onChange: setHost,
			required: true,
			info: "Defaults to localhost.",
			errors: [{ message: "Host is required", condition: (value) => value === "" }],
		},
		{
			name: "password",
			label: "Password",
			type: "password",
			value: password,
			onChange: setPassword,
			link: { label: "Managing credentials", url: "https://docs.falkordb.com" },
		},
		{
			name: "confirm",
			label: "Confirm password",
			type: "password",
			value: confirm,
			onChange: setConfirm,
			// Re-check this field whenever `password` changes, too.
			revalidateWith: ["password"],
			errors: [
				{
					message: "Passwords do not match",
					condition: (value, values) => value !== values.password,
				},
			],
		},
	]}
	error={connectionError}
	submitLabel="Connect"
	onSubmit={connect}
	actions={
		<Button variant="cancel" onClick={close}>
			Cancel
		</Button>
	}
/>
```

When fields are checked:

- A field is checked as it changes, and so is every field that lists it in
  `revalidateWith`.
- Every field is checked on submit. A failing field blocks `onSubmit`, and the
  submit button shows a spinner while an async `onSubmit` runs.
- Every field is checked again when the set of fields changes, for example when
  a login form switches mode. This does not happen on mount, so an untouched
  form starts clean.

`required` only draws the asterisk. Whether an empty value is an error is up to
the field's `errors`, so a field can be marked required and still fall back to
a default. Declaring `errors` also reserves the line the message appears on, so
the layout does not jump when one shows up.

Field `type` is `text` by default and can be:

- any text-like input type
- `password`
- `textarea`
- `select`, with `options`
- `tag`, with `tags`, `onAddTag`, `onRemoveTag` and an optional `normalize`
- `custom`, whose `render({ id, invalid, onValueChange })` draws a control the
  form does not ship, such as a searchable picker

Set `id` on a field to fix the control's id; otherwise one is generated.

Layout:

- `children` render between the fields and the form-level error. Use them for
  an optional section.
- `actions` render in the footer, to the left of the submit button.
- `submitDisabled` and `submitProps` adjust the default submit button, and
  `renderSubmit` replaces it.
- `renderInfo` replaces the default info hint.
- `classNames` reaches the parts `className` cannot: `field`, `label`,
  `control`, `description`, `message`, `error`, `footer` and `tag`.

For a layout `fields` cannot express, the parts are exported too:

- `FormField` generates the ids and owns the error state.
- `FormControl` wires them onto whichever control you put inside it.
- `FormMessage` renders its children as a form-level error when used outside a
  `FormField`.

### Hints

`HintTip` is an info glyph that reveals a hint. Radix tooltips never open on
touch, so pass `mode="popover"` on a touch layout and the hint opens on tap
instead:

```tsx
<HintTip mode={isTouch ? "popover" : "tooltip"}>Defaults to localhost.</HintTip>
```

Where the trigger is a real control, use that control's `tooltip` instead.

### Overlays and menus

- `DropdownMenuContent` and `DropdownMenuSubContent` take `preventOutsideClose`.
  It keeps a menu open through outside clicks and Escape, for example while a
  guided walkthrough points at it.
- `AlertDialogContent` takes `overlayClassName`, like `DialogContent`.
- `DrawerContent` takes `side` (`bottom`, `left` or `right`), `handleClassName`
  and `overlayClassName`. It pads itself for safe-area insets.

### Tables

`Table` wraps its `<table>` in a scrolling `<div>`. A virtualised or infinitely
scrolling table needs that wrapper's ref and scroll events, so `containerProps`
passes props through to it:

```tsx
<Table containerProps={{ ref: scrollRef, onScroll: loadMoreNearBottom, className: "h-96" }}>…</Table>
```

### Sliders and progress

- `Slider` renders one thumb per value.
- `renderThumb(thumb, index)` wraps each thumb, for example in a tooltip that
  reads out the value.
- `thumbClassName` styles the thumbs.
- `Progress` takes `indicatorClassName` for its filled bar.

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

## Web components

Self-contained components for any framework, or none at all. Each one renders in its own shadow DOM and ships as a separate npm package from [`web-components/`](./web-components):

| Package                                                       | Element             | What it is                                                                    |
| ------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| [`@falkordb/canvas`](./web-components/canvas)                 | `<falkordb-canvas>` | Force-directed graph canvas                                                   |
| [`@falkordb/ui-chat`](./web-components/chat)                  | `<falkordb-chat>`   | Chat panel. The host supplies the backend call.                               |
| [`@falkordb/support-widget`](./web-components/support-widget) | floating widget     | Support chat answered by a GraphRAG-Server graph, with a Contact Support form |

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

The repository is an npm workspace. The root is `@falkordb/ui`, and each folder in `web-components/` is its own package with its own build, lint and test scripts:

```bash
npm run build:web-components
npm run test:web-components
npm run build -w web-components/canvas   # a single package
```

## Releasing

Publishing runs when a GitHub Release is created and uses npm OIDC trusted publishing, so the repository holds no npm tokens. The release tag chooses the package:

| Tag                         | Publishes                  |
| --------------------------- | -------------------------- |
| `v<version>`                | `@falkordb/ui`             |
| `canvas-v<version>`         | `@falkordb/canvas`         |
| `chat-v<version>`           | `@falkordb/ui-chat`        |
| `support-widget-v<version>` | `@falkordb/support-widget` |

Each package must list this repository's `release.yml` as a trusted publisher on npmjs.com.

## License

MIT
