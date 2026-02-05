import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";
import { useEffect, useState } from "react";

const meta: Meta<typeof Progress> = {
	component: Progress,
	title: "Components/Feedback/Progress",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
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
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
	args: {
		value: 60,
	},
};

export const Empty: Story = {
	args: {
		value: 0,
	},
};

export const Half: Story = {
	args: {
		value: 50,
	},
};

export const Full: Story = {
	args: {
		value: 100,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-2">
			<div className="flex justify-between text-sm">
				<span>Progress</span>
				<span>75%</span>
			</div>
			<Progress value={75} />
		</div>
	),
};

export const Animated: Story = {
	render: function AnimatedProgress() {
		const [value, setValue] = useState(0);

		useEffect(() => {
			const timer = setInterval(() => {
				setValue((v) => (v >= 100 ? 0 : v + 10));
			}, 500);
			return () => clearInterval(timer);
		}, []);

		return <Progress value={value} />;
	},
};

export const MultipleProgress: Story = {
	render: () => (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<div className="flex justify-between text-sm">
					<span>Uploading...</span>
					<span>25%</span>
				</div>
				<Progress value={25} />
			</div>
			<div className="grid gap-2">
				<div className="flex justify-between text-sm">
					<span>Processing...</span>
					<span>60%</span>
				</div>
				<Progress value={60} />
			</div>
			<div className="grid gap-2">
				<div className="flex justify-between text-sm">
					<span>Complete</span>
					<span>100%</span>
				</div>
				<Progress value={100} />
			</div>
		</div>
	),
};

export const FileUpload: Story = {
	render: () => (
		<div className="grid gap-2 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<div className="flex-1">
					<p className="text-sm font-medium">document.pdf</p>
					<p className="text-xs text-muted-foreground">2.4 MB of 5 MB</p>
				</div>
				<span className="text-sm font-medium">48%</span>
			</div>
			<Progress value={48} />
		</div>
	),
};
