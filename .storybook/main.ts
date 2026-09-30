import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: ["../stories/**/*.stories.@(ts|tsx)"],
	addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	// Otherwise the build stops on an interactive crash-report prompt in CI.
	core: {
		disableTelemetry: true,
	},
	typescript: {
		reactDocgen: "react-docgen-typescript",
		// Without this filter docgen expands every prop inherited from Radix and
		// @types/react, which bloats the generated docs.
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			shouldRemoveUndefinedFromOptional: true,
			propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
		},
	},
	viteFinal: (viteConfig) => {
		viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
		viteConfig.resolve = {
			...viteConfig.resolve,
			alias: {
				...viteConfig.resolve?.alias,
				// Storybook evaluates this file as CJS, so import.meta.dirname is empty.
				"@": resolve(process.cwd(), "src"),
			},
		};
		return viteConfig;
	},
};

export default config;
