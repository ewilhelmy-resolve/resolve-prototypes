import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WelcomeDialog from "./WelcomeDialog";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta: Meta<typeof WelcomeDialog> = {
	component: WelcomeDialog,
	title: "Features/Onboarding/Welcome Dialog",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<Story />
			</QueryClientProvider>
		),
	],
	parameters: {
		layout: "fullscreen",

		docs: {
			description: {
				component:
					"Welcome dialog with role-based content. Uses useProfile and useProfilePermissions hooks internally. Mock these hooks in tests to control admin vs user views.",
			},
			story: {
				inline: false,
				iframeHeight: 600,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof WelcomeDialog>;

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story:
					"Default view - content depends on the mocked profile data. In production, shows admin or user content based on useProfilePermissions.",
			},
		},
	},
};

export const Closed: Story = {
	args: {
		open: false,
	},
	parameters: {
		docs: {
			description: {
				story: "Dialog is hidden when open prop is false",
			},
		},
	},
};
