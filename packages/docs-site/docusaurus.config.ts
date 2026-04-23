import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

const config: Config = {
	title: "Rita Specification",
	tagline: "Living specification for the Rita AI chat assistant",
	favicon: "img/favicon.ico",

	url: "https://resolve-io.github.io",
	baseUrl: "/resolve-onboarding/docs/",

	organizationName: "resolve-io",
	projectName: "resolve-onboarding",

	onBrokenLinks: "warn",
	onBrokenMarkdownLinks: "warn",

	markdown: {
		format: "md",
	},

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					path: "content",
					routeBasePath: "/",
					sidebarPath: "./sidebars.ts",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		navbar: {
			title: "Rita Specification",
			items: [
				{
					type: "docSidebar",
					sidebarId: "discoverSidebar",
					position: "left",
					label: "Discover",
				},
				{
					href: "https://github.com/resolve-io/resolve-onboarding",
					label: "GitHub",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			copyright: `Rita Living Specification — auto-generated from source code`,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
