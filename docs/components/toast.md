# Toast

A short, non-blocking notification that disappears on its own.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-toast--docs) · [Source](../../src/components/toast.tsx) · [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast)

## Import

```tsx
import { Toaster, ToastAction, dismiss, toast, useToast } from "@falkordb/ui";
```

## Setup

Mount one `Toaster` near the root of your app:

```tsx
<Toaster />
```

## Usage

`toast()` works from anywhere, including outside React components:

```tsx
toast({ title: "Graph saved" });

toast({
	title: "Query failed",
	description: "Unknown function 'lenght'.",
	variant: "destructive",
	action: (
		<ToastAction altText="Retry the query" onClick={retry}>
			Retry
		</ToastAction>
	),
});
```

### Update or dismiss

`toast()` returns a handle:

```tsx
const { id, update, dismiss } = toast({ title: "Importing…" });

update({ title: "Imported 1,204 nodes", variant: "success" });
dismiss();
```

The standalone `dismiss(id)` closes one toast; `dismiss()` with no ID closes them all.

## API

### `toast(options)`

| Option        | Type                                                   | Description                                      |
| ------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `title`       | `ReactNode`                                            | The headline.                                    |
| `description` | `ReactNode`                                            | Supporting text.                                 |
| `variant`     | `"default" \| "destructive" \| "success" \| "warning"` | Colour.                                          |
| `action`      | `ToastActionElement`                                   | A `ToastAction` button. `altText` is required.   |
| `duration`    | `number`                                               | Overrides the `Toaster` duration for this toast. |

Returns `{ id, dismiss, update }`. At most three toasts show at once; a new one pushes out the oldest.

### `Toaster`

| Prop             | Type                                  | Default   | Description                         |
| ---------------- | ------------------------------------- | --------- | ----------------------------------- |
| `duration`       | `number`                              | `5000`    | Milliseconds before a toast closes. |
| `swipeDirection` | `"up" \| "down" \| "left" \| "right"` | `"right"` | Swipe direction that dismisses it.  |

### `useToast()`

Returns `{ toasts, toast, dismiss }`, for building your own toaster.

### Low-level parts

`Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastProvider`, `ToastViewport` and `toastVariants` are exported for a custom toaster. They wrap the matching [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast#api-reference) parts.

## Accessibility

`altText` on `ToastAction` tells screen-reader users how to do the same thing without the toast, which may have closed before they reach it.
