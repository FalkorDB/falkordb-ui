# Skeleton

A pulsing placeholder shown while content loads.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--loading) · [Source](../../src/components/skeleton.tsx)

## Import

```tsx
import { Skeleton } from "@falkordb/ui";
```

## Usage

Give it the size of the content it stands in for:

```tsx
<div className="flex items-center gap-3">
	<Skeleton className="size-10 rounded-full" />
	<div className="flex flex-col gap-2">
		<Skeleton className="h-4 w-48" />
		<Skeleton className="h-4 w-32" />
	</div>
</div>
```

## Props

Accepts every `<div>` attribute. There are no extra props.

## Accessibility

A skeleton is a bare `<div>` with no role, so screen readers get no signal that content is loading. Mark the loading region with `aria-busy` and add visually hidden status text:

```tsx
<div aria-busy="true">
	<span className="sr-only">Loading graphs…</span>
	<Skeleton className="h-4 w-48" aria-hidden />
</div>
```

## Related

[Progress](./progress.md) for loading with a known amount.
