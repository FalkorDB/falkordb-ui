import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Label } from "@/components/label";
import { Progress } from "@/components/progress";
import { RadioGroup, RadioGroupItem } from "@/components/radio-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { Skeleton } from "@/components/skeleton";
import { Slider } from "@/components/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

const meta = {
	title: "Primitives/Controls",
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radios: Story = {
	render: () => (
		<RadioGroup defaultValue="host" className="flex gap-6">
			<div className="flex items-center gap-2">
				<RadioGroupItem value="host" id="mode-host" />
				<Label htmlFor="mode-host">Host and port</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="url" id="mode-url" />
				<Label htmlFor="mode-url">Connection URL</Label>
			</div>
		</RadioGroup>
	),
};

export const SliderWithValue: Story = {
	render: function Render() {
		const [value, setValue] = useState([30]);
		return (
			<TooltipProvider>
				<div className="w-72">
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
				</div>
			</TooltipProvider>
		);
	},
};

export const Loading: Story = {
	render: () => (
		<div className="flex w-72 flex-col gap-4">
			<Progress value={62} />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-2/3" />
		</div>
	),
};

export const Panels: Story = {
	render: () => (
		<ResizablePanelGroup orientation="horizontal" className="h-48 w-[480px] rounded-lg border border-border">
			<ResizablePanel defaultSize={40} className="p-4 text-sm">
				Query editor
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel className="p-4 text-sm">Canvas</ResizablePanel>
		</ResizablePanelGroup>
	),
};
