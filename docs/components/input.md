# Input

A single-line text field.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-input--docs) · [Source](../../src/components/input.tsx)

## Import

```tsx
import { Input, Label } from "@falkordb/ui";
```

## Usage

```tsx
<Label htmlFor="host">Host</Label>
<Input id="host" placeholder="localhost" value={host} onChange={(event) => setHost(event.target.value)} />
```

## Props

Accepts every `<input>` attribute. There are no extra props.

## States

- **Invalid:** set `aria-invalid` and the border turns destructive.
- **Disabled:** `disabled` dims the field and shows a not-allowed cursor.

For a labelled field with validation and error messages, use [Form](./form.md), which also adds a show/hide toggle to password fields.

## Related

[Textarea](./textarea.md) · [Label](./label.md) · [Form](./form.md)
