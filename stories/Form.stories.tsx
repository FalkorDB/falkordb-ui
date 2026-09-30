import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/button";
import { Form, type FieldConfig } from "@/components/form";

const meta = {
	title: "Primitives/Form",
	component: Form,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="max-w-md">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

const requiredRule = (label: string) => ({
	message: `${label} is required`,
	condition: (value: string) => value.trim() === "",
});

export const Default: Story = {
	args: { fields: [], submitLabel: "Create" },
	render: (args) => {
		const [name, setName] = useState("");

		return (
			<Form
				{...args}
				fields={[
					{
						name: "graph",
						label: "Graph name",
						value: name,
						onChange: setName,
						required: true,
						placeholder: "social-network",
						description: "Unique per connection and fixed once created.",
						errors: [requiredRule("Graph name")],
					},
				]}
			>
				<Button variant="cancel">Cancel</Button>
			</Form>
		);
	},
};

/** Mixed field types, a cross-field rule, an info tooltip and a help link. */
export const Connection: Story = {
	args: { fields: [], submitLabel: "Log in" },
	render: (args) => {
		const [host, setHost] = useState("localhost");
		const [port, setPort] = useState("70000");
		const [username, setUsername] = useState("");
		const [password, setPassword] = useState("");
		const [confirm, setConfirm] = useState("");

		const fields: FieldConfig[] = [
			{
				name: "host",
				label: "Host",
				value: host,
				onChange: setHost,
				required: true,
				info: "Where FalkorDB is listening. Use TLS for FalkorDB Cloud.",
				errors: [requiredRule("Host")],
			},
			{
				name: "port",
				label: "Port",
				value: port,
				onChange: setPort,
				required: true,
				description: "Defaults to 6379.",
				errors: [
					{ message: "Port must be a number", condition: (value) => !/^\d+$/.test(value) },
					{
						message: "Port must be between 1 and 65535",
						condition: (value) => Number(value) < 1 || Number(value) > 65535,
					},
				],
				link: { label: "Where do I find this?", url: "https://docs.falkordb.com" },
			},
			{ name: "username", label: "Username", value: username, onChange: setUsername },
			{ name: "password", label: "Password", value: password, onChange: setPassword, type: "password" },
			{
				name: "confirm",
				label: "Confirm password",
				value: confirm,
				onChange: setConfirm,
				type: "password",
				errors: [
					{ message: "Passwords do not match", condition: (value, values) => value !== values.password },
				],
			},
		];

		return (
			<Form {...args} fields={fields} onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1200))}>
				<Button variant="cancel">Cancel</Button>
			</Form>
		);
	},
};

export const SelectAndTags: Story = {
	args: { fields: [], submitLabel: "Add user" },
	render: (args) => {
		const [role, setRole] = useState("Read-Write");
		const [graphs, setGraphs] = useState(["social-network"]);

		return (
			<Form
				{...args}
				fields={[
					{
						name: "role",
						label: "Role",
						type: "select",
						value: role,
						onChange: setRole,
						options: ["Admin", "Read-Write", "Read-Only"],
						description: "Applies to every graph on this connection.",
					},
					{
						name: "graphs",
						label: "Graphs",
						type: "tag",
						value: graphs.join(","),
						tags: graphs,
						onAddTag: (tag) => setGraphs((previous) => [...previous, tag]),
						onRemoveTag: (index) => setGraphs((previous) => previous.filter((_, i) => i !== index)),
						info: "Leave empty to grant access to every graph.",
					},
				]}
			/>
		);
	},
};

export const FormLevelError: Story = {
	args: {
		fields: [],
		submitLabel: "Log in",
		error: "Could not reach the server at localhost:6379.",
	},
	render: (args) => {
		const [host, setHost] = useState("localhost");

		return <Form {...args} fields={[{ name: "host", label: "Host", value: host, onChange: setHost }]} />;
	},
};

export const Disabled: Story = {
	args: { fields: [], submitLabel: "Save" },
	render: (args) => (
		<Form
			{...args}
			fields={[
				{
					name: "host",
					label: "Host",
					value: "cloud.falkordb.com",
					onChange: () => {},
					disabled: true,
					description: "Managed connections cannot be edited.",
				},
				{
					name: "secret",
					label: "Password",
					type: "password",
					value: "hunter2",
					onChange: () => {},
					disabled: true,
				},
			]}
		/>
	),
};
