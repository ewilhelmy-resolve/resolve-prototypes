import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { KnowledgeArticleItem } from "./KnowledgeArticleItem";

const meta: Meta<typeof KnowledgeArticleItem> = {
	component: KnowledgeArticleItem,
	title: "Features/Tickets/Knowledge Article Item",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays a single knowledge article row with filename, file type, creation date, and action menu.",
			},
		},
	},
	args: {
		onDownload: fn(),
		onReprocess: fn(),
		onDelete: fn(),
		onRemoveFromGroup: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof KnowledgeArticleItem>;

export const PDF: Story = {
	args: {
		id: "1",
		filename: "Product Documentation v2.pdf",
		fileType: "PDF",
		createdAt: "Dec 15, 10:30 AM",
	},
};

export const Word: Story = {
	args: {
		id: "2",
		filename: "Support Guidelines.docx",
		fileType: "Docx",
		createdAt: "Dec 14, 3:45 PM",
	},
};

export const Excel: Story = {
	args: {
		id: "3",
		filename: "Pricing Matrix Q4 2024.xlsx",
		fileType: "Excel",
		createdAt: "Dec 10, 9:00 AM",
	},
};

export const Text: Story = {
	args: {
		id: "4",
		filename: "README.txt",
		fileType: "Text",
		createdAt: "Dec 8, 2:15 PM",
	},
};

export const LongFilename: Story = {
	args: {
		id: "5",
		filename: "Very Long Filename That Should Be Truncated When It Exceeds The Available Width.pdf",
		fileType: "PDF",
		createdAt: "Dec 5, 11:00 AM",
	},
};
