import type { Meta, StoryObj } from "@storybook/react";

import { Switch } from "@/components/switch";

const meta = {
	title: "Primitives/Switch",
	component: Switch,
	tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<label className="flex items-center gap-3 text-sm">
			<Switch {...args} />
			Animate force layout
		</label>
	),
};

export const Checked: Story = {
	...Default,
	args: { defaultChecked: true },
};

export const Disabled: Story = {
	...Default,
	args: { disabled: true, defaultChecked: true },
};
