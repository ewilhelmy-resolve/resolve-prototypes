import type { Meta, StoryObj } from "@storybook/react";

// Use base URL for GitHub Pages compatibility
const baseUrl = import.meta.env.BASE_URL || "/";
const logoSrc = `${baseUrl}logo-rita.svg`;

const meta: Meta = {
	title: "Brand Identity/Logo",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"RITA Go logo assets and usage guidelines. The logo features the RITA wordmark with the distinctive teal accent.",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
	name: "Logo",
	render: () => (
		<div className="space-y-8">
			<div className="p-8 bg-white rounded-lg border border-border">
				<img src={logoSrc} alt="RITA Go Logo" className="h-8" />
			</div>
			<div className="text-sm text-muted-foreground">
				<strong>File:</strong> /public/logo-rita.svg
			</div>
		</div>
	),
};

export const OnDarkBackground: Story = {
	name: "On Dark Background",
	render: () => (
		<div className="space-y-8">
			<div className="p-8 bg-black rounded-lg">
				<img
					src={logoSrc}
					alt="RITA Go Logo"
					className="h-8 invert"
				/>
			</div>
			<div className="text-sm text-muted-foreground">
				Use <code className="bg-muted px-1 rounded">invert</code> class for dark
				backgrounds
			</div>
		</div>
	),
};

export const Sizes: Story = {
	name: "Sizes",
	render: () => (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold text-foreground">Logo Sizes</h2>

			<div className="space-y-4">
				<div className="flex items-center gap-4 p-4 border border-border rounded-lg">
					<code className="text-xs text-muted-foreground w-16">h-6</code>
					<img src={logoSrc} alt="RITA Go Logo" className="h-6" />
					<span className="text-sm text-muted-foreground">Small - Nav items</span>
				</div>

				<div className="flex items-center gap-4 p-4 border border-border rounded-lg">
					<code className="text-xs text-muted-foreground w-16">h-8</code>
					<img src={logoSrc} alt="RITA Go Logo" className="h-8" />
					<span className="text-sm text-muted-foreground">
						Default - Headers
					</span>
				</div>

				<div className="flex items-center gap-4 p-4 border border-border rounded-lg">
					<code className="text-xs text-muted-foreground w-16">h-12</code>
					<img src={logoSrc} alt="RITA Go Logo" className="h-12" />
					<span className="text-sm text-muted-foreground">Large - Hero</span>
				</div>

				<div className="flex items-center gap-4 p-4 border border-border rounded-lg">
					<code className="text-xs text-muted-foreground w-16">h-16</code>
					<img src={logoSrc} alt="RITA Go Logo" className="h-16" />
					<span className="text-sm text-muted-foreground">
						XL - Marketing
					</span>
				</div>
			</div>
		</div>
	),
};

export const ClearSpace: Story = {
	name: "Clear Space",
	render: () => (
		<div className="space-y-6 max-w-xl">
			<h2 className="text-lg font-semibold text-foreground">Clear Space</h2>
			<p className="text-sm text-muted-foreground">
				Maintain minimum clear space around the logo equal to the height of the
				"R" in RITA.
			</p>

			<div className="p-8 bg-muted/50 rounded-lg flex items-center justify-center">
				<div className="border-2 border-dashed border-primary/30 p-6">
					<img src={logoSrc} alt="RITA Go Logo" className="h-8" />
				</div>
			</div>
		</div>
	),
};

export const BrandMark: Story = {
	name: "Brand Elements",
	render: () => (
		<div className="space-y-8 max-w-xl">
			<h2 className="text-lg font-semibold text-foreground">Brand Elements</h2>

			<div className="space-y-6">
				{/* RITA Teal accent */}
				<div className="p-4 border border-border rounded-lg space-y-3">
					<h3 className="font-medium">RITA Teal Accent</h3>
					<div className="flex items-center gap-4">
						<div
							className="w-12 h-12 rounded"
							style={{ backgroundColor: "#0EC0C0" }}
						/>
						<div>
							<code className="text-sm">#0EC0C0</code>
							<p className="text-xs text-muted-foreground">
								Used in logo accent and interactive elements
							</p>
						</div>
					</div>
				</div>

				{/* Icon mark */}
				<div className="p-4 border border-border rounded-lg space-y-3">
					<h3 className="font-medium">Icon Usage</h3>
					<p className="text-sm text-muted-foreground">
						The circuit-style icon element can be used standalone for favicons
						and app icons.
					</p>
					<div className="flex gap-4 items-center">
						<div className="w-8 h-8 bg-black rounded flex items-center justify-center">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect
									x="10"
									y="10"
									width="4"
									height="4"
									fill="#0EC0C0"
								/>
								<path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="#0EC0C0" strokeWidth="2" />
							</svg>
						</div>
						<span className="text-sm text-muted-foreground">
							Favicon / App icon
						</span>
					</div>
				</div>
			</div>
		</div>
	),
};

export const UsageGuidelines: Story = {
	name: "Usage Guidelines",
	render: () => (
		<div className="space-y-6 max-w-xl">
			<h2 className="text-lg font-semibold text-foreground">
				Usage Guidelines
			</h2>

			<div className="space-y-4">
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
					<h3 className="font-medium text-green-800 mb-2">Do</h3>
					<ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
						<li>Use the full logo on light backgrounds</li>
						<li>Maintain proper clear space</li>
						<li>Use the inverted version on dark backgrounds</li>
						<li>Scale proportionally</li>
					</ul>
				</div>

				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<h3 className="font-medium text-red-800 mb-2">Don't</h3>
					<ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
						<li>Stretch or distort the logo</li>
						<li>Change the colors</li>
						<li>Add effects like shadows or gradients</li>
						<li>Place on busy backgrounds</li>
						<li>Use below minimum size (24px height)</li>
					</ul>
				</div>
			</div>
		</div>
	),
};
