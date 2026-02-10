import type { Meta, StoryObj } from "@storybook/react";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FilesTableSkeleton } from "./FilesTableSkeleton";

const meta: Meta<typeof FilesTableSkeleton> = {
	component: FilesTableSkeleton,
	title: "Features/Knowledge Articles/Files Table Skeleton",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Loading skeleton rows for the Knowledge Articles file table.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="border rounded-md">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12" />
							<TableHead>Name</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Source</TableHead>
							<TableHead className="text-right">Size</TableHead>
							<TableHead className="text-right">Last Modified</TableHead>
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						<Story />
					</TableBody>
				</Table>
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FilesTableSkeleton>;

export const Default: Story = {
	args: {},
};

export const FiveRows: Story = {
	args: {
		rows: 5,
	},
};
