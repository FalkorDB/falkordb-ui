import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";

describe("Input", () => {
	it("accepts typed text", async () => {
		render(<Input placeholder="Graph name" />);

		const input = screen.getByPlaceholderText("Graph name");
		await userEvent.type(input, "social-network");
		expect(input).toHaveValue("social-network");
	});

	it("passes the type through", () => {
		render(<Input type="password" data-testid="pw" />);
		expect(screen.getByTestId("pw")).toHaveAttribute("type", "password");
	});

	it("does not accept input while disabled", async () => {
		render(<Input disabled placeholder="Graph name" />);

		const input = screen.getByPlaceholderText("Graph name");
		await userEvent.type(input, "abc");
		expect(input).toHaveValue("");
	});

	it("exposes the invalid state to assistive tech", () => {
		render(<Input aria-invalid placeholder="Graph name" />);
		expect(screen.getByPlaceholderText("Graph name")).toHaveAttribute("aria-invalid", "true");
	});

	it("forwards a ref and merges a className", () => {
		const ref = createRef<HTMLInputElement>();
		render(<Input ref={ref} className="w-40" placeholder="Graph name" />);

		expect(ref.current).toBeInstanceOf(HTMLInputElement);
		expect(screen.getByPlaceholderText("Graph name")).toHaveClass("w-40");
	});
});

describe("Textarea", () => {
	it("accepts typed text", async () => {
		render(<Textarea placeholder="Cypher" />);

		const textarea = screen.getByPlaceholderText("Cypher");
		await userEvent.type(textarea, "MATCH (n) RETURN n");
		expect(textarea).toHaveValue("MATCH (n) RETURN n");
	});

	it("does not accept input while disabled", async () => {
		render(<Textarea disabled placeholder="Cypher" />);

		const textarea = screen.getByPlaceholderText("Cypher");
		await userEvent.type(textarea, "abc");
		expect(textarea).toHaveValue("");
	});

	it("forwards a ref and merges a className", () => {
		const ref = createRef<HTMLTextAreaElement>();
		render(<Textarea ref={ref} className="min-h-40" placeholder="Cypher" />);

		expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
		expect(screen.getByPlaceholderText("Cypher")).toHaveClass("min-h-40");
	});
});
