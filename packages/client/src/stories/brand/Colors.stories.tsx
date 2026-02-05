import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Brand Identity/Colors",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Color palette extracted from the RITA Go design system. All colors are defined as CSS custom properties in index.css and automatically adapt to light/dark modes.",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

interface ColorSwatchProps {
	name: string;
	variable: string;
	hex: string;
	description?: string;
}

function ColorSwatch({ name, variable, hex, description }: ColorSwatchProps) {
	return (
		<div className="flex items-center gap-4 p-3 rounded-lg border border-border">
			<div
				className="w-16 h-16 rounded-md border border-border shadow-sm shrink-0"
				style={{ backgroundColor: `var(${variable})` }}
			/>
			<div className="flex-1 min-w-0">
				<div className="font-medium text-foreground">{name}</div>
				<div className="flex gap-2 items-center">
					<code className="text-xs text-muted-foreground font-mono">
						{variable}
					</code>
					<span className="text-xs text-muted-foreground">•</span>
					<code className="text-xs font-mono px-1.5 py-0.5 bg-muted rounded">
						{hex}
					</code>
				</div>
				{description && (
					<div className="text-sm text-muted-foreground mt-1">{description}</div>
				)}
			</div>
		</div>
	);
}

interface ColorGroupProps {
	title: string;
	children: React.ReactNode;
}

function ColorGroup({ title, children }: ColorGroupProps) {
	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
				{title}
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
		</div>
	);
}

export const AllColors: Story = {
	render: () => (
		<div className="space-y-8 max-w-4xl">
			<div>
				<h1 className="text-2xl font-bold text-foreground mb-2">Color System</h1>
				<p className="text-muted-foreground">
					RITA Go uses semantic color tokens that automatically adapt between
					light and dark modes. Toggle the background in the toolbar to preview
					dark mode.
				</p>
			</div>

			<ColorGroup title="Primary">
				<ColorSwatch
					name="Primary"
					variable="--primary"
					hex="#0050C7"
					description="Main brand color for buttons, links, and accents"
				/>
				<ColorSwatch
					name="Primary Foreground"
					variable="--primary-foreground"
					hex="#EFF6FF"
					description="Text color on primary backgrounds"
				/>
			</ColorGroup>

			<ColorGroup title="Backgrounds">
				<ColorSwatch
					name="Background"
					variable="--background"
					hex="#FFFFFF"
					description="Main page background"
				/>
				<ColorSwatch
					name="Card"
					variable="--card"
					hex="#FFFFFF"
					description="Card and elevated surface background"
				/>
				<ColorSwatch
					name="Popover"
					variable="--popover"
					hex="#FFFFFF"
					description="Dropdown and popover background"
				/>
				<ColorSwatch
					name="Muted"
					variable="--muted"
					hex="#F5F5F5"
					description="Subtle background for secondary elements"
				/>
			</ColorGroup>

			<ColorGroup title="Foregrounds">
				<ColorSwatch
					name="Foreground"
					variable="--foreground"
					hex="#1C1C1C"
					description="Primary text color"
				/>
				<ColorSwatch
					name="Card Foreground"
					variable="--card-foreground"
					hex="#1C1C1C"
					description="Text on card backgrounds"
				/>
				<ColorSwatch
					name="Muted Foreground"
					variable="--muted-foreground"
					hex="#737373"
					description="Secondary/helper text"
				/>
			</ColorGroup>

			<ColorGroup title="Interactive">
				<ColorSwatch
					name="Secondary"
					variable="--secondary"
					hex="#F5F5F5"
					description="Secondary button background"
				/>
				<ColorSwatch
					name="Accent"
					variable="--accent"
					hex="#F5F5F5"
					description="Hover and focus states"
				/>
				<ColorSwatch
					name="Destructive"
					variable="--destructive"
					hex="#EF4444"
					description="Error and danger states"
				/>
			</ColorGroup>

			<ColorGroup title="Borders & Inputs">
				<ColorSwatch
					name="Border"
					variable="--border"
					hex="#E5E5E5"
					description="Default border color"
				/>
				<ColorSwatch
					name="Input"
					variable="--input"
					hex="#E5E5E5"
					description="Form input borders"
				/>
				<ColorSwatch
					name="Ring"
					variable="--ring"
					hex="#A3A3A3"
					description="Focus ring color"
				/>
			</ColorGroup>

			<ColorGroup title="Sidebar">
				<ColorSwatch
					name="Sidebar"
					variable="--sidebar"
					hex="#FFFFFF"
					description="Sidebar background"
				/>
				<ColorSwatch
					name="Sidebar Foreground"
					variable="--sidebar-foreground"
					hex="#1C1C1C"
					description="Sidebar text"
				/>
				<ColorSwatch
					name="Sidebar Accent"
					variable="--sidebar-accent"
					hex="#E5E5E5"
					description="Sidebar hover states"
				/>
				<ColorSwatch
					name="Sidebar Primary"
					variable="--sidebar-primary"
					hex="#2C2C2C"
					description="Sidebar active/selected states"
				/>
			</ColorGroup>

			<ColorGroup title="Charts">
				<ColorSwatch name="Chart 1" variable="--chart-1" hex="#EA580C" />
				<ColorSwatch name="Chart 2" variable="--chart-2" hex="#0D9488" />
				<ColorSwatch name="Chart 3" variable="--chart-3" hex="#1E40AF" />
				<ColorSwatch name="Chart 4" variable="--chart-4" hex="#EAB308" />
				<ColorSwatch name="Chart 5" variable="--chart-5" hex="#F59E0B" />
			</ColorGroup>
		</div>
	),
};

export const BrandColors: Story = {
	name: "Brand Colors",
	render: () => (
		<div className="space-y-6 max-w-2xl">
			<h2 className="text-xl font-bold text-foreground">RITA Brand Colors</h2>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<div
						className="h-24 rounded-lg flex items-end p-3"
						style={{ backgroundColor: "#0EC0C0" }}
					>
						<span className="text-white font-medium">RITA Teal</span>
					</div>
					<code className="text-xs text-muted-foreground">#0EC0C0</code>
				</div>

				<div className="space-y-2">
					<div
						className="h-24 rounded-lg flex items-end p-3"
						style={{ backgroundColor: "#0050C7" }}
					>
						<span className="text-white font-medium">Primary Blue</span>
					</div>
					<code className="text-xs text-muted-foreground">#0050C7</code>
				</div>

				<div className="space-y-2">
					<div
						className="h-24 rounded-lg flex items-end p-3 border border-border"
						style={{ backgroundColor: "#FFFFFF" }}
					>
						<span className="text-black font-medium">White</span>
					</div>
					<code className="text-xs text-muted-foreground">#FFFFFF</code>
				</div>

				<div className="space-y-2">
					<div
						className="h-24 rounded-lg flex items-end p-3"
						style={{ backgroundColor: "#000000" }}
					>
						<span className="text-white font-medium">Black</span>
					</div>
					<code className="text-xs text-muted-foreground">#000000</code>
				</div>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	name: "Semantic Usage",
	render: () => (
		<div className="space-y-6 max-w-2xl">
			<h2 className="text-xl font-bold text-foreground">How to Use Colors</h2>

			<div className="space-y-4">
				<div className="p-4 rounded-lg bg-card border border-border">
					<h3 className="font-medium mb-2">Tailwind Classes</h3>
					<pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
						{`<div className="bg-primary text-primary-foreground">
  Primary button
</div>

<div className="bg-muted text-muted-foreground">
  Secondary content
</div>

<div className="border border-border">
  Bordered container
</div>

<span className="text-destructive">
  Error message
</span>`}
					</pre>
				</div>

				<div className="p-4 rounded-lg bg-card border border-border">
					<h3 className="font-medium mb-2">CSS Variables</h3>
					<pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
						{`/* Direct CSS usage */
.element {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: 1px solid var(--border);
}`}
					</pre>
				</div>
			</div>
		</div>
	),
};
