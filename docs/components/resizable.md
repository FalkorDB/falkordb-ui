# Resizable

Panels separated by draggable dividers, such as an editor beside a canvas.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--panels) · [Source](../../src/components/resizable.tsx) · [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)

## Import

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@falkordb/ui";
```

## Usage

```tsx
<ResizablePanelGroup orientation="horizontal" className="h-48 rounded-lg border border-border">
	<ResizablePanel defaultSize={40}>Query editor</ResizablePanel>
	<ResizableHandle withHandle />
	<ResizablePanel>Canvas</ResizablePanel>
</ResizablePanelGroup>
```

## Parts

| Part                  | Wraps       | Description                                                         |
| --------------------- | ----------- | ------------------------------------------------------------------- |
| `ResizablePanelGroup` | `Group`     | The container. Set `orientation` to `"horizontal"` or `"vertical"`. |
| `ResizablePanel`      | `Panel`     | One panel. Takes `defaultSize`, `minSize`, `maxSize` and more.      |
| `ResizableHandle`     | `Separator` | The divider between two panels.                                     |

Each part accepts the props of the [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) component it wraps (version 4).

### `ResizableHandle` props

| Prop         | Type      | Default | Description                                |
| ------------ | --------- | ------- | ------------------------------------------ |
| `withHandle` | `boolean` | `false` | Draws a grip in the middle of the divider. |

The divider is drawn 1px wide, but a wider invisible strip around it takes the pointer, so it is easy to grab.
