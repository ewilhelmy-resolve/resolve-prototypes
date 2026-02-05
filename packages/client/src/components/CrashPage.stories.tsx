import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useTranslation } from "react-i18next";
import { CrashPage } from "./CrashPage";

const meta: Meta<typeof CrashPage> = {
	component: CrashPage,
	title: "Components/Feedback/CrashPage",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	args: {
		onAction: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof CrashPage>;

export const Default: Story = {
	args: {
		title: "Something went wrong",
		description: "An unexpected error occurred. Please try again.",
		actionLabel: "Try Again",
	},
};

export const ProfileLoadError: Story = {
	args: {
		title: "Unable to load your profile",
		description:
			"We couldn't load your profile after multiple attempts. Please sign in again.",
		actionLabel: "Go to Login",
	},
};

export const NetworkError: Story = {
	args: {
		title: "Connection Lost",
		description: "You appear to be offline. Please check your connection.",
		actionLabel: "Retry",
	},
};

/**
 * This story demonstrates using translations with the CrashPage component.
 * The strings are pulled from the i18n locale files.
 */
export const WithTranslations: Story = {
	render: function TranslatedCrashPage(args) {
		const { t } = useTranslation(["errors", "common"]);

		return (
			<CrashPage
				{...args}
				title={t("errors:generic.profileLoad.title")}
				description={t("errors:generic.profileLoad.description")}
				actionLabel={t("common:actions.goToLogin")}
			/>
		);
	},
};

/**
 * Shows the generic error state using translations.
 */
export const GenericErrorTranslated: Story = {
	render: function GenericErrorPage(args) {
		const { t } = useTranslation(["errors", "common"]);

		return (
			<CrashPage
				{...args}
				title={t("errors:generic.title")}
				description={t("errors:generic.description")}
				actionLabel={t("common:actions.retry")}
			/>
		);
	},
};
