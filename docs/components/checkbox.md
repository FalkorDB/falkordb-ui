# Checkbox

A checkbox with checked, unchecked and indeterminate states.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-checkbox--docs) · [Source](../../src/components/checkbox.tsx) · [Radix Checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox)

## Import

```tsx
import { Checkbox } from "@falkordb/ui";
```

## Usage

```tsx
<div className="flex items-center gap-2">
	<Checkbox id="labels" checked={showLabels} onCheckedChange={(checked) => setShowLabels(checked === true)} />
	<Label htmlFor="labels">Show labels</Label>
</div>
```

### Indeterminate

Pass `checked="indeterminate"` to show a dash, for example on a "select all" box when only some rows are selected.

```tsx
<Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={toggleAll} />
```

## Props

Accepts the props of [Radix Checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox#api-reference): `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `required`, `name` and `value`. Works controlled or uncontrolled.

## Related

[Switch](./switch.md) · [Label](./label.md)
