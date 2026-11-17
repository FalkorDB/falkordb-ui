# Button

A clickable button in FalkorDB's styles, with a built-in loading state, trailing label and tooltip.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-button--docs) · [Source](../../src/components/button.tsx)

## Import

```tsx
import { Button, buttonVariants } from "@falkordb/ui";
```

## Usage

```tsx
<Button onClick={runQuery}>Run query</Button>
<Button variant="secondary">Export</Button>
<Button variant="destructive" size="wide">Delete graph</Button>
<Button isLoading>Saving</Button>
```

### Icon-only buttons

An icon-only button needs an accessible name. Pass `tooltip`: the button brings its own `TooltipProvider`, so it works without any setup higher in the tree.

```tsx
<Button variant="none" size="none" className="rounded-md p-2 hover:bg-accent" tooltip="Export graph as CSV">
	<Download />
</Button>
```

### Render as another element

`asChild` renders the button's styles and behaviour onto its single child, for example a link. `isLoading` and `label` still work and render inside that element.

```tsx
<Button asChild variant="link">
	<a href="/docs">Read the docs</a>
</Button>
```

## Props

Accepts every `<button>` attribute, plus:

| Prop             | Type                                                                        | Default     | Description                                                                    |
| ---------------- | --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `variant`        | `"default" \| "secondary" \| "cancel" \| "destructive" \| "link" \| "none"` | `"default"` | Visual style. See [Variants](#variants).                                       |
| `size`           | `"default" \| "wide" \| "none"`                                             | `"default"` | Padding. `wide` suits the outlined variants.                                   |
| `isLoading`      | `boolean`                                                                   | `false`     | Replaces the content with a spinner and disables the button.                   |
| `loaderSize`     | `number`                                                                    | —           | Spinner size in pixels.                                                        |
| `label`          | `ReactNode`                                                                 | —           | Trailing text that truncates instead of widening the button.                   |
| `labelClassName` | `string`                                                                    | —           | Classes for the label.                                                         |
| `tooltip`        | `ReactNode`                                                                 | —           | Wraps the button in a tooltip. Always set it on icon-only buttons.             |
| `tooltipSide`    | `"top" \| "right" \| "bottom" \| "left"`                                    | —           | Which side the tooltip opens on.                                               |
| `asChild`        | `boolean`                                                                   | `false`     | Renders onto the single child element instead of a `<button>`.                 |
| `type`           | `string`                                                                    | `"button"`  | Defaults to `"button"`, so a button inside a form does not submit by accident. |

## Variants

| Variant       | Look                                          |
| ------------- | --------------------------------------------- |
| `default`     | Filled primary.                               |
| `secondary`   | Primary outline.                              |
| `cancel`      | Neutral outline, for the way out of a dialog. |
| `destructive` | Destructive outline.                          |
| `link`        | Text link with an underline on hover.         |
| `none`        | No styles; your own classes set the look.     |

`variant="none"` with `size="none"` leaves the whole geometry to your classes.

`buttonVariants({ variant, size })` returns the class string, for styling another element as a button.

## Accessibility

- While loading, the button is disabled and sets `aria-busy`.
- With `asChild`, `disabled` and `isLoading` set `aria-disabled` on the child instead, because not every element supports `disabled`.

## Related

[Tooltip](./tooltip.md) · [AlertDialog](./alert-dialog.md) uses the `default` and `cancel` looks for its actions.
