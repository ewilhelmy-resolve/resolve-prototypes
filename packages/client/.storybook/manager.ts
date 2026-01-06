import { addons } from "@storybook/manager-api";
import { ritaTheme } from "./rita-theme";

addons.setConfig({
	theme: ritaTheme,
	sidebar: {
		showRoots: true,
		collapsedRoots: ["features"],
	},
	toolbar: {
		title: { hidden: false },
		zoom: { hidden: false },
		eject: { hidden: false },
		copy: { hidden: false },
		fullscreen: { hidden: false },
	},
});
