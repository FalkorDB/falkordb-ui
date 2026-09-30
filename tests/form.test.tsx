import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormFooter,
	FormLabel,
	FormMessage,
	useFormField,
	type FieldConfig,
} from "@/components/form";
import { Input } from "@/components/input";

describe("Form parts", () => {
	it("labels its control and describes it with the description", () => {
		render(
			<FormField>
				<FormLabel>Host</FormLabel>
				<FormControl>
					<Input />
				</FormControl>
				<FormDescription>Where FalkorDB is listening.</FormDescription>
			</FormField>,
		);

		const input = screen.getByLabelText("Host");
		expect(input).not.toHaveAttribute("aria-invalid");
		expect(input).toHaveAccessibleDescription("Where FalkorDB is listening.");
	});

	it("marks a required field without adding the asterisk to the accessible name", () => {
		render(
			<FormField>
				<FormLabel required>Host</FormLabel>
				<FormControl>
					<Input />
				</FormControl>
			</FormField>,
		);

		expect(screen.getByRole("textbox", { name: "Host" })).toBeInTheDocument();
		expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
	});

	it("reveals info help on hover", async () => {
		render(
			<FormField>
				<FormLabel info="Use TLS for FalkorDB Cloud.">Host</FormLabel>
			</FormField>,
		);

		await userEvent.hover(screen.getByRole("button", { name: "More information" }));
		expect(await screen.findAllByText("Use TLS for FalkorDB Cloud.")).not.toHaveLength(0);
	});

	it("propagates an error to the label, the control and the message", () => {
		render(
			<FormField error="Port must be a number">
				<FormLabel>Port</FormLabel>
				<FormControl>
					<Input />
				</FormControl>
				<FormDescription>Defaults to 6379.</FormDescription>
				<FormMessage />
			</FormField>,
		);

		const input = screen.getByLabelText("Port");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAccessibleDescription("Defaults to 6379. Port must be a number");
		expect(screen.getByText("Port")).toHaveClass("text-destructive");
		expect(screen.getByRole("alert")).toHaveTextContent("Port must be a number");
	});

	it("renders nothing from FormMessage without an error or children", () => {
		render(
			<FormField>
				<FormMessage />
			</FormField>,
		);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("renders a form-level message from children outside a field", () => {
		const ref = createRef<HTMLParagraphElement>();
		render(
			<FormMessage ref={ref} className="mt-2">
				Could not reach the server.
			</FormMessage>,
		);

		const message = screen.getByRole("alert");
		expect(ref.current).toBe(message);
		expect(message).toHaveTextContent("Could not reach the server.");
		expect(message).toHaveClass("mt-2");
		expect(message).not.toHaveAttribute("id");
	});

	it("leaves the wiring alone outside a field", () => {
		render(
			<>
				<FormLabel htmlFor="port">Port</FormLabel>
				<FormControl>
					<Input id="port" />
				</FormControl>
				<FormDescription>Defaults to 6379.</FormDescription>
			</>,
		);

		const input = screen.getByLabelText("Port");
		expect(input).toHaveAttribute("id", "port");
		expect(input).not.toHaveAttribute("aria-describedby");
		expect(input).not.toHaveAttribute("aria-invalid");
	});

	it("forwards refs and merges classNames on the remaining parts", () => {
		const fieldRef = createRef<HTMLDivElement>();
		const labelRef = createRef<HTMLLabelElement>();
		const descriptionRef = createRef<HTMLParagraphElement>();
		const footerRef = createRef<HTMLDivElement>();
		render(
			<FormField ref={fieldRef} className="gap-3">
				<FormLabel ref={labelRef} className="uppercase">
					Host
				</FormLabel>
				<FormDescription ref={descriptionRef} className="italic">
					Hostname or IP.
				</FormDescription>
				<FormFooter ref={footerRef} className="justify-start">
					<button type="submit">Save</button>
				</FormFooter>
			</FormField>,
		);

		expect(fieldRef.current).toHaveClass("gap-3");
		expect(labelRef.current).toHaveClass("uppercase");
		expect(descriptionRef.current).toHaveClass("italic");
		expect(footerRef.current).toHaveClass("justify-start");
	});
});

describe("useFormField", () => {
	function Probe() {
		const field = useFormField();
		return <span data-testid="probe">{field ? field.controlId : "none"}</span>;
	}

	it("returns null outside a field", () => {
		render(<Probe />);
		expect(screen.getByTestId("probe")).toHaveTextContent("none");
	});

	it("returns the field ids inside one", () => {
		render(
			<FormField>
				<Probe />
			</FormField>,
		);

		expect(screen.getByTestId("probe")).not.toHaveTextContent("none");
	});
});

const hostRequired = { message: "Host is required", condition: (value: string) => value.trim() === "" };

function HostForm({ onSubmit, error }: { onSubmit?: () => void | Promise<void>; error?: string }) {
	const [host, setHost] = useState("");

	return (
		<Form
			fields={[{ name: "host", label: "Host", value: host, onChange: setHost, errors: [hostRequired] }]}
			onSubmit={onSubmit}
			error={error}
			submitLabel="Connect"
		/>
	);
}

describe("Form", () => {
	it("renders a field with its label, description, help link and info", async () => {
		render(
			<Form
				fields={[
					{
						name: "host",
						label: "Host",
						value: "localhost",
						onChange: vi.fn(),
						required: true,
						description: "Where FalkorDB is listening.",
						info: "Use TLS for FalkorDB Cloud.",
						link: { label: "Docs", url: "https://docs.falkordb.com" },
					},
				]}
			/>,
		);

		const input = screen.getByRole("textbox", { name: "Host" });
		expect(input).toHaveValue("localhost");
		expect(input).toBeRequired();
		expect(input).toHaveAccessibleDescription("Where FalkorDB is listening.");
		expect(screen.getByRole("link", { name: /Docs/ })).toHaveAttribute("href", "https://docs.falkordb.com");
		expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();

		await userEvent.hover(screen.getByRole("button", { name: "More information" }));
		expect(await screen.findAllByText("Use TLS for FalkorDB Cloud.")).not.toHaveLength(0);
	});

	it("blocks submit while a field is invalid, then submits once it is fixed", async () => {
		const onSubmit = vi.fn();
		render(<HostForm onSubmit={onSubmit} />);

		await userEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toHaveTextContent("Host is required");
		expect(screen.getByRole("textbox", { name: "Host" })).toHaveAttribute("aria-invalid", "true");

		await userEvent.type(screen.getByRole("textbox", { name: "Host" }), "localhost");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it("flags a field that becomes invalid while typing", async () => {
		render(<HostForm />);

		const input = screen.getByRole("textbox", { name: "Host" });
		await userEvent.type(input, "a");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		await userEvent.clear(input);
		expect(screen.getByRole("alert")).toHaveTextContent("Host is required");
	});

	it("shows a busy submit button while an async submit runs", async () => {
		let resolveSubmit = () => {};
		const onSubmit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveSubmit = resolve;
				}),
		);
		render(<Form fields={[]} onSubmit={onSubmit} submitLabel="Connect" />);

		await userEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(screen.getByRole("button", { name: "" })).toBeDisabled();

		resolveSubmit();
		expect(await screen.findByRole("button", { name: "Connect" })).toBeEnabled();
	});

	it("submits without an onSubmit handler and renders footer actions", async () => {
		const onCancel = vi.fn();
		render(
			<Form
				fields={[]}
				submitLabel="Connect"
				actions={
					<button type="button" onClick={onCancel}>
						Cancel
					</button>
				}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		await userEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("renders a form-level error", () => {
		render(<HostForm error="Could not reach the server." />);
		expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the server.");
	});

	it("re-checks a cross-field rule when the other side changes", async () => {
		function PasswordForm() {
			const [password, setPassword] = useState("");
			const [confirm, setConfirm] = useState("");
			const fields: FieldConfig[] = [
				{ name: "password", label: "Password", type: "password", value: password, onChange: setPassword },
				{
					name: "confirm",
					label: "Confirm",
					type: "password",
					value: confirm,
					onChange: setConfirm,
					revalidateWith: ["password"],
					errors: [
						{
							message: "Passwords do not match",
							condition: (value, values) => value !== values.password,
						},
					],
				},
			];
			return <Form fields={fields} />;
		}

		render(<PasswordForm />);

		await userEvent.type(screen.getByLabelText("Confirm"), "hunter2");
		expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");

		await userEvent.type(screen.getByLabelText("Password"), "hunter2");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("toggles password visibility", async () => {
		render(
			<Form
				fields={[{ name: "pw", label: "Password", type: "password", value: "hunter2", onChange: vi.fn() }]}
			/>,
		);

		const input = screen.getByLabelText("Password");
		expect(input).toHaveAttribute("type", "password");

		await userEvent.click(screen.getByRole("button", { name: "Show password" }));
		expect(input).toHaveAttribute("type", "text");

		await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
		expect(input).toHaveAttribute("type", "password");
	});

	it("renders a typed input and a textarea", async () => {
		const onNumber = vi.fn();
		const onQuery = vi.fn();
		render(
			<Form
				fields={[
					{ name: "port", label: "Port", type: "number", value: "6379", onChange: onNumber },
					{
						name: "query",
						label: "Query",
						type: "textarea",
						value: "",
						onChange: onQuery,
						errors: [{ message: "Query is required", condition: (value) => value === "" }],
					},
				]}
			/>,
		);

		expect(screen.getByLabelText("Port")).toHaveAttribute("type", "number");

		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(screen.getByRole("textbox", { name: "Query" })).toHaveAttribute("aria-invalid", "true");

		await userEvent.type(screen.getByRole("textbox", { name: "Query" }), "M");
		expect(onQuery).toHaveBeenCalledWith("M");
	});

	it("reports the picked option of a select field", async () => {
		const onChange = vi.fn();
		render(
			<Form
				fields={[
					{
						name: "role",
						label: "Role",
						type: "select",
						value: "",
						onChange,
						placeholder: "Pick a role",
						options: ["admin", { value: "ro", label: "Read-Only" }],
						errors: [{ message: "Role is required", condition: (value) => value === "" }],
					},
				]}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(screen.getByRole("alert")).toHaveTextContent("Role is required");
		expect(screen.getByRole("combobox", { name: "Role" })).toHaveAttribute("aria-invalid", "true");

		await userEvent.click(screen.getByRole("combobox", { name: "Role" }));
		await userEvent.click(await screen.findByRole("option", { name: "Read-Only" }));
		expect(onChange).toHaveBeenCalledWith("ro");
	});

	it("disables every part of a disabled field", () => {
		render(
			<Form
				fields={[
					{ name: "host", label: "Host", value: "localhost", onChange: vi.fn(), disabled: true },
					{ name: "pw", label: "Password", type: "password", value: "x", onChange: vi.fn(), disabled: true },
				]}
			/>,
		);

		expect(screen.getByLabelText("Host")).toBeDisabled();
		expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
	});
});

describe("Form tag field", () => {
	function TagForm({ disabled = false }: { disabled?: boolean } = {}) {
		const [tags, setTags] = useState(["social-network"]);

		return (
			<Form
				fields={[
					{
						name: "graphs",
						label: "Graphs",
						type: "tag",
						value: tags.join(","),
						tags,
						disabled,
						onAddTag: (tag) => setTags((previous) => [...previous, tag]),
						onRemoveTag: (index) => setTags((previous) => previous.filter((_, i) => i !== index)),
						errors: [{ message: "Pick at least one graph", condition: (value) => value === "" }],
					},
				]}
			/>
		);
	}

	it("adds tags on Enter and on comma, ignoring duplicates and blanks", async () => {
		render(<TagForm />);

		const input = screen.getByLabelText("Graphs");
		await userEvent.type(input, "movies{Enter}");
		await userEvent.type(input, "actors, , social-network,");

		expect(screen.getByText("movies")).toBeInTheDocument();
		expect(screen.getByText("actors")).toBeInTheDocument();
		expect(screen.getAllByText("social-network")).toHaveLength(1);
	});

	it("commits what is left in the box on blur", async () => {
		render(<TagForm />);

		await userEvent.type(screen.getByLabelText("Graphs"), "movies");
		await userEvent.tab();
		expect(screen.getByText("movies")).toBeInTheDocument();
	});

	it("removes the last tag on Backspace and any tag from its button", async () => {
		render(<TagForm />);

		await userEvent.click(screen.getByRole("button", { name: "Remove social-network" }));
		expect(screen.queryByText("social-network")).not.toBeInTheDocument();

		const input = screen.getByLabelText("Graphs");
		await userEvent.type(input, "movies{Enter}");
		await userEvent.type(input, "{Backspace}");
		expect(screen.queryByText("movies")).not.toBeInTheDocument();
	});

	it("focuses the input when the box is clicked", async () => {
		render(<TagForm />);

		await userEvent.click(screen.getByText("social-network"));
		expect(screen.getByLabelText("Graphs")).toHaveFocus();
	});

	it("hides the remove buttons and the input while disabled", () => {
		render(<TagForm disabled />);

		expect(screen.queryByRole("button", { name: "Remove social-network" })).not.toBeInTheDocument();
		expect(screen.getByLabelText("Graphs")).toBeDisabled();
	});

	it("flags an invalid tag field on submit", async () => {
		render(
			<Form
				fields={[
					{
						name: "graphs",
						label: "Graphs",
						type: "tag",
						value: "",
						tags: [],
						placeholder: "Type and press Enter",
						onAddTag: vi.fn(),
						onRemoveTag: vi.fn(),
						errors: [{ message: "Pick at least one graph", condition: (value) => value === "" }],
					},
				]}
			/>,
		);

		expect(screen.getByPlaceholderText("Type and press Enter")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one graph");
		expect(screen.getByLabelText("Graphs")).toHaveAttribute("aria-invalid", "true");
	});
});

describe("Form options", () => {
	it("uses a field's own id and never sets native required", () => {
		render(
			<Form
				fields={[{ name: "host", id: "Host", label: "Host", value: "", onChange: vi.fn(), required: true }]}
			/>,
		);

		const input = screen.getByRole("textbox", { name: "Host" });
		expect(input).toHaveAttribute("id", "Host");
		expect(input).not.toHaveAttribute("required");
		expect(input).toHaveAttribute("aria-required", "true");
	});

	it("submits an empty required field that no rule rejects", async () => {
		const onSubmit = vi.fn();
		render(
			<Form
				fields={[{ name: "host", label: "Host", value: "", onChange: vi.fn(), required: true }]}
				onSubmit={onSubmit}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it("leaves a cross-field rule alone when the other side is not listed", async () => {
		function Unlinked() {
			const [password, setPassword] = useState("");
			const [confirm, setConfirm] = useState("x");
			return (
				<Form
					fields={[
						{ name: "password", label: "Password", type: "password", value: password, onChange: setPassword },
						{
							name: "confirm",
							label: "Confirm",
							type: "password",
							value: confirm,
							onChange: setConfirm,
							errors: [
								{
									message: "Passwords do not match",
									condition: (value, values) => value !== values.password,
								},
							],
						},
					]}
				/>
			);
		}
		render(<Unlinked />);

		await userEvent.type(screen.getByLabelText("Password"), "y");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("re-checks every field when the set of fields changes, but not on mount", () => {
		const rule = { message: "URL is required", condition: (value: string) => value === "" };
		const host = { name: "host", label: "Host", value: "", onChange: vi.fn(), errors: [rule] };
		const url = { name: "url", label: "URL", value: "", onChange: vi.fn(), errors: [rule] };
		const { rerender } = render(<Form fields={[host]} />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		rerender(<Form fields={[url]} />);
		expect(screen.getByRole("alert")).toHaveTextContent("URL is required");
	});

	it("clears an error on a field-set change once the field passes", async () => {
		const rule = { message: "Port must be a number", condition: (value: string) => !/^\d*$/.test(value) };
		const port = (value: string) => ({
			name: "port",
			label: "Port",
			value,
			onChange: vi.fn(),
			errors: [rule],
		});
		const { rerender } = render(<Form fields={[port("abc")]} />);

		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(screen.getByRole("alert")).toHaveTextContent("Port must be a number");

		rerender(<Form fields={[port("6379"), { name: "host", label: "Host", value: "", onChange: vi.fn() }]} />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("renders a non-string form-level error as given", () => {
		render(<Form fields={[]} error={<span data-testid="rich-error">Offline</span>} />);
		expect(screen.getByTestId("rich-error")).toHaveTextContent("Offline");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("reserves a line for the message only on fields that declare rules", () => {
		const { container } = render(
			<Form
				fields={[
					{ name: "a", label: "A", value: "", onChange: vi.fn() },
					{ name: "b", label: "B", value: "", onChange: vi.fn(), errors: [] },
				]}
			/>,
		);
		expect(container.querySelectorAll(".h-5")).toHaveLength(1);
	});

	it("normalises typed tags and dedupes against the normalised existing ones", async () => {
		const onAddTag = vi.fn();
		render(
			<Form
				fields={[
					{
						name: "keys",
						label: "Keys",
						type: "tag",
						value: "",
						tags: ["~movies"],
						onAddTag,
						onRemoveTag: vi.fn(),
						normalize: (tag) => tag.replace(/^~/, ""),
					},
				]}
			/>,
		);

		await userEvent.type(screen.getByLabelText("Keys"), "~movies,~actors{Enter}");
		expect(onAddTag).toHaveBeenCalledOnce();
		expect(onAddTag).toHaveBeenCalledWith("actors");
		expect(screen.getByText("~movies")).toHaveAttribute("title", "~movies");
	});

	it("renders a custom control wired to the field id and re-checks it", async () => {
		function Picker() {
			const [role, setRole] = useState("");
			return (
				<Form
					fields={[
						{
							name: "role",
							id: "Role",
							label: "Role",
							type: "custom",
							value: role,
							errors: [{ message: "Role is required", condition: (value) => value === "" }],
							render: ({ id, onValueChange }) => (
								<button
									type="button"
									id={id}
									onClick={() => {
										setRole("");
										onValueChange("");
									}}
								>
									pick
								</button>
							),
						},
					]}
				/>
			);
		}
		render(<Picker />);

		const picker = screen.getByRole("button", { name: "Role" });
		expect(picker).toHaveAttribute("id", "Role");
		await userEvent.click(picker);
		expect(screen.getByRole("alert")).toHaveTextContent("Role is required");
	});

	it("places children above the error line and actions beside submit", () => {
		render(
			<Form fields={[]} error="Nope" actions={<button type="button">Cancel</button>}>
				<p>Extra section</p>
			</Form>,
		);

		const extra = screen.getByText("Extra section");
		const error = screen.getByRole("alert");
		const cancel = screen.getByRole("button", { name: "Cancel" });
		expect(extra.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(cancel.parentElement).toBe(screen.getByRole("button", { name: "Submit" }).parentElement);
	});

	it("disables submit on request and forwards submit props", () => {
		render(<Form fields={[]} submitDisabled submitProps={{ id: "submit-button" }} />);
		const submit = screen.getByRole("button", { name: "Submit" });
		expect(submit).toBeDisabled();
		expect(submit).toHaveAttribute("id", "submit-button");
	});

	it("hands the submit button and info hints to render props", async () => {
		const onSubmit = vi.fn();
		render(
			<Form
				fields={[{ name: "host", label: "Host", value: "", onChange: vi.fn(), info: "Hint" }]}
				onSubmit={onSubmit}
				renderInfo={(info) => <span data-testid="custom-info">{info}</span>}
				renderSubmit={({ label, isLoading, disabled }) => (
					<button type="submit" disabled={disabled} data-loading={isLoading}>
						{label}!
					</button>
				)}
			/>,
		);

		expect(screen.getByTestId("custom-info")).toHaveTextContent("Hint");
		await userEvent.click(screen.getByRole("button", { name: "Submit!" }));
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it("merges slot classNames", () => {
		render(
			<Form
				fields={[
					{
						name: "host",
						label: "Host",
						value: "",
						onChange: vi.fn(),
						description: "Where",
						errors: [{ message: "Required", condition: (value) => value === "" }],
					},
				]}
				error="Down"
				classNames={{
					label: "lbl",
					control: "ctl",
					description: "dsc",
					message: "msg",
					error: "err",
					footer: "ftr",
				}}
			/>,
		);

		expect(screen.getByText("Host")).toHaveClass("lbl");
		expect(screen.getByLabelText("Host")).toHaveClass("ctl");
		expect(screen.getByText("Where")).toHaveClass("dsc");
		expect(screen.getByRole("alert")).toHaveClass("msg");
		expect(screen.getByRole("alert").parentElement).toHaveClass("err");
		expect(screen.getByRole("button", { name: "Submit" }).parentElement).toHaveClass("ftr");
	});
});
