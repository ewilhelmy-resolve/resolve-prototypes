import type { Meta, StoryObj } from "@storybook/react";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Form Components/Select",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "select",
					name: "role",
					label: "Role",
					options: [
						{ label: "Admin", value: "admin" },
						{ label: "Editor", value: "editor" },
						{ label: "Viewer", value: "viewer" },
					],
				},
			],
		},
	},
};

export const WithPlaceholder: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "select",
					name: "department",
					label: "Department",
					placeholder: "Choose a department...",
					options: [
						{ label: "Engineering", value: "engineering" },
						{ label: "Design", value: "design" },
						{ label: "Marketing", value: "marketing" },
					],
				},
			],
		},
	},
};

export const Required: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "select",
					name: "priority",
					label: "Priority",
					required: true,
					options: [
						{ label: "Low", value: "low" },
						{ label: "Medium", value: "medium" },
						{ label: "High", value: "high" },
						{ label: "Critical", value: "critical" },
					],
				},
			],
		},
	},
};

export const WithDefaultValue: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "select",
					name: "status",
					label: "Status",
					defaultValue: "active",
					options: [
						{ label: "Active", value: "active" },
						{ label: "Inactive", value: "inactive" },
						{ label: "Pending", value: "pending" },
					],
				},
			],
		},
	},
};

export const ManyOptions: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "select",
					name: "timezone",
					label: "Timezone",
					placeholder: "Select timezone...",
					options: [
						{ label: "UTC-12:00 Baker Island", value: "utc-12" },
						{ label: "UTC-11:00 American Samoa", value: "utc-11" },
						{ label: "UTC-10:00 Hawaii", value: "utc-10" },
						{ label: "UTC-09:00 Alaska", value: "utc-9" },
						{ label: "UTC-08:00 Pacific Time", value: "utc-8" },
						{ label: "UTC-07:00 Mountain Time", value: "utc-7" },
						{ label: "UTC-06:00 Central Time", value: "utc-6" },
						{ label: "UTC-05:00 Eastern Time", value: "utc-5" },
						{ label: "UTC-04:00 Atlantic Time", value: "utc-4" },
						{ label: "UTC+00:00 London", value: "utc-0" },
						{ label: "UTC+01:00 Berlin", value: "utc+1" },
						{ label: "UTC+05:30 Mumbai", value: "utc+5.5" },
						{ label: "UTC+08:00 Singapore", value: "utc+8" },
						{ label: "UTC+09:00 Tokyo", value: "utc+9" },
						{ label: "UTC+10:00 Sydney", value: "utc+10" },
					],
				},
			],
		},
	},
};
