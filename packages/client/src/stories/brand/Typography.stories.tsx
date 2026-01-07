import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Brand Identity/Typography",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Typography system for RITA Go. Uses Season Mix for headings and Helvetica for body text.",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const FontFamilies: Story = {
	name: "Font Families",
	render: () => (
		<div className="space-y-8 max-w-3xl">
			<h1 className="text-2xl font-bold text-foreground">Font Families</h1>

			<div className="space-y-6">
				{/* Season Mix */}
				<div className="p-6 rounded-lg border border-border space-y-4">
					<div>
						<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							Heading Font
						</h2>
						<div className="font-heading text-4xl mt-2">Season Mix</div>
					</div>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Font Family:</span>
							<code className="ml-2 bg-muted px-2 py-0.5 rounded">
								'Season Mix', serif
							</code>
						</div>
						<div>
							<span className="text-muted-foreground">Tailwind:</span>
							<code className="ml-2 bg-muted px-2 py-0.5 rounded">
								font-heading
							</code>
						</div>
					</div>
					<div className="font-heading text-2xl">
						ABCDEFGHIJKLMNOPQRSTUVWXYZ
						<br />
						abcdefghijklmnopqrstuvwxyz
						<br />
						0123456789
					</div>
					<div className="font-heading italic text-xl">
						The quick brown fox jumps over the lazy dog (italic)
					</div>
					<div className="text-sm text-muted-foreground">
						<strong>Files:</strong> SeasonMix-Regular.ttf,
						SeasonMix-RegularItalic.ttf
					</div>
				</div>

				{/* Helvetica */}
				<div className="p-6 rounded-lg border border-border space-y-4">
					<div>
						<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							Body Font
						</h2>
						<div className="font-sans text-4xl mt-2">Helvetica</div>
					</div>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Font Family:</span>
							<code className="ml-2 bg-muted px-2 py-0.5 rounded">
								Helvetica, sans-serif
							</code>
						</div>
						<div>
							<span className="text-muted-foreground">Tailwind:</span>
							<code className="ml-2 bg-muted px-2 py-0.5 rounded">font-sans</code>
						</div>
					</div>
					<div className="font-sans text-lg">
						ABCDEFGHIJKLMNOPQRSTUVWXYZ
						<br />
						abcdefghijklmnopqrstuvwxyz
						<br />
						0123456789
					</div>
					<div className="text-sm text-muted-foreground">
						<strong>Usage:</strong> Body text, UI elements, forms
					</div>
				</div>

				{/* Monospace */}
				<div className="p-6 rounded-lg border border-border space-y-4">
					<div>
						<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							Monospace Font
						</h2>
						<div className="font-mono text-3xl mt-2">Geist Mono</div>
					</div>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Tailwind:</span>
							<code className="ml-2 bg-muted px-2 py-0.5 rounded">font-mono</code>
						</div>
					</div>
					<div className="font-mono text-base">
						const greeting = "Hello, World!";
						<br />
						function example() {"{"}
						<br />
						&nbsp;&nbsp;return true;
						<br />
						{"}"}
					</div>
					<div className="text-sm text-muted-foreground">
						<strong>Usage:</strong> Code blocks, technical content
					</div>
				</div>
			</div>
		</div>
	),
};

export const TypeScale: Story = {
	name: "Type Scale",
	render: () => (
		<div className="space-y-8 max-w-3xl">
			<h1 className="text-2xl font-bold text-foreground">Type Scale</h1>

			<div className="space-y-6">
				{/* Headings with Season Mix */}
				<div className="space-y-4">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
						Headings (Season Mix)
					</h2>

					<div className="space-y-4">
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-5xl
							</code>
							<span className="font-heading text-5xl">Heading XL</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-4xl
							</code>
							<span className="font-heading text-4xl">Heading Large</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-3xl
							</code>
							<span className="font-heading text-3xl">Heading Medium</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-2xl
							</code>
							<span className="font-heading text-2xl">Heading Small</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-xl
							</code>
							<span className="font-heading text-xl">Heading XS</span>
						</div>
					</div>
				</div>

				{/* Body with Helvetica */}
				<div className="space-y-4">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
						Body Text (Helvetica)
					</h2>

					<div className="space-y-4">
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-lg
							</code>
							<span className="text-lg">Large body text for lead paragraphs</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-base
							</code>
							<span className="text-base">
								Default body text for main content
							</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-sm
							</code>
							<span className="text-sm">Small text for secondary content</span>
						</div>
						<div className="flex items-baseline gap-4">
							<code className="text-xs text-muted-foreground w-20 shrink-0">
								text-xs
							</code>
							<span className="text-xs">Extra small for captions and labels</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const FontWeights: Story = {
	name: "Font Weights",
	render: () => (
		<div className="space-y-6 max-w-3xl">
			<h1 className="text-2xl font-bold text-foreground">Font Weights</h1>

			<div className="space-y-4">
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-28 shrink-0">
						font-normal
					</code>
					<span className="text-xl font-normal">Regular 400</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-28 shrink-0">
						font-medium
					</code>
					<span className="text-xl font-medium">Medium 500</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-28 shrink-0">
						font-semibold
					</code>
					<span className="text-xl font-semibold">Semibold 600</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-28 shrink-0">
						font-bold
					</code>
					<span className="text-xl font-bold">Bold 700</span>
				</div>
			</div>
		</div>
	),
};

export const TextColors: Story = {
	name: "Text Colors",
	render: () => (
		<div className="space-y-6 max-w-3xl">
			<h1 className="text-2xl font-bold text-foreground">Text Colors</h1>

			<div className="space-y-4">
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-40 shrink-0">
						text-foreground
					</code>
					<span className="text-lg text-foreground">Primary text color</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-40 shrink-0">
						text-muted-foreground
					</code>
					<span className="text-lg text-muted-foreground">
						Secondary/helper text
					</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-40 shrink-0">
						text-primary
					</code>
					<span className="text-lg text-primary">Links and brand text</span>
				</div>
				<div className="flex items-center gap-4 p-3 border border-border rounded">
					<code className="text-xs text-muted-foreground w-40 shrink-0">
						text-destructive
					</code>
					<span className="text-lg text-destructive">Error messages</span>
				</div>
			</div>
		</div>
	),
};

export const UsageExample: Story = {
	name: "Usage Example",
	render: () => (
		<div className="space-y-6 max-w-2xl">
			<h1 className="text-2xl font-bold text-foreground">Real World Example</h1>

			<article className="p-6 rounded-lg border border-border bg-card space-y-4">
				<h1 className="font-heading text-3xl">Welcome to RITA Go</h1>
				<p className="text-lg text-muted-foreground">
					Your intelligent assistant for workplace productivity.
				</p>
				<p className="text-base">
					RITA Go helps you find answers quickly by searching through your
					organization's knowledge base. Ask questions in natural language and
					get accurate, sourced responses.
				</p>
				<h2 className="font-heading text-xl pt-2">Getting Started</h2>
				<ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
					<li>Upload your documents to the knowledge base</li>
					<li>Ask questions in the chat interface</li>
					<li>Review sources and citations</li>
				</ul>
				<p className="text-xs text-muted-foreground pt-2">
					Last updated: January 2026
				</p>
			</article>

			<div className="p-4 bg-muted rounded-lg">
				<h3 className="font-medium mb-2">Code</h3>
				<pre className="text-xs font-mono overflow-x-auto">
					{`<article className="p-6 rounded-lg border border-border bg-card">
  <h1 className="font-heading text-3xl">Welcome to RITA Go</h1>
  <p className="text-lg text-muted-foreground">Subtitle...</p>
  <p className="text-base">Body text...</p>
  <h2 className="font-heading text-xl">Section heading</h2>
  <p className="text-xs text-muted-foreground">Caption</p>
</article>`}
				</pre>
			</div>
		</div>
	),
};
