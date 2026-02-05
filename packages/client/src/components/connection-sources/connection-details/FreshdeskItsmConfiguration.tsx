"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatusAlert } from "@/components/ui/status-alert";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

const TIME_RANGE_OPTIONS_KEYS = [
	{ labelKey: "config.timeRanges.last30Days" as const, value: "30" },
	{ labelKey: "config.timeRanges.last60Days" as const, value: "60" },
	{ labelKey: "config.timeRanges.last90Days" as const, value: "90" },
];

interface FreshdeskItsmConfigurationProps {
	onEdit?: () => void;
}

export default function FreshdeskItsmConfiguration({
	onEdit,
}: FreshdeskItsmConfigurationProps) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();

	return (
		<div className="w-full flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<FormSectionTitle title={t("config.titles.freshdeskItsm")} />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard source={source} hideStatusMessage />

				{/* ITSM Sync Section - placeholder UI */}
				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="rounded-lg flex flex-col gap-4">
							<StatusAlert variant="info">
								<p className="font-semibold">{t("form.alerts.comingSoon")}</p>
								<p>{t("form.alerts.freshdeskNotReady")}</p>
							</StatusAlert>

							{/* Import tickets controls - disabled placeholder */}
							<div>
								<Label className="mb-2">
									{t("config.labels.importFromLast")}
								</Label>
								<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
									<div className="md:flex-1 w-full">
										<Select value="30" disabled>
											<SelectTrigger className="w-full">
												<SelectValue placeholder={t("config.labels.selectTimeRange")} />
											</SelectTrigger>
											<SelectContent>
												{TIME_RANGE_OPTIONS_KEYS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{t(option.labelKey)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<Button
										disabled
										className="w-full md:w-fit"
										variant="default"
									>
										{t("config.sync.importTickets")}
									</Button>
								</div>
							</div>

							{/* Last sync info - placeholder */}
							<div className="border-t border-border pt-4">
								<p className="text-sm text-muted-foreground">
									{t("config.sync.noTicketsYet")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
