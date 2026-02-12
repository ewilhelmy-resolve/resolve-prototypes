import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * AutoSyncToggle displays a toggle for enabling/disabling automatic ticket sync.
 * It's only visible when an ML model is active.
 *
 * This story shows the presentational UI since the actual component
 * depends on useActiveModel and useUpdateDataSource hooks.
 */

// Presentational component for storybook (mirrors AutoSyncToggle UI)
function AutoSyncToggleUI({
	checked,
	disabled,
	onToggle,
}: {
	checked: boolean;
	disabled: boolean;
	onToggle: (checked: boolean) => void;
}) {
	return (
		<div className="border-t border-border pt-4 mt-4">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<Label htmlFor="auto-sync-toggle" className="text-sm font-medium">
						Auto-sync tickets
					</Label>
					<p className="text-sm text-muted-foreground">
						Automatically sync new tickets when they're created
					</p>
				</div>
				<Switch
					id="auto-sync-toggle"
					checked={checked}
					onCheckedChange={onToggle}
					disabled={disabled}
					aria-label="Auto-sync tickets"
				/>
			</div>
		</div>
	);
}

const meta: Meta<typeof AutoSyncToggleUI> = {
	component: AutoSyncToggleUI,
	title: "Features/Connections/AutoSyncToggle",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div className="w-full max-w-md p-4 border border-border rounded-md bg-popover">
				<p className="text-sm text-muted-foreground mb-2">
					[Sync controls would appear above]
				</p>
				<Story />
			</div>
		),
	],
	argTypes: {
		checked: {
			control: "boolean",
			description: "Whether auto-sync is enabled",
		},
		disabled: {
			control: "boolean",
			description: "Whether the toggle is disabled (e.g., during sync)",
		},
		onToggle: {
			action: "toggled",
			description: "Called when toggle state changes",
		},
	},
};

export default meta;
type Story = StoryObj<typeof AutoSyncToggleUI>;

export const Enabled: Story = {
	args: {
		checked: true,
		disabled: false,
		onToggle: fn(),
	},
};

export const Disabled: Story = {
	args: {
		checked: false,
		disabled: false,
		onToggle: fn(),
	},
};

export const DisabledWhileSyncing: Story = {
	args: {
		checked: true,
		disabled: true,
		onToggle: fn(),
	},
	parameters: {
		docs: {
			description: {
				story: "Toggle is disabled while a sync operation is in progress",
			},
		},
	},
};

export const AllStates: Story = {
	render: () => (
		<div className="space-y-6">
			<div>
				<p className="text-xs text-muted-foreground mb-1">Enabled</p>
				<AutoSyncToggleUI checked={true} disabled={false} onToggle={fn()} />
			</div>
			<div>
				<p className="text-xs text-muted-foreground mb-1">Disabled (off)</p>
				<AutoSyncToggleUI checked={false} disabled={false} onToggle={fn()} />
			</div>
			<div>
				<p className="text-xs text-muted-foreground mb-1">Disabled (syncing)</p>
				<AutoSyncToggleUI checked={true} disabled={true} onToggle={fn()} />
			</div>
		</div>
	),
	decorators: [
		(Story) => (
			<div className="w-full max-w-md p-4">
				<Story />
			</div>
		),
	],
};
