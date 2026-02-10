import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { mockSyncedSources } from "./__mocks__/files";
import { AddKnowledgeMenu } from "./AddKnowledgeMenu";

const meta: Meta<typeof AddKnowledgeMenu> = {
	component: AddKnowledgeMenu,
	title: "Features/Knowledge Articles/Add Knowledge Menu",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Header dropdown menu for adding knowledge articles via file upload or connecting external data sources.",
			},
		},
	},
	args: {
		onUploadClick: fn(),
		onNavigate: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof AddKnowledgeMenu>;

export const Default: Story = {
	args: {},
};

export const Uploading: Story = {
	args: {
		isUploading: true,
		uploadingCount: 3,
	},
};

export const WithSyncedSources: Story = {
	args: {
		syncedSources: mockSyncedSources,
	},
};
