import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FilesPagination } from "./FilesPagination";

const meta: Meta<typeof FilesPagination> = {
	component: FilesPagination,
	title: "Features/Knowledge Articles/Files Pagination",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Pagination footer showing item range and Previous/Next navigation buttons.",
			},
		},
	},
	args: {
		onPrevious: fn(),
		onNext: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof FilesPagination>;

export const FirstPage: Story = {
	args: {
		page: 0,
		pageSize: 50,
		total: 150,
	},
};

export const MiddlePage: Story = {
	args: {
		page: 1,
		pageSize: 50,
		total: 150,
	},
};

export const LastPage: Story = {
	args: {
		page: 2,
		pageSize: 50,
		total: 150,
	},
};

export const Filtered: Story = {
	args: {
		page: 0,
		pageSize: 50,
		total: 150,
		hasFilters: true,
		filteredCount: 12,
	},
};

export const SinglePage: Story = {
	args: {
		page: 0,
		pageSize: 50,
		total: 25,
	},
};
