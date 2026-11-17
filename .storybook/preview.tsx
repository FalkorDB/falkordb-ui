import { useEffect, type ReactNode } from "react";
import type { Decorator, Preview } from "@storybook/react";

import "./storybook.css";

function ThemeFrame({
	theme,
	fullHeight,
	children,
}: {
	theme: "light" | "dark";
	fullHeight: boolean;
	children: ReactNode;
}) {
	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.style.colorScheme = theme;
	}, [theme]);

	return (
		<div className={`${fullHeight ? "min-h-svh " : ""}bg-background p-8 font-sans text-foreground`}>
			{children}
		</div>
	);
}

const withTheme: Decorator = (Story, context) => (
	// Docs pages render stories inline, where a full-viewport frame leaves a tall blank canvas.
	<ThemeFrame
		theme={context.globals.theme === "dark" ? "dark" : "light"}
		fullHeight={context.viewMode !== "docs"}
	>
		<Story />
	</ThemeFrame>
);

const preview: Preview = {
	decorators: [withTheme],
	globalTypes: {
		theme: {
			description: "FalkorDB colour theme",
			defaultValue: "light",
			toolbar: {
				title: "Theme",
				icon: "circlehollow",
				items: [
					{ value: "light", icon: "sun", title: "Light" },
					{ value: "dark", icon: "moon", title: "Dark" },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		options: {
			storySort: {
				order: ["Theme", "Primitives"],
			},
		},
	},
};

export default preview;
