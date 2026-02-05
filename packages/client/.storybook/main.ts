import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@storybook/addon-essentials",
		"@storybook/addon-a11y",
		"@storybook/addon-interactions",
	],
	framework: "@storybook/react-vite",
	staticDirs: ["../public"],
	viteFinal: async (viteConfig) => {
		viteConfig.resolve = viteConfig.resolve || {};
		viteConfig.resolve.alias = {
			...viteConfig.resolve.alias,
			"@": path.resolve(__dirname, "../src"),
		};
		// Set base path for GitHub Pages deployment
		const base = process.env.NODE_ENV === "production"
			? "/resolve-onboarding/"
			: "/";
		viteConfig.base = base;

		// CRITICAL: Set experimental.renderBuiltUrl to handle dynamic imports
		viteConfig.experimental = viteConfig.experimental || {};
		viteConfig.experimental.renderBuiltUrl = (filename) => {
			return base + filename;
		};

		return viteConfig;
	},
};

export default config;
