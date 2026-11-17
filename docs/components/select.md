# Select

A dropdown for choosing one value from a list.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-select--docs) · [Source](../../src/components/select.tsx) · [Radix Select](https://www.radix-ui.com/primitives/docs/components/select)

## Import

```tsx
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@falkordb/ui";
```

## Usage

```tsx
<Select value={graph} onValueChange={setGraph}>
	<SelectTrigger>
		<SelectValue placeholder="Select a graph" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="social">social-network</SelectItem>
		<SelectItem value="movies">movies</SelectItem>
	</SelectContent>
</Select>
```

### Groups

```tsx
<SelectContent>
	<SelectGroup>
		<SelectLabel>Force</SelectLabel>
		<SelectItem value="force">Force directed</SelectItem>
	</SelectGroup>
	<SelectSeparator />
	<SelectGroup>
		<SelectLabel>Hierarchical</SelectLabel>
		<SelectItem value="tree" disabled>
			Tree (coming soon)
		</SelectItem>
	</SelectGroup>
</SelectContent>
```

## Parts

| Part                                             | Description                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `Select`                                         | Root. Holds `value`, `defaultValue`, `onValueChange` and `disabled`.                     |
| `SelectTrigger`                                  | The button that opens the list. Adds a chevron icon.                                     |
| `SelectValue`                                    | Shows the selected item, or `placeholder`.                                               |
| `SelectContent`                                  | The list. Portalled; `position` defaults to `"popper"`, at least as wide as the trigger. |
| `SelectItem`                                     | One option. Shows a check mark when selected.                                            |
| `SelectGroup`, `SelectLabel`                     | Group options under a heading.                                                           |
| `SelectSeparator`                                | A divider between groups.                                                                |
| `SelectScrollUpButton`, `SelectScrollDownButton` | Scroll arrows. `SelectContent` already renders both.                                     |

Each part accepts the props of the matching [Radix Select](https://www.radix-ui.com/primitives/docs/components/select#api-reference) part.

## Related

[Form](./form.md), whose `select` field type builds on this component · [DropdownMenu](./dropdown-menu.md) for actions instead of values.
