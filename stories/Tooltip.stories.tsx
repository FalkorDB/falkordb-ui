import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

const meta = {
	title: "Primitives/Tooltip",
	component: Tooltip,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<TooltipProvider>
				<div className="flex justify-center py-10">
					<Story />
				</div>
			</TooltipProvider>
		),
	],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Tooltip {...args}>
			<TooltipTrigger asChild>
				<Button variant="secondary">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>Runs the query against the selected graph</TooltipContent>
		</Tooltip>
	),
};

export const Sides: Story = {
	render: () => (
		<div className="flex gap-3">
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Tooltip key={side}>
					<TooltipTrigger asChild>
						<Button variant="outline">{side}</Button>
					</TooltipTrigger>
					<TooltipContent side={side}>Opens on the {side}</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
};
