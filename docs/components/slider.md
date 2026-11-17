# Slider

A draggable control for picking a number, or a range with two thumbs.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/story/primitives-controls--slider-with-value) · [Source](../../src/components/slider.tsx) · [Radix Slider](https://www.radix-ui.com/primitives/docs/components/slider)

## Import

```tsx
import { Slider } from "@falkordb/ui";
```

## Usage

The value is always an array: one number per thumb.

```tsx
const [seconds, setSeconds] = useState([30]);

<Slider value={seconds} onValueChange={setSeconds} max={60} />;
```

A range slider passes two values and gets two thumbs:

```tsx
<Slider defaultValue={[10, 40]} max={100} />
```

### Show the value in a tooltip

`renderThumb` wraps each thumb. The thumb must stay the trigger, so pass it through with `asChild`:

```tsx
import { Slider, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@falkordb/ui";

<TooltipProvider>
	<Slider
		value={value}
		onValueChange={setValue}
		max={60}
		renderThumb={(thumb) => (
			<Tooltip>
				<TooltipTrigger asChild>{thumb}</TooltipTrigger>
				<TooltipContent>{value[0]} seconds</TooltipContent>
			</Tooltip>
		)}
	/>
</TooltipProvider>;
```

## Props

Accepts the props of [Radix Slider](https://www.radix-ui.com/primitives/docs/components/slider#api-reference) (`value`, `defaultValue`, `onValueChange`, `min`, `max`, `step`, `disabled`, …), plus:

| Prop             | Type                                                | Description                                 |
| ---------------- | --------------------------------------------------- | ------------------------------------------- |
| `renderThumb`    | `(thumb: ReactElement, index: number) => ReactNode` | Wraps each thumb, for example in a tooltip. |
| `thumbClassName` | `string`                                            | Classes for every thumb.                    |

One thumb renders per entry in `value` (or `defaultValue`); with neither, one thumb renders.

## Related

[Progress](./progress.md) for read-only values · [Tooltip](./tooltip.md)
