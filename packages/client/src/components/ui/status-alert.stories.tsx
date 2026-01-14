import type { Meta, StoryObj } from "@storybook/react";
import { StatusAlert } from "./status-alert";

const meta: Meta<typeof StatusAlert> = {
	component: StatusAlert,
	title: "Components/Feedback/Status Alert",
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["info", "warning", "error", "success"],
		},
		iconSize: {
			control: "text",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[500px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof StatusAlert>;

export const Info: Story = {
	args: {
		variant: "info",
		children: (
			<p>
				All new users will be assigned the{" "}
				<span className="font-semibold">User</span> role by default.
			</p>
		),
	},
};

export const Warning: Story = {
	args: {
		variant: "warning",
		children: <p>Your session will expire in 5 minutes.</p>,
	},
};

export const Error: Story = {
	args: {
		variant: "error",
		children: <p>Failed to save your changes. Please try again.</p>,
	},
};

export const Success: Story = {
	args: {
		variant: "success",
		children: <p>Your changes have been saved successfully.</p>,
	},
};

export const WithTitle: Story = {
	args: {
		variant: "info",
		title: "Important Notice",
		children: <p>Please review the updated terms and conditions.</p>,
	},
};

export const CustomIconSize: Story = {
	args: {
		variant: "warning",
		iconSize: "size-6",
		children: <p>Larger icon for emphasis.</p>,
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<StatusAlert variant="info">
				<p>This is an informational message.</p>
			</StatusAlert>
			<StatusAlert variant="warning">
				<p>This is a warning message.</p>
			</StatusAlert>
			<StatusAlert variant="error">
				<p>This is an error message.</p>
			</StatusAlert>
			<StatusAlert variant="success">
				<p>This is a success message.</p>
			</StatusAlert>
		</div>
	),
};

export const WithTitles: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<StatusAlert variant="info" title="Information">
				<p>Additional context about the current state.</p>
			</StatusAlert>
			<StatusAlert variant="warning" title="Caution">
				<p>Be careful about proceeding with this action.</p>
			</StatusAlert>
			<StatusAlert variant="error" title="Error Occurred">
				<p>Something went wrong. Please try again later.</p>
			</StatusAlert>
			<StatusAlert variant="success" title="Complete">
				<p>Your operation was successful.</p>
			</StatusAlert>
		</div>
	),
};

export const RichContent: Story = {
	args: {
		variant: "info",
		title: "File Requirements",
		children: (
			<ul className="list-disc list-inside space-y-1">
				<li>Maximum file size: 10MB</li>
				<li>Supported formats: PDF, DOC, DOCX</li>
				<li>Up to 5 files can be uploaded</li>
			</ul>
		),
	},
};
