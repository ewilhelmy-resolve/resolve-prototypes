import type { Meta, StoryObj } from "@storybook/react";

// Use base URL for GitHub Pages compatibility
const baseUrl = import.meta.env.BASE_URL || "/";
const logoSrc = `${baseUrl}logo-rita.svg`;

const meta: Meta = {
	title: "Getting Started/Introduction",
	parameters: {
		layout: "padded",
	},
};

export default meta;
type Story = StoryObj;

export const Welcome: Story = {
	render: () => (
		<div className="max-w-3xl space-y-8">
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<img src={logoSrc} alt="RITA Go" className="h-10" />
					<span className="text-2xl font-medium text-muted-foreground">
						Design System
					</span>
				</div>
				<p className="text-lg text-muted-foreground">
					A comprehensive UI component library built with React, TypeScript, and
					Tailwind CSS for enterprise applications.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="p-4 rounded-lg border border-border bg-card">
					<h3 className="font-semibold mb-2">React 18+</h3>
					<p className="text-sm text-muted-foreground">
						Modern React with hooks, TypeScript strict mode, and server
						components ready.
					</p>
				</div>
				<div className="p-4 rounded-lg border border-border bg-card">
					<h3 className="font-semibold mb-2">Tailwind CSS</h3>
					<p className="text-sm text-muted-foreground">
						Utility-first styling with custom design tokens and dark mode
						support.
					</p>
				</div>
				<div className="p-4 rounded-lg border border-border bg-card">
					<h3 className="font-semibold mb-2">Radix UI</h3>
					<p className="text-sm text-muted-foreground">
						Accessible component primitives with full keyboard navigation and
						ARIA support.
					</p>
				</div>
				<div className="p-4 rounded-lg border border-border bg-card">
					<h3 className="font-semibold mb-2">shadcn/ui</h3>
					<p className="text-sm text-muted-foreground">
						Beautiful, customizable components that you own and control.
					</p>
				</div>
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold border-b border-border pb-2">
					Component Categories
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
					<CategoryCard
						title="Actions"
						items={["Button", "Dropdown Menu"]}
					/>
					<CategoryCard
						title="Data Display"
						items={["Badge", "Card", "Avatar", "Table"]}
					/>
					<CategoryCard
						title="Feedback"
						items={["Alert", "Progress", "Spinner", "Skeleton"]}
					/>
					<CategoryCard
						title="Forms"
						items={["Input", "Select", "Checkbox", "Switch"]}
					/>
					<CategoryCard title="Layout" items={["Separator", "Tabs"]} />
					<CategoryCard
						title="Overlays"
						items={["Dialog", "Popover", "Tooltip", "Sheet"]}
					/>
				</div>
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold border-b border-border pb-2">
					Accessibility
				</h2>
				<ul className="space-y-2 text-sm">
					<li className="flex items-center gap-2">
						<span className="text-green-600">✓</span>
						Full keyboard navigation support
					</li>
					<li className="flex items-center gap-2">
						<span className="text-green-600">✓</span>
						ARIA attributes for screen readers
					</li>
					<li className="flex items-center gap-2">
						<span className="text-green-600">✓</span>
						WCAG 2.1 AA compliance
					</li>
					<li className="flex items-center gap-2">
						<span className="text-green-600">✓</span>
						Focus management and visible focus states
					</li>
				</ul>
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold border-b border-border pb-2">
					Design Principles
				</h2>
				<div className="grid gap-3">
					<Principle
						number={1}
						title="Consistency"
						description="Unified visual language across all components"
					/>
					<Principle
						number={2}
						title="Accessibility"
						description="WCAG 2.1 AA compliant by default"
					/>
					<Principle
						number={3}
						title="Performance"
						description="Optimized bundle size and runtime performance"
					/>
					<Principle
						number={4}
						title="Flexibility"
						description="Composable and customizable components"
					/>
					<Principle
						number={5}
						title="Developer Experience"
						description="TypeScript-first with comprehensive documentation"
					/>
				</div>
			</div>
		</div>
	),
};

function CategoryCard({ title, items }: { title: string; items: string[] }) {
	return (
		<div className="p-3 rounded border border-border">
			<h3 className="font-medium text-sm mb-1">{title}</h3>
			<p className="text-xs text-muted-foreground">{items.join(", ")}</p>
		</div>
	);
}

function Principle({
	number,
	title,
	description,
}: {
	number: number;
	title: string;
	description: string;
}) {
	return (
		<div className="flex gap-3 items-start">
			<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
				{number}
			</span>
			<div>
				<span className="font-medium">{title}</span>
				<span className="text-muted-foreground"> — {description}</span>
			</div>
		</div>
	);
}
