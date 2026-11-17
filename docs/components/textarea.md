# Textarea

A multi-line text field.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-textarea--docs) · [Source](../../src/components/textarea.tsx)

## Import

```tsx
import { Textarea } from "@falkordb/ui";
```

## Usage

```tsx
<Label htmlFor="query">Query</Label>
<Textarea id="query" placeholder="MATCH (n) RETURN n" value={query} onChange={(event) => setQuery(event.target.value)} />
```

## Props

Accepts every `<textarea>` attribute. There are no extra props.

## States

- **Invalid:** set `aria-invalid` and the border turns destructive.
- **Disabled:** `disabled` dims the field and shows a not-allowed cursor.

## Related

[Input](./input.md) · [Form](./form.md), whose `textarea` field type renders this component.
