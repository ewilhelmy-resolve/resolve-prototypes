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

export const ExplicitIcons: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: `[icon:zap] Initializing workflow engine
[icon:shield,color:green] Validating security credentials
[icon:database,color:purple] Querying knowledge base
[icon:globe,color:amber] Calling external API
[icon:bot,color:primary] AI Agent analyzing results
[icon:code,color:green] Generating solution code
[icon:search] Verifying output integrity
[icon:settings,color:amber] Applying configuration
[icon:file] Writing activity manifest
[icon:shield,color:green] Final security scan`,
		isStreaming: false,
	},
};

export const ExplicitIconsStreaming: StoryObj = {
	render: () => {
		const lines = [
			"[icon:zap] Initializing workflow engine",
			"[icon:shield,color:green] Validating security credentials",
			"[icon:database,color:purple] Querying knowledge base",
			"[icon:globe,color:amber] Calling external API",
			"[icon:bot,color:primary] AI Agent analyzing results",
			"[icon:code,color:green] Generating solution code",
			"[icon:search] Verifying output integrity",
			"[icon:settings,color:amber] Applying configuration",
			"[icon:file] Writing activity manifest",
			"[icon:shield,color:green] Final security scan",
		];
		const [visibleLines, setVisibleLines] = useState(1);

		useEffect(() => {
			if (visibleLines >= lines.length) return;
			const timer = setTimeout(() => {
				setVisibleLines((v) => v + 1);
			}, 1200);
			return () => clearTimeout(timer);
		}, [visibleLines, lines.length]);

		const content = lines.slice(0, visibleLines).join("\n");
		const isStreaming = visibleLines < lines.length;

		return (
			<div className="max-w-lg">
				<p className="text-xs text-muted-foreground mb-4">
					API-specified icons and colors — streaming live
				</p>
				<ReasoningSteps content={content} isStreaming={isStreaming} />
			</div>
		);
	},
};

export const ColorVariants: StoryObj<typeof ReasoningSteps> = {
	args: {
		content: `[icon:zap,color:primary] Primary indicator (blue)
[icon:shield,color:green] Green indicator
[icon:alert,color:amber] Amber indicator
[icon:alert,color:red] Red indicator
[icon:database,color:purple] Purple indicator`,
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
