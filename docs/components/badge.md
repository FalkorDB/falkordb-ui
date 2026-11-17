# Badge

A small pill for a status, count or tag.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-badge--docs) · [Source](../../src/components/badge.tsx)

## Import

```tsx
import { Badge, badgeVariants } from "@falkordb/ui";
```

## Usage

```tsx
<Badge>Person</Badge>
<Badge variant="success">Connected</Badge>
<Badge variant="outline">
	<Tag />
	label
</Badge>
```

Icons inside a badge are sized to fit automatically.

## Props

Accepts every `<span>` attribute, plus:

| Prop      | Type                                                                               | Default     |
| --------- | ---------------------------------------------------------------------------------- | ----------- |
| `variant` | `"default" \| "secondary" \| "outline" \| "destructive" \| "success" \| "warning"` | `"default"` |

`badgeVariants({ variant })` returns the class string, for styling another element as a badge.
