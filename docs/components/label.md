# Label

An accessible label for a form control.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--radios) · [Source](../../src/components/label.tsx) · [Radix Label](https://www.radix-ui.com/primitives/docs/components/label)

## Import

```tsx
import { Label } from "@falkordb/ui";
```

## Usage

```tsx
<div className="flex items-center gap-2">
	<Checkbox id="labels" />
	<Label htmlFor="labels">Show labels</Label>
</div>
```

## Props

Accepts the props of [Radix Label](https://www.radix-ui.com/primitives/docs/components/label#api-reference), including `htmlFor` and `asChild`.

## Notes

When the control before it has the `peer` class and is disabled, the label dims too. [Checkbox](./checkbox.md) and [Switch](./switch.md) carry `peer` already.

## Related

[Form](./form.md) has its own `FormLabel`, with a required marker and an info hint.
