import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { BulkActions } from "./BulkActions";
import { Trash2, Download, Archive, Mail } from "lucide-react";

const meta: Meta<typeof BulkActions> = {
	component: BulkActions,
	title: "Features/Data Management/Bulk Actions",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	args: {
		onClose: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-full p-4 min-h-[100px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof BulkActions>;

export const SingleSelection: Story = {
	args: {
		selectedItems: ["user-1"],
		onDelete: fn(),
		itemLabel: "users",
	},
};

export const MultipleSelections: Story = {
	args: {
		selectedItems: ["user-1", "user-2", "user-3"],
		onDelete: fn(),
		itemLabel: "users",
	},
};

export const CustomDeleteLabel: Story = {
	args: {
		selectedItems: ["invite-1", "invite-2"],
		onDelete: fn(),
		deleteLabel: "Cancel Invitation",
		itemLabel: "invitations",
	},
};

export const Loading: Story = {
	args: {
		selectedItems: ["file-1", "file-2", "file-3"],
		onDelete: fn(),
		itemLabel: "files",
		isLoading: true,
		loadingLabel: "Deleting...",
	},
};

export const LoadingWithRemaining: Story = {
	args: {
		selectedItems: ["file-1", "file-2", "file-3", "file-4", "file-5"],
		onDelete: fn(),
		itemLabel: "files",
		isLoading: true,
		loadingLabel: "Deleting...",
		remainingCount: 3,
	},
};

export const CustomActions: Story = {
	args: {
		selectedItems: ["file-1", "file-2"],
		itemLabel: "files",
		actions: [
			{
				key: "download",
				label: "Download",
				icon: <Download className="h-4 w-4" />,
				variant: "outline",
				onClick: fn(),
			},
			{
				key: "archive",
				label: "Archive",
				icon: <Archive className="h-4 w-4" />,
				variant: "secondary",
				onClick: fn(),
			},
			{
				key: "delete",
				label: "Delete",
				icon: <Trash2 className="h-4 w-4" />,
				variant: "destructive",
				onClick: fn(),
			},
		],
	},
};

export const EmailActions: Story = {
	args: {
		selectedItems: ["user-1", "user-2", "user-3", "user-4"],
		itemLabel: "users",
		actions: [
			{
				key: "email",
				label: "Send Email",
				icon: <Mail className="h-4 w-4" />,
				variant: "default",
				onClick: fn(),
			},
			{
				key: "remove",
				label: "Remove",
				icon: <Trash2 className="h-4 w-4" />,
				variant: "destructive",
				onClick: fn(),
			},
		],
	},
};

export const NoSelection: Story = {
	args: {
		selectedItems: [],
		onDelete: fn(),
		itemLabel: "items",
	},
	parameters: {
		docs: {
			description: {
				story: "Component returns null when no items selected",
			},
		},
	},
};
