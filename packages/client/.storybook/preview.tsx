import type { Preview } from "@storybook/react";
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
	},
	decorators: [
		(Story) => (
			<div className="font-sans">
				<Story />
			</div>
		),
	],
};

export default preview;
