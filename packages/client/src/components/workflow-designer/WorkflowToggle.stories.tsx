import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { WorkflowToggle } from "./WorkflowToggle";

const meta: Meta<typeof WorkflowToggle> = {
	component: WorkflowToggle,
	title: "Features/Workflow Designer/WorkflowToggle",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof WorkflowToggle>;

export const Default: Story = {
	args: {
		checked: false,
		"aria-label": "Toggle activity",
	},
};

export const Checked: Story = {
	args: {
		checked: true,
		"aria-label": "Toggle activity",
	},
};

export const AllStates: Story = {
	render: () => {
		const [checkedA, setCheckedA] = useState(false);
		const [checkedB, setCheckedB] = useState(true);
		return (
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<WorkflowToggle
						checked={checkedA}
						onChange={setCheckedA}
						aria-label="Off toggle"
					/>
					<span className="text-sm text-slate-600">
						{checkedA ? "On" : "Off"}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<WorkflowToggle
						checked={checkedB}
						onChange={setCheckedB}
						aria-label="On toggle"
					/>
					<span className="text-sm text-slate-600">
						{checkedB ? "On" : "Off"}
					</span>
				</div>
			</div>
		);
	},
};
