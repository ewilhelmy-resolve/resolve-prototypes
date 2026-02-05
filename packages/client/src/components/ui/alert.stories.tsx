import type { Meta, StoryObj } from "@storybook/react";
import { Alert, AlertTitle, AlertDescription } from "./alert";
import { AlertCircle, Terminal, Info, CheckCircle } from "lucide-react";

const meta: Meta<typeof Alert> = {
	component: Alert,
	title: "Components/Feedback/Alert",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "destructive"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
	render: () => (
		<Alert className="w-[400px]">
			<AlertTitle>Heads up!</AlertTitle>
			<AlertDescription>
				You can add components to your app using the cli.
			</AlertDescription>
		</Alert>
	),
};

export const Destructive: Story = {
	render: () => (
		<Alert variant="destructive" className="w-[400px]">
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>
				Your session has expired. Please log in again.
			</AlertDescription>
		</Alert>
	),
};

export const WithIcon: Story = {
	render: () => (
		<Alert className="w-[400px]">
			<Terminal className="h-4 w-4" />
			<AlertTitle>Heads up!</AlertTitle>
			<AlertDescription>
				You can add components to your app using the cli.
			</AlertDescription>
		</Alert>
	),
};

export const DestructiveWithIcon: Story = {
	render: () => (
		<Alert variant="destructive" className="w-[400px]">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>
				Your session has expired. Please log in again.
			</AlertDescription>
		</Alert>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-4 w-[400px]">
			<Alert>
				<Info className="h-4 w-4" />
				<AlertTitle>Information</AlertTitle>
				<AlertDescription>
					This is an informational message.
				</AlertDescription>
			</Alert>
			<Alert>
				<CheckCircle className="h-4 w-4" />
				<AlertTitle>Success</AlertTitle>
				<AlertDescription>
					Your changes have been saved successfully.
				</AlertDescription>
			</Alert>
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>
					Something went wrong. Please try again.
				</AlertDescription>
			</Alert>
		</div>
	),
};
