import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { CheckedState } from "@radix-ui/react-checkbox";

import { Checkbox } from "@/components/checkbox";

const meta = {
	title: "Primitives/Checkbox",
	component: Checkbox,
	tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<label className="flex items-center gap-2 text-sm">
			<Checkbox {...args} />
			Run default query on connect
		</label>
	),
};

export const Checked: Story = {
	...Default,
	args: { defaultChecked: true },
};

export const Indeterminate: Story = {
	render: function Render() {
		const [checked, setChecked] = useState<CheckedState>("indeterminate");
		return (
			<label className="flex items-center gap-2 text-sm">
				<Checkbox checked={checked} onCheckedChange={setChecked} />
				Select all labels
			</label>
		);
	},
};

export const Disabled: Story = {
	...Default,
	args: { disabled: true, defaultChecked: true },
};
