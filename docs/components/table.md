# Table

A styled HTML table for tabular data, such as query results.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-table--docs) · [Source](../../src/components/table.tsx)

## Import

```tsx
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@falkordb/ui";
```

## Usage

```tsx
<Table>
	<TableCaption>3 rows returned in 1.2 ms</TableCaption>
	<TableHeader>
		<TableRow>
			<TableHead>name</TableHead>
			<TableHead>age</TableHead>
		</TableRow>
	</TableHeader>
	<TableBody>
		{rows.map((row) => (
			<TableRow key={row.id} data-state={row.id === selectedId ? "selected" : undefined}>
				<TableCell>{row.name}</TableCell>
				<TableCell>{row.age}</TableCell>
			</TableRow>
		))}
	</TableBody>
</Table>
```

### Selected rows

Set `data-state="selected"` on a `TableRow` to highlight it.

### Virtualised tables

The table sits inside a scrolling wrapper. `containerProps` reaches that wrapper, so a virtualiser can measure and listen to it:

```tsx
<Table containerProps={{ ref: scrollRef, onScroll: handleScroll, className: "max-h-96" }}>…</Table>
```

## Parts

| Part           | Element                           |
| -------------- | --------------------------------- |
| `Table`        | `table`, inside a scrolling `div` |
| `TableHeader`  | `thead`                           |
| `TableBody`    | `tbody`                           |
| `TableFooter`  | `tfoot`                           |
| `TableRow`     | `tr`                              |
| `TableHead`    | `th`                              |
| `TableCell`    | `td`                              |
| `TableCaption` | `caption`                         |

Each part accepts the attributes of its element. `Table` also takes:

| Prop             | Type                                                             | Description                      |
| ---------------- | ---------------------------------------------------------------- | -------------------------------- |
| `containerProps` | `HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }` | Props for the scrolling wrapper. |
