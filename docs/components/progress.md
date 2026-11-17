# Progress

A horizontal bar showing how far a task has got.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--loading) · [Source](../../src/components/progress.tsx) · [Radix Progress](https://www.radix-ui.com/primitives/docs/components/progress)

## Import

```tsx
import { Progress } from "@falkordb/ui";
```

## Usage

```tsx
<Progress value={uploaded} aria-label="Upload progress" />
```

`value` is a percentage from 0 to 100. The bar always fills on that scale, so leave `max` at its default of 100.

## Props

Accepts the props of [Radix Progress](https://www.radix-ui.com/primitives/docs/components/progress#api-reference) (`value`, `getValueLabel`, …), plus:

| Prop                 | Type     | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `indicatorClassName` | `string` | Classes for the filled bar, which `className` cannot reach. |

## Related

[Skeleton](./skeleton.md) for loading without a known amount · [Slider](./slider.md) for an editable value.
