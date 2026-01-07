import type { Preview } from "@storybook/react";
import { ritaTheme } from "./rita-theme";
import "../src/index.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		layout: "centered",
		docs: {
			theme: ritaTheme,
		},
		options: {
			storySort: {
				order: [
					"Getting Started",
					["Introduction"],
					"Brand Identity",
					["Colors", "Typography", "Logo"],
					"Components",
					[
						"Actions",
						"Data Display",
						"Feedback",
						"Forms",
						"Layout",
						"Navigation",
						"Overlays",
					],
					"Features",
					["Chat"],
				],
			},
		},
	},
	decorators: [
		(Story, context) => {
			const theme = context.globals.theme || "light";
			const isDark = theme === "dark";

			return (
				<div
					className={`font-sans ${isDark ? "dark" : ""}`}
					style={{
						backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
						minHeight: "100%",
						padding: "1rem",
					}}
				>
					<Story />
				</div>
			);
		},
	],
	initialGlobals: {
		theme: "light",
	},
	globalTypes: {
		theme: {
			description: "Global theme for components",
			toolbar: {
				title: "Theme",
				icon: "paintbrush",
				items: [
					{ value: "light", title: "Light", icon: "sun" },
					{ value: "dark", title: "Dark", icon: "moon" },
				],
				dynamicTitle: true,
			},
		},
	},
};

export default preview;
