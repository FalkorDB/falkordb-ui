# HintTip

An "ⓘ" icon that reveals a hint, for explaining a label or setting.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-overlays--hints) · [Source](../../src/components/hint-tip.tsx)

## Import

```tsx
import { HintTip } from "@falkordb/ui";
```

## Usage

```tsx
<div className="flex items-center gap-1">
	<Label htmlFor="timeout">Query timeout</Label>
	<HintTip>Queries that run longer than this are cancelled.</HintTip>
</div>
```

It brings its own tooltip provider, so no setup is needed.

### Touch layouts

Tooltips never open on touch. On a touch layout, use `mode="popover"`, which opens on tap and has a larger tap area that does not shift the surrounding text:

```tsx
<HintTip mode={isMobile ? "popover" : "tooltip"}>Queries that run longer than this are cancelled.</HintTip>
```

## Props

| Prop               | Type                     | Default     | Description                                           |
| ------------------ | ------------------------ | ----------- | ----------------------------------------------------- |
| `children`         | `ReactNode`              | —           | The hint. Required.                                   |
| `trigger`          | `ReactNode`              | Info icon   | What to show instead of the info icon.                |
| `mode`             | `"tooltip" \| "popover"` | `"tooltip"` | `tooltip` opens on hover and focus; `popover` on tap. |
| `className`        | `string`                 | —           | Classes for the trigger.                              |
| `contentClassName` | `string`                 | —           | Classes for the hint bubble.                          |
| `data-testid`      | `string`                 | —           | Test ID on the trigger.                               |

## When not to use it

When the trigger is a real control, such as a button that runs or deletes something, use the [Button](./button.md)'s `tooltip` prop instead. The click already does something, so it should not also open a hint.

## Accessibility

The trigger is a `<button>` labelled "More information", so it is reachable by keyboard.
