import type { Meta, StoryObj } from "@storybook/react";
import { DragDropOverlay } from "./DragDropOverlay";

const meta: Meta<typeof DragDropOverlay> = {
	component: DragDropOverlay,
	title: "Features/Chat/Drag Drop Overlay",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Visual overlay shown when files are dragged over the chat area. Provides feedback about accepted file types, max files, and size limits.",
			},
		},
	},
	args: {
		isDragging: true, // Default to true so docs page shows the component
	},
	decorators: [
		(Story) => (
			// Transform creates a new containing block for fixed positioning
			// This constrains the overlay within the story container in Docs view
			<div
				className="relative h-[500px] w-full overflow-hidden border rounded-lg bg-muted"
				style={{ transform: "translateZ(0)" }}
			>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DragDropOverlay>;

export const Default: Story = {
	args: {
		isDragging: true,
	},
	parameters: {
		docs: {
			description: {
				story: "Basic drag overlay without file constraints",
			},
		},
	},
};

export const WithAcceptedTypes: Story = {
	args: {
		isDragging: true,
		accept: ".pdf,.doc,.docx,.txt,.md",
	},
	parameters: {
		docs: {
			description: {
				story: "Shows supported file types badge",
			},
		},
	},
};

export const WithMaxFiles: Story = {
	args: {
		isDragging: true,
		maxFiles: 5,
	},
	parameters: {
		docs: {
			description: {
				story: "Shows max files limit badge",
			},
		},
	},
};

export const WithMaxFileSize: Story = {
	args: {
		isDragging: true,
		maxFileSize: 10 * 1024 * 1024, // 10MB
	},
	parameters: {
		docs: {
			description: {
				story: "Shows max file size badge (10MB)",
			},
		},
	},
};

export const WithAllConstraints: Story = {
	args: {
		isDragging: true,
		accept: ".pdf,.doc,.docx,.txt,.md",
		maxFiles: 10,
		maxFileSize: 25 * 1024 * 1024, // 25MB
	},
	parameters: {
		docs: {
			description: {
				story: "Shows all constraint badges: file types, max files, and max size",
			},
		},
	},
};

export const NotDragging: Story = {
	args: {
		isDragging: false,
	},
	parameters: {
		docs: {
			description: {
				story: "Component returns null when isDragging is false",
			},
		},
	},
};
