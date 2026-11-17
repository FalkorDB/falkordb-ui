# DropdownMenu

A menu of actions that opens from a trigger, with optional checkboxes, radio items and submenus.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--menu) · [Source](../../src/components/dropdown-menu.tsx) · [Radix Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)

## Import

```tsx
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@falkordb/ui";
```

## Usage

```tsx
<DropdownMenu>
	<DropdownMenuTrigger asChild>
		<Button variant="secondary">Graph</Button>
	</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>social-network</DropdownMenuLabel>
		<DropdownMenuItem onSelect={duplicate}>
			Duplicate
			<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
		</DropdownMenuItem>
		<DropdownMenuCheckboxItem checked={showLabels} onCheckedChange={setShowLabels}>
			Show labels
		</DropdownMenuCheckboxItem>
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>Layout</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuRadioGroup value={layout} onValueChange={setLayout}>
					<DropdownMenuRadioItem value="force">Force</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="tree">Tree</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
		<DropdownMenuSeparator />
		<DropdownMenuItem onSelect={remove}>Delete</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
```

## Parts

| Part                                                                  | Description                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DropdownMenu`                                                        | Root. Holds `open`, `onOpenChange` and `modal`.                                      |
| `DropdownMenuTrigger`                                                 | The element that opens the menu.                                                     |
| `DropdownMenuContent`                                                 | The menu. Portalled; `sideOffset` defaults to 4. Takes `preventOutsideClose`.        |
| `DropdownMenuItem`                                                    | An action. Use `onSelect`. Takes `inset`.                                            |
| `DropdownMenuCheckboxItem`                                            | A toggle with a check mark.                                                          |
| `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`                     | Pick one of several options.                                                         |
| `DropdownMenuLabel`                                                   | A non-interactive heading. Takes `inset`.                                            |
| `DropdownMenuSeparator`                                               | A divider.                                                                           |
| `DropdownMenuShortcut`                                                | A right-aligned keyboard hint inside an item. Display only; it does not bind keys.   |
| `DropdownMenuGroup`                                                   | Groups related items.                                                                |
| `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | A nested menu. `SubTrigger` takes `inset`; `SubContent` takes `preventOutsideClose`. |
| `DropdownMenuPortal`                                                  | Portal for custom content.                                                           |

Each part accepts the props of the matching [Radix Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu#api-reference) part.

### Extra props

| Prop                  | On                      | Description                                                                                     |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `inset`               | Item, SubTrigger, Label | Indents the text to line up with checkbox and radio items.                                      |
| `preventOutsideClose` | Content, SubContent     | Keeps the menu open on outside clicks and Escape, for example while a guided tour points at it. |

## Related

[Select](./select.md) for choosing a value · [Popover](./popover.md) for free-form content.
