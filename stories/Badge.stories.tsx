import type { Meta, StoryObj } from "@storybook/react";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/badge";

const meta = {
	title: "Primitives/Badge",
	component: Badge,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "outline", "destructive", "success", "warning"],
		},
	},
	args: { children: "Person" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
	render: (args) => (
		<div className="flex flex-wrap items-center gap-2">
			<Badge {...args} variant="default" />
			<Badge {...args} variant="secondary" />
			<Badge {...args} variant="outline" />
			<Badge {...args} variant="destructive" />
			<Badge {...args} variant="success" />
			<Badge {...args} variant="warning" />
		</div>
	),
};

export const WithIcon: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="success">
				<CircleCheck />
				Connected
			</Badge>
			<Badge variant="warning">
				<TriangleAlert />
				Read-only
			</Badge>
		</div>
	),
};
