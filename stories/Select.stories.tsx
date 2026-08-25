import type { Meta, StoryObj } from "@storybook/react";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/select";

const meta = {
	title: "Primitives/Select",
	component: Select,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="max-w-xs">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Select {...args}>
			<SelectTrigger>
				<SelectValue placeholder="Select a graph" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="social">social-network</SelectItem>
				<SelectItem value="movies">movies</SelectItem>
				<SelectItem value="supply">supply-chain</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Grouped: Story = {
	render: (args) => (
		<Select {...args}>
			<SelectTrigger>
				<SelectValue placeholder="Select a layout" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Force</SelectLabel>
					<SelectItem value="force">Force directed</SelectItem>
					<SelectItem value="radial">Radial</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Hierarchical</SelectLabel>
					<SelectItem value="dagre">Dagre</SelectItem>
					<SelectItem value="tree" disabled>
						Tree (coming soon)
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<Select {...args}>
			<SelectTrigger>
				<SelectValue placeholder="No graphs available" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="none">none</SelectItem>
			</SelectContent>
		</Select>
	),
};
