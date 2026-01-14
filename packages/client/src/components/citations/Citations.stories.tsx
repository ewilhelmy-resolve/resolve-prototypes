import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Citations, type CitationSource } from "./Citations";
import { CitationProvider } from "@/contexts/CitationContext";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta: Meta<typeof Citations> = {
	component: Citations,
	title: "Features/Chat/Citations",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<CitationProvider>
					<div className="w-full p-4">
						<Story />
					</div>
				</CitationProvider>
			</QueryClientProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Citations>;

const sampleSources: CitationSource[] = [
	{
		title: "Password Reset Guide",
		url: "https://docs.example.com/password-reset",
		snippet:
			"To reset your password, navigate to Settings > Security > Change Password. Enter your current password, then your new password twice.",
	},
	{
		title: "VPN Setup Instructions",
		url: "https://docs.example.com/vpn-setup",
		snippet:
			"Download the VPN client from the IT portal. Install and configure using your company credentials.",
	},
	{
		title: "Security Best Practices",
		url: "https://docs.example.com/security",
		snippet:
			"Use strong passwords with at least 12 characters. Enable two-factor authentication on all accounts.",
	},
];

const blobSources: CitationSource[] = [
	{
		title: "Rita Automation Implementation Guide",
		blob_metadata_id: "blob_automation_guide_v2024",
		snippet:
			"This guide covers the implementation of Rita automation workflows including triggers, actions, and conditions.",
	},
	{
		title: "Architecture Patterns 2024",
		blob_metadata_id: "blob_architecture_patterns_2024",
		snippet:
			"Enterprise architecture patterns for scalable microservices deployments with monitoring.",
	},
];

export const CollapsibleList: Story = {
	args: {
		sources: sampleSources,
		variant: "collapsible-list",
		messageId: "msg-123",
	},
};

export const Modal: Story = {
	args: {
		sources: sampleSources,
		variant: "modal",
		messageId: "msg-124",
	},
};

export const RightPanel: Story = {
	args: {
		sources: sampleSources,
		variant: "right-panel",
		messageId: "msg-125",
	},
};

export const HoverCard: Story = {
	args: {
		sources: sampleSources,
		variant: "hover-card",
		messageId: "msg-126",
	},
};

export const SingleSource: Story = {
	args: {
		sources: [sampleSources[0]],
		variant: "collapsible-list",
		messageId: "msg-127",
	},
};

export const WithBlobMetadata: Story = {
	args: {
		sources: blobSources,
		variant: "collapsible-list",
		messageId: "msg-128",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Sources with blob_metadata_id for loading full document content",
			},
		},
	},
};

export const MixedSources: Story = {
	args: {
		sources: [...sampleSources.slice(0, 2), ...blobSources.slice(0, 1)],
		variant: "collapsible-list",
		messageId: "msg-129",
	},
	parameters: {
		docs: {
			description: {
				story: "Mix of URL-based and blob-based sources",
			},
		},
	},
};

export const ManySources: Story = {
	args: {
		sources: [
			...sampleSources,
			{
				title: "Onboarding Checklist",
				url: "https://docs.example.com/onboarding",
				snippet: "Complete guide for new employee onboarding procedures.",
			},
			{
				title: "IT Support Portal",
				url: "https://support.example.com",
				snippet: "Submit tickets and track IT support requests.",
			},
			{
				title: "Company Policies",
				url: "https://policies.example.com",
				snippet: "Overview of company policies and procedures.",
			},
		],
		variant: "collapsible-list",
		messageId: "msg-130",
	},
};

export const NoSources: Story = {
	args: {
		sources: [],
		variant: "collapsible-list",
		messageId: "msg-131",
	},
	parameters: {
		docs: {
			description: {
				story: "Component returns null when no sources provided",
			},
		},
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="space-y-8">
			<div>
				<h3 className="text-sm font-medium mb-2">Collapsible List</h3>
				<Citations
					sources={sampleSources}
					variant="collapsible-list"
					messageId="v1"
				/>
			</div>
			<div>
				<h3 className="text-sm font-medium mb-2">Modal</h3>
				<Citations sources={sampleSources} variant="modal" messageId="v2" />
			</div>
			<div>
				<h3 className="text-sm font-medium mb-2">Right Panel</h3>
				<Citations
					sources={sampleSources}
					variant="right-panel"
					messageId="v3"
				/>
			</div>
			<div>
				<h3 className="text-sm font-medium mb-2">Hover Card</h3>
				<Citations
					sources={sampleSources}
					variant="hover-card"
					messageId="v4"
				/>
			</div>
		</div>
	),
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<CitationProvider>
					<div className="w-full p-4">
						<Story />
					</div>
				</CitationProvider>
			</QueryClientProvider>
		),
	],
};
