# Popover

A floating panel anchored to a trigger, for content richer than a tooltip.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--popover-panel) · [Source](../../src/components/popover.tsx) · [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover)

## Import

```tsx
import { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger } from "@falkordb/ui";
```

## Usage

```tsx
<Popover>
	<PopoverTrigger asChild>
		<Button variant="secondary">Filters</Button>
	</PopoverTrigger>
	<PopoverContent>
		<div className="flex items-center gap-2">
			<Checkbox id="hide-orphans" />
			<Label htmlFor="hide-orphans">Hide orphan nodes</Label>
		</div>
	</PopoverContent>
</Popover>
```

## Parts

| Part             | Description                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Popover`        | Root. Holds `open`, `onOpenChange` and `modal`.                                                                                             |
| `PopoverTrigger` | The element that toggles it.                                                                                                                |
| `PopoverAnchor`  | Positions the panel against another element than the trigger.                                                                               |
| `PopoverContent` | The panel. Portalled, so clipped or scrolling parents never cut it off. `align` defaults to `"center"`, `sideOffset` to 4, width to `w-72`. |
| `PopoverClose`   | Closes the popover when clicked.                                                                                                            |

Each part accepts the props of the matching [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover#api-reference) part.

## Related

[Tooltip](./tooltip.md) for a short label · [DropdownMenu](./dropdown-menu.md) for a list of actions · [Dialog](./dialog.md) for a blocking task.
