import type { Meta, StoryObj } from "@storybook/react";
import { Upload } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SOURCE_METADATA, SOURCES } from "@/constants/connectionSources";
import {
	MAX_FILE_SIZE_MB,
	SUPPORTED_DOCUMENT_EXTENSIONS,
} from "@/lib/constants";

// Use base URL for GitHub Pages compatibility
const baseUrl = import.meta.env.BASE_URL || "/";

const meta: Meta = {
	title: "Features/Chat/Empty State",
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Empty state component shown when there are no messages in the chat. Displays different content based on whether knowledge base has content and user permissions.",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// Connection source icons to display
const connectionSources = [
	{
		type: SOURCES.CONFLUENCE,
		icon: `${baseUrl}connections/icon_${SOURCES.CONFLUENCE}.svg`,
	},
	{
		type: SOURCES.SHAREPOINT,
		icon: `${baseUrl}connections/icon_${SOURCES.SHAREPOINT}.svg`,
	},
	{
		type: SOURCES.SERVICENOW,
		icon: `${baseUrl}connections/icon_${SOURCES.SERVICENOW}.svg`,
	},
];

export const NoKnowledgeAdmin: Story = {
	render: () => (
		<div className="flex flex-col items-center justify-center gap-8 py-12 w-full max-w-4xl">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">Ask RITA</h2>
				<p className="text-base text-muted-foreground">
					Build your organization's help agent by adding knowledge
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
				{/* Upload a file card */}
				<Card className="cursor-pointer">
					<CardHeader>
						<div className="flex items-start justify-between">
							<CardTitle className="text-lg font-medium">
								Upload a file
							</CardTitle>
							<Upload className="h-5 w-5 text-muted-foreground" />
						</div>
						<CardDescription className="text-base">
							Add knowledge via documents
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							File types: {SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}; max size:{" "}
							{MAX_FILE_SIZE_MB}mb
						</p>
					</CardContent>
				</Card>

				{/* Add a connection card */}
				<Card className="cursor-pointer">
					<CardHeader>
						<CardTitle className="text-lg font-medium">
							Add a connection
						</CardTitle>
						<CardDescription className="text-base">
							Connect your knowledge sources
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-3">
							{connectionSources.map((source) => (
								<div
									key={source.type}
									className="w-8 h-8 flex items-center justify-center"
								>
									<img
										src={source.icon}
										alt={SOURCE_METADATA[source.type]?.title || source.type}
										className="w-6 h-6"
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<p className="text-xs text-muted-foreground text-center max-w-md">
				All files and connections stay within your organization's workspace.
			</p>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Empty state for admin/owner users when no knowledge base exists. Shows cards to upload files or add connections.",
			},
		},
	},
};

export const HasKnowledgeAdmin: Story = {
	render: () => (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">Ask RITA</h2>
				<p className="text-base text-muted-foreground">
					Diagnose and resolve issues, then create automations to speed up
					future remediation
				</p>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Empty state when knowledge base has content. Shows welcome message with instructions.",
			},
		},
	},
};

export const NoKnowledgeRegularUser: Story = {
	render: () => (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">Ask RITA</h2>
				<p className="text-base text-muted-foreground">
					Build your organization's help agent by adding knowledge
				</p>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Empty state for regular users when no knowledge base exists. No action cards shown (admin-only feature).",
			},
		},
	},
};

export const GuestMode: Story = {
	render: () => (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">Ask RITA</h2>
				<p className="text-base text-muted-foreground">
					Start a conversation by typing your question below.
				</p>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Empty state for guest/public users (iframe mode). Simple welcome message without knowledge base requirements.",
			},
		},
	},
};
