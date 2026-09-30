import type { Meta, StoryObj } from "@storybook/react";

import { Textarea } from "@/components/textarea";

const meta = {
	title: "Primitives/Textarea",
	component: Textarea,
	tags: ["autodocs"],
	args: { placeholder: "MATCH (n) RETURN n LIMIT 25" },
	decorators: [
		(Story) => (
			<div className="max-w-md">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
	args: { defaultValue: "MATCH (a:Person)-[:KNOWS]->(b:Person)\nRETURN a, b\nLIMIT 100", rows: 5 },
};

export const Invalid: Story = {
	args: { "aria-invalid": true, defaultValue: "MATCH (n RETURN n" },
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Read-only connection" },
};
