import type { Meta, StoryObj } from "@storybook/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const meta: Meta = {
	title: "Translations/Overview",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"i18n translations using react-i18next. All strings are organized by namespace for maintainability.",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

function NamespaceSection({
	namespace,
	children,
}: {
	namespace: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<CardTitle className="text-lg">{namespace}</CardTitle>
					<Badge variant="outline" className="text-xs">
						{namespace}.json
					</Badge>
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function TranslationRow({
	keyPath,
	value,
}: {
	keyPath: string;
	value: string;
}) {
	return (
		<div className="flex justify-between items-start py-2 border-b border-border last:border-0">
			<code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
				{keyPath}
			</code>
			<span className="text-sm text-right max-w-[50%]">{value}</span>
		</div>
	);
}

export const Overview: Story = {
	render: function TranslationsOverview() {
		const { t } = useTranslation([
			"common",
			"errors",
			"toast",
			"settings",
			"validation",
		]);

		return (
			<div className="max-w-4xl space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Translations (i18n)</h1>
					<p className="text-muted-foreground">
						RITA Go uses react-i18next for internationalization. Translations
						are organized by namespace for maintainability.
					</p>
				</div>

				<div className="p-4 rounded-lg border border-border bg-muted/50">
					<h3 className="font-medium mb-2">Usage</h3>
					<pre className="text-sm bg-background p-3 rounded overflow-x-auto">
						{`import { useTranslation } from 'react-i18next';

const { t } = useTranslation(['errors', 'common']);

// Single namespace
t('common:actions.save')

// With interpolation
t('toast:success.invitationsSent', { count: 5 })`}
					</pre>
				</div>

				<div className="grid gap-4">
					<NamespaceSection namespace="common">
						<CardDescription className="mb-3">
							Shared UI elements: buttons, labels, states
						</CardDescription>
						<div className="space-y-1">
							<TranslationRow
								keyPath="actions.save"
								value={t("common:actions.save")}
							/>
							<TranslationRow
								keyPath="actions.cancel"
								value={t("common:actions.cancel")}
							/>
							<TranslationRow
								keyPath="actions.delete"
								value={t("common:actions.delete")}
							/>
							<TranslationRow
								keyPath="actions.retry"
								value={t("common:actions.retry")}
							/>
							<TranslationRow
								keyPath="states.loading"
								value={t("common:states.loading")}
							/>
							<TranslationRow
								keyPath="states.saving"
								value={t("common:states.saving")}
							/>
							<TranslationRow
								keyPath="labels.email"
								value={t("common:labels.email")}
							/>
						</div>
					</NamespaceSection>

					<NamespaceSection namespace="errors">
						<CardDescription className="mb-3">
							Error messages for various failure states
						</CardDescription>
						<div className="space-y-1">
							<TranslationRow
								keyPath="generic.title"
								value={t("errors:generic.title")}
							/>
							<TranslationRow
								keyPath="generic.description"
								value={t("errors:generic.description")}
							/>
							<TranslationRow
								keyPath="generic.profileLoad.title"
								value={t("errors:generic.profileLoad.title")}
							/>
							<TranslationRow
								keyPath="api.unauthorized"
								value={t("errors:api.unauthorized")}
							/>
							<TranslationRow
								keyPath="network.offline"
								value={t("errors:network.offline")}
							/>
						</div>
					</NamespaceSection>

					<NamespaceSection namespace="toast">
						<CardDescription className="mb-3">
							Toast notification messages
						</CardDescription>
						<div className="space-y-1">
							<TranslationRow
								keyPath="success.profileUpdated"
								value={t("toast:success.profileUpdated")}
							/>
							<TranslationRow
								keyPath="success.connectionConfigured"
								value={t("toast:success.connectionConfigured")}
							/>
							<TranslationRow
								keyPath="error.profileUpdateFailed"
								value={t("toast:error.profileUpdateFailed")}
							/>
							<TranslationRow
								keyPath="warning.responseTimeout"
								value={t("toast:warning.responseTimeout")}
							/>
						</div>
					</NamespaceSection>

					<NamespaceSection namespace="validation">
						<CardDescription className="mb-3">
							Form validation error messages
						</CardDescription>
						<div className="space-y-1">
							<TranslationRow
								keyPath="required.email"
								value={t("validation:required.email")}
							/>
							<TranslationRow
								keyPath="format.email"
								value={t("validation:format.email")}
							/>
							<TranslationRow
								keyPath="required.field"
								value={t("validation:required.field")}
							/>
						</div>
					</NamespaceSection>

					<NamespaceSection namespace="settings">
						<CardDescription className="mb-3">
							Settings page content
						</CardDescription>
						<div className="space-y-1">
							<TranslationRow
								keyPath="profile.title"
								value={t("settings:profile.title")}
							/>
							<TranslationRow
								keyPath="profile.description"
								value={t("settings:profile.description")}
							/>
							<TranslationRow
								keyPath="users.title"
								value={t("settings:users.title")}
							/>
							<TranslationRow
								keyPath="knowledgeSources.title"
								value={t("settings:knowledgeSources.title")}
							/>
						</div>
					</NamespaceSection>
				</div>
			</div>
		);
	},
};

export const CommonNamespace: Story = {
	name: "Common Actions",
	render: function CommonActions() {
		const { t } = useTranslation("common");

		return (
			<div className="space-y-6">
				<div>
					<h3 className="font-medium mb-3">Action Buttons</h3>
					<div className="flex flex-wrap gap-2">
						<Button>{t("actions.save")}</Button>
						<Button variant="outline">{t("actions.cancel")}</Button>
						<Button variant="destructive">{t("actions.delete")}</Button>
						<Button variant="secondary">{t("actions.edit")}</Button>
						<Button variant="ghost">{t("actions.close")}</Button>
					</div>
				</div>

				<div>
					<h3 className="font-medium mb-3">Loading States</h3>
					<div className="flex flex-wrap gap-2">
						<Button disabled>{t("states.loading")}</Button>
						<Button disabled>{t("states.saving")}</Button>
						<Button disabled>{t("states.connecting")}</Button>
					</div>
				</div>

				<div>
					<h3 className="font-medium mb-3">Form Labels</h3>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span className="text-muted-foreground">labels.email:</span>{" "}
							{t("labels.email")}
						</div>
						<div>
							<span className="text-muted-foreground">labels.firstName:</span>{" "}
							{t("labels.firstName")}
						</div>
						<div>
							<span className="text-muted-foreground">labels.lastName:</span>{" "}
							{t("labels.lastName")}
						</div>
						<div>
							<span className="text-muted-foreground">labels.organization:</span>{" "}
							{t("labels.organization")}
						</div>
					</div>
				</div>
			</div>
		);
	},
};

export const WithInterpolation: Story = {
	name: "Interpolation",
	render: function InterpolationExample() {
		const { t } = useTranslation(["toast", "validation", "settings"]);

		return (
			<div className="space-y-6 max-w-xl">
				<div className="space-y-2">
					<h3 className="font-medium">Dynamic Values</h3>
					<p className="text-sm text-muted-foreground">
						Translations can include dynamic values using {"{{variable}}"}{" "}
						syntax.
					</p>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Count interpolation</CardTitle>
						</CardHeader>
						<CardContent>
							<code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
								t('toast:success.invitationsSent', {"{ count: 5 }"})
							</code>
							<p className="text-sm">
								{t("toast:success.invitationsSent", { count: 5 })}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Field name interpolation</CardTitle>
						</CardHeader>
						<CardContent>
							<code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
								t('validation:length.maxLength', {"{ field: 'Name', max: 50 }"})
							</code>
							<p className="text-sm">
								{t("validation:length.maxLength", { field: "Name", max: 50 })}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Time interpolation</CardTitle>
						</CardHeader>
						<CardContent>
							<code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
								t('settings:knowledgeSources.lastSync', {"{ time: '2 hours ago' }"})
							</code>
							<p className="text-sm">
								{t("settings:knowledgeSources.lastSync", {
									time: "2 hours ago",
								})}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	},
};

export const Namespaces: Story = {
	name: "Available Namespaces",
	render: () => (
		<div className="max-w-2xl">
			<h3 className="font-medium mb-4">Namespace Organization</h3>
			<div className="grid gap-3">
				{[
					{ name: "common", desc: "Buttons, labels, shared UI" },
					{ name: "errors", desc: "Error messages" },
					{ name: "toast", desc: "Toast notifications" },
					{ name: "settings", desc: "Settings pages" },
					{ name: "connections", desc: "Data source forms" },
					{ name: "chat", desc: "Chat interface" },
					{ name: "auth", desc: "Auth pages" },
					{ name: "validation", desc: "Form validation" },
					{ name: "files", desc: "Knowledge base" },
				].map((ns) => (
					<div
						key={ns.name}
						className="flex justify-between items-center p-3 rounded border border-border"
					>
						<code className="text-sm font-medium">{ns.name}</code>
						<span className="text-sm text-muted-foreground">{ns.desc}</span>
					</div>
				))}
			</div>
		</div>
	),
};
