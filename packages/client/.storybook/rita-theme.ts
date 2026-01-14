import { create } from "@storybook/theming/create";

// Hardcode base URL for GitHub Pages - manager uses iife format where import.meta isn't available
// In production (GitHub Pages): /resolve-onboarding/
// In development: /
const baseUrl = window?.location?.pathname?.startsWith("/resolve-onboarding")
	? "/resolve-onboarding/"
	: "/";

export const ritaTheme = create({
	base: "light",

	// Brand
	brandTitle: "RITA Go Design System",
	brandUrl: baseUrl,
	brandImage: `${baseUrl}logo-rita.svg`,
	brandTarget: "_self",

	// Colors - Clean monochrome like Audi
	colorPrimary: "#0EC0C0", // RITA teal accent
	colorSecondary: "#000000",

	// UI
	appBg: "#FFFFFF",
	appContentBg: "#FFFFFF",
	appPreviewBg: "#FFFFFF",
	appBorderColor: "#E5E5E5",
	appBorderRadius: 4,

	// Text colors
	textColor: "#000000",
	textInverseColor: "#FFFFFF",
	textMutedColor: "#666666",

	// Toolbar
	barTextColor: "#666666",
	barSelectedColor: "#000000",
	barHoverColor: "#000000",
	barBg: "#FFFFFF",

	// Form colors
	inputBg: "#FFFFFF",
	inputBorder: "#E5E5E5",
	inputTextColor: "#000000",
	inputBorderRadius: 4,

	// Button
	buttonBg: "#FFFFFF",
	buttonBorder: "#E5E5E5",

	// Boolean
	booleanBg: "#F5F5F5",
	booleanSelectedBg: "#000000",

	// Typography
	fontBase: '"Helvetica Neue", Helvetica, Arial, sans-serif',
	fontCode: '"Geist Mono", monospace',
});

export const ritaDarkTheme = create({
	base: "dark",

	// Brand
	brandTitle: "RITA Go Design System",
	brandUrl: baseUrl,
	brandImage: `${baseUrl}logo-rita.svg`,
	brandTarget: "_self",

	// Colors
	colorPrimary: "#0EC0C0",
	colorSecondary: "#FFFFFF",

	// UI
	appBg: "#1A1A1A",
	appContentBg: "#1A1A1A",
	appPreviewBg: "#1A1A1A",
	appBorderColor: "#333333",
	appBorderRadius: 4,

	// Text colors
	textColor: "#FFFFFF",
	textInverseColor: "#000000",
	textMutedColor: "#999999",

	// Toolbar
	barTextColor: "#999999",
	barSelectedColor: "#FFFFFF",
	barHoverColor: "#FFFFFF",
	barBg: "#1A1A1A",

	// Form colors
	inputBg: "#1A1A1A",
	inputBorder: "#333333",
	inputTextColor: "#FFFFFF",
	inputBorderRadius: 4,

	// Button
	buttonBg: "#1A1A1A",
	buttonBorder: "#333333",

	// Boolean
	booleanBg: "#333333",
	booleanSelectedBg: "#FFFFFF",

	// Typography
	fontBase: '"Helvetica Neue", Helvetica, Arial, sans-serif',
	fontCode: '"Geist Mono", monospace',
});
