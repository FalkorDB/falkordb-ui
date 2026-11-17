# Switch

An on/off toggle for a setting that applies immediately.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-switch--docs) · [Source](../../src/components/switch.tsx) · [Radix Switch](https://www.radix-ui.com/primitives/docs/components/switch)

## Import

```tsx
import { Switch } from "@falkordb/ui";
```

## Usage

```tsx
<div className="flex items-center gap-2">
	<Switch id="3d" checked={is3d} onCheckedChange={setIs3d} />
	<Label htmlFor="3d">3D view</Label>
</div>
```

## Props

Accepts the props of [Radix Switch](https://www.radix-ui.com/primitives/docs/components/switch#api-reference) (`checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `name`, …), plus:

| Prop             | Type     | Description                    |
| ---------------- | -------- | ------------------------------ |
| `thumbClassName` | `string` | Classes for the sliding thumb. |

## Related

[Checkbox](./checkbox.md) · [Label](./label.md)
