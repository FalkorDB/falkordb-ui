# Card

A bordered surface that groups related content.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-card--docs) · [Source](../../src/components/card.tsx)

## Import

```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@falkordb/ui";
```

## Usage

```tsx
<Card>
	<CardHeader>
		<CardTitle>social-network</CardTitle>
		<CardDescription>1,204 nodes · 5,310 edges</CardDescription>
	</CardHeader>
	<CardContent>Last queried 2 minutes ago.</CardContent>
	<CardFooter className="gap-2">
		<Button>Open</Button>
		<Button variant="cancel">Duplicate</Button>
	</CardFooter>
</Card>
```

## Parts

| Part              | Element | Description                                   |
| ----------------- | ------- | --------------------------------------------- |
| `Card`            | `div`   | The surface: border, card background, shadow. |
| `CardHeader`      | `div`   | Column for the title and description.         |
| `CardTitle`       | `h3`    | The heading.                                  |
| `CardDescription` | `p`     | Muted supporting text.                        |
| `CardContent`     | `div`   | The body.                                     |
| `CardFooter`      | `div`   | A row, usually for actions.                   |

Each part accepts the attributes of its element. `CardTitle` is always an `h3`; if your page needs a different heading level, render your own heading in `CardHeader` instead.
