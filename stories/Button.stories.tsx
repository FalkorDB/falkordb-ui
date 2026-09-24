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
			<Button {...args} variant="cancel" />
			<Button {...args} variant="destructive" />
			<Button {...args} variant="link" />
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-wrap items-center gap-3">
			<Button {...args} size="default" />
			<Button {...args} size="wide" />
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
		variant: "none",
		size: "none",
		tooltip: "Export graph as CSV",
		children: <Download />,
	},
};

/** A long label truncates instead of stretching the button. */
export const WithLabel: Story = {
	args: {
		className: "w-40",
		children: <Download />,
		label: "Export this graph as CSV",
	},
};

/**
 * `variant="none"` with `size="none"` strips every look, leaving the loading,
 * label and tooltip behaviour for a consumer that dictates its own styling.
 */
export const Unstyled: Story = {
	args: {
		variant: "none",
		size: "none",
		className: "flex gap-2 rounded-lg bg-primary px-4 py-[10px]",
		children: <Download />,
		label: "Export",
	},
};
