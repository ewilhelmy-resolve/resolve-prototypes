import type { Meta, StoryObj } from "@storybook/react";
import { Toaster } from "sonner";
import { ritaToast } from "./rita-toast";
import { Button } from "./button";

const meta: Meta = {
	title: "Components/Feedback/Toast",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Custom toast notifications with variants for success, error, warning, and info states. Built on Sonner with full dark mode support.",
			},
		},
	},
	decorators: [
		(Story) => (
			<>
				<Toaster position="top-right" />
				<Story />
			</>
		),
	],
};

export default meta;
type Story = StoryObj;

export const Success: Story = {
	name: "Success",
	render: () => (
		<Button
			onClick={() =>
				ritaToast.success({
					title: "Success!",
					description: "Your changes have been saved.",
				})
			}
		>
			Show Success Toast
		</Button>
	),
};

export const Error: Story = {
	name: "Error",
	render: () => (
		<Button
			variant="destructive"
			onClick={() =>
				ritaToast.error({
					title: "Error",
					description: "Something went wrong. Please try again.",
				})
			}
		>
			Show Error Toast
		</Button>
	),
};

export const Warning: Story = {
	name: "Warning",
	render: () => (
		<Button
			variant="outline"
			onClick={() =>
				ritaToast.warning({
					title: "Warning",
					description: "This action cannot be undone.",
				})
			}
		>
			Show Warning Toast
		</Button>
	),
};

export const Info: Story = {
	name: "Info",
	render: () => (
		<Button
			variant="secondary"
			onClick={() =>
				ritaToast.info({
					title: "Info",
					description: "A new version is available.",
				})
			}
		>
			Show Info Toast
		</Button>
	),
};

export const WithAction: Story = {
	name: "With Action",
	render: () => (
		<Button
			onClick={() =>
				ritaToast.success({
					title: "Profile updated",
					description: "Your changes have been saved.",
					action: {
						label: "View",
						onClick: () => console.log("View clicked"),
					},
				})
			}
		>
			Show Toast with Action
		</Button>
	),
};

export const TitleOnly: Story = {
	name: "Title Only",
	render: () => (
		<Button
			onClick={() =>
				ritaToast.info({
					title: "File uploaded successfully",
				})
			}
		>
			Show Simple Toast
		</Button>
	),
};

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<div className="flex flex-col gap-3">
			<Button
				className="bg-green-600 hover:bg-green-700"
				onClick={() =>
					ritaToast.success({
						title: "Success",
						description: "Operation completed successfully.",
					})
				}
			>
				Success
			</Button>
			<Button
				variant="destructive"
				onClick={() =>
					ritaToast.error({
						title: "Error",
						description: "Failed to complete the operation.",
					})
				}
			>
				Error
			</Button>
			<Button
				className="bg-yellow-500 hover:bg-yellow-600 text-black"
				onClick={() =>
					ritaToast.warning({
						title: "Warning",
						description: "Please review before proceeding.",
					})
				}
			>
				Warning
			</Button>
			<Button
				className="bg-blue-600 hover:bg-blue-700"
				onClick={() =>
					ritaToast.info({
						title: "Info",
						description: "Here is some useful information.",
					})
				}
			>
				Info
			</Button>
		</div>
	),
};
