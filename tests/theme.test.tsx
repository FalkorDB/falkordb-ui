import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "@/theme/theme-provider";
import { ThemeToggle } from "@/theme/theme-toggle";
import { setPrefersDark } from "./match-media";

const STORAGE_KEY = "falkordb-ui-theme";

function Probe() {
	const { theme, resolvedTheme, setTheme } = useTheme();
	return (
		<div>
			<span data-testid="theme">{theme}</span>
			<span data-testid="resolved">{resolvedTheme}</span>
			<button type="button" onClick={() => setTheme("dark")}>
				go dark
			</button>
			<button type="button" onClick={() => setTheme("system")}>
				go system
			</button>
		</div>
	);
}

const isDark = () => document.documentElement.classList.contains("dark");

describe("ThemeProvider", () => {
	it("applies the default theme to the document element", () => {
		render(
			<ThemeProvider defaultTheme="dark">
				<Probe />
			</ThemeProvider>,
		);

		expect(isDark()).toBe(true);
		expect(document.documentElement.style.colorScheme).toBe("dark");
		expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
	});

	it("resolves 'system' from the OS preference", () => {
		setPrefersDark(true);
		render(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		);

		expect(screen.getByTestId("theme")).toHaveTextContent("system");
		expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
		expect(isDark()).toBe(true);
	});

	it("follows the OS flipping while the theme is 'system'", () => {
		render(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		);
		expect(isDark()).toBe(false);

		act(() => setPrefersDark(true));
		expect(isDark()).toBe(true);
	});

	it("ignores the OS once an explicit theme is chosen", async () => {
		render(
			<ThemeProvider defaultTheme="light">
				<Probe />
			</ThemeProvider>,
		);

		act(() => setPrefersDark(true));
		expect(isDark()).toBe(false);
	});

	it("persists the choice and reads it back", async () => {
		const { unmount } = render(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		);

		await userEvent.click(screen.getByRole("button", { name: "go dark" }));
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
		unmount();

		render(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		);
		expect(screen.getByTestId("theme")).toHaveTextContent("dark");
	});

	it("falls back to the default when the stored value is junk", () => {
		window.localStorage.setItem(STORAGE_KEY, "chartreuse");

		render(
			<ThemeProvider defaultTheme="light">
				<Probe />
			</ThemeProvider>,
		);
		expect(screen.getByTestId("theme")).toHaveTextContent("light");
	});

	it("does not touch localStorage when storageKey is null", async () => {
		render(
			<ThemeProvider storageKey={null}>
				<Probe />
			</ThemeProvider>,
		);

		await userEvent.click(screen.getByRole("button", { name: "go dark" }));
		expect(window.localStorage.length).toBe(0);
		expect(screen.getByTestId("theme")).toHaveTextContent("dark");
	});

	it("targets a custom element instead of <html>", () => {
		const element = document.createElement("div");
		document.body.appendChild(element);

		render(
			<ThemeProvider defaultTheme="dark" element={element}>
				<Probe />
			</ThemeProvider>,
		);

		expect(element).toHaveClass("dark");
		expect(isDark()).toBe(false);
	});

	it("throws when useTheme is used outside a provider", () => {
		expect(() => render(<Probe />)).toThrow(/must be used within a <ThemeProvider>/);
	});
});

describe("ThemeToggle", () => {
	it("flips light to dark and relabels itself", async () => {
		render(
			<ThemeProvider defaultTheme="light">
				<ThemeToggle />
			</ThemeProvider>,
		);

		const toggle = screen.getByRole("button", { name: "Switch to dark theme" });
		await userEvent.click(toggle);

		expect(isDark()).toBe(true);
		expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
	});

	it("resolves 'system' before flipping", async () => {
		setPrefersDark(true);
		render(
			<ThemeProvider>
				<ThemeToggle />
			</ThemeProvider>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
		expect(isDark()).toBe(false);
	});

	it("accepts variant and size overrides", () => {
		render(
			<ThemeProvider defaultTheme="light">
				<ThemeToggle variant="outline" size="sm" />
			</ThemeProvider>,
		);

		expect(screen.getByRole("button")).toHaveClass("h-8");
	});
});
