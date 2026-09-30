import type { Meta, StoryObj } from "@storybook/react";
import { Download, Trash2 } from "lucide-react";

import { Button } from "@/components/button";

const meta = {
	title: "Primitives/Button",
	component: Button,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
		},
		size: { control: "select", options: ["sm", "default", "lg", "icon"] },
	},
	args: { children: "Run query" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
	render: (args) => (
		<div className="flex flex-wrap items-center gap-3">
			<Button {...args} variant="default" />
			<Button {...args} variant="secondary" />
			<Button {...args} variant="outline" />
			<Button {...args} variant="ghost" />
			<Button {...args} variant="destructive" />
			<Button {...args} variant="link" />
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-wrap items-center gap-3">
			<Button {...args} size="sm" />
			<Button {...args} size="default" />
			<Button {...args} size="lg" />
			<Button {...args} size="icon" aria-label="Download">
				<Download />
			</Button>
		</div>
	),
};

export const WithIcon: Story = {
	args: {
		variant: "destructive",
		children: (
			<>
				<Trash2 />
				Delete graph
			</>
		),
	},
};

export const Loading: Story = {
	args: { isLoading: true },
};

export const Disabled: Story = {
	args: { disabled: true },
};

/** Icon-only buttons should always carry a tooltip. */
export const IconWithTooltip: Story = {
	args: {
		size: "icon",
		variant: "ghost",
		tooltip: "Export graph as CSV",
		children: <Download />,
	},
};
