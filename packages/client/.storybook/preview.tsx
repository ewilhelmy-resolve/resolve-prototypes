import type { Preview } from "@storybook/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
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
					"Translations",
					["Overview", "Common Actions", "Interpolation", "Available Namespaces"],
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
				<I18nextProvider i18n={i18n}>
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
				</I18nextProvider>
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
