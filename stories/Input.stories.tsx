import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "@/components/input";

const meta = {
	title: "Primitives/Input",
	component: Input,
	tags: ["autodocs"],
	args: { placeholder: "Graph name" },
	decorators: [
		(Story) => (
			<div className="max-w-sm">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
	args: { defaultValue: "social-network" },
};

export const Password: Story = {
	args: { type: "password", defaultValue: "hunter2" },
};

export const Invalid: Story = {
	args: { "aria-invalid": true, defaultValue: "not a valid name" },
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "read-only" },
};
