import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { ReasoningSteps } from "./reasoning-steps";

const meta: Meta<typeof ReasoningSteps> = {
	title: "Rita/Reasoning Steps",
	component: ReasoningSteps,
	parameters: { layout: "padded" },
};

export default meta;

const SAMPLE_CONTENT = `Starting agent
Polling for execution status updates (execution_id: b3bdb9be-1a5a-4d3b-aca1-26f22a60ce37)
Requirements Analyst is working...
Verifying if activity with same name already exists
Verifying if activity with same name already exists
Verifying if activity with same name already exists
Verifying if activity with same name already exists
Software Developer is working...
Using generate_python_code...`;

export const Completed: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: SAMPLE_CONTENT,
		isStreaming: false,
	},
};

export const Streaming: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: SAMPLE_CONTENT,
		isStreaming: true,
	},
};

export const StreamingLive: StoryObj = {
	render: () => {
		const lines = SAMPLE_CONTENT.split("\n");
		const [visibleLines, setVisibleLines] = useState(1);

		useEffect(() => {
			if (visibleLines >= lines.length) return;
			const timer = setTimeout(() => {
				setVisibleLines((v) => v + 1);
			}, 1500);
			return () => clearTimeout(timer);
		}, [visibleLines, lines.length]);

		const content = lines.slice(0, visibleLines).join("\n");
		const isStreaming = visibleLines < lines.length;

		return (
			<div className="max-w-lg">
				<p className="text-xs text-muted-foreground mb-4">
					Simulating live streaming — new steps appear every 1.5s
				</p>
				<ReasoningSteps content={content} isStreaming={isStreaming} />
			</div>
		);
	},
};

export const ShortContent: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: "Starting agent\nRunning workflow...",
		isStreaming: true,
	},
};

export const ManyDuplicates: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: `Starting agent
Checking permissions
Checking permissions
Checking permissions
Checking permissions
Checking permissions
Checking permissions
Checking permissions
Processing request
Done`,
		isStreaming: false,
	},
};
