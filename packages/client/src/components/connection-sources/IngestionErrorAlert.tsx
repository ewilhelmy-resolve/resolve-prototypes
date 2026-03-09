import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import type { IngestionRun } from "@/types/dataSource";

interface IngestionErrorAlertProps {
	/** Latest ingestion run with status and error fields */
	latestRun: IngestionRun | undefined | null;
	/** Callback to trigger re-verification (switches to credential form) */
	onReVerify?: () => void;
}

function isCredentialError(error: string): boolean {
	const lower = error.toLowerCase();
	return lower.includes("authentication") || lower.includes("permission");
}

/**
 * IngestionErrorAlert - Inline alert for ticket ingestion errors
 *
 * Shows contextual alerts based on latest ingestion run status:
 * - Credential/permission failure: error alert with "Re-verify credentials" action
 * - Generic ingestion failure: error alert with error message
 * - tickets_below_threshold is handled separately by TicketGroups, not here
 */
export function IngestionErrorAlert({
	latestRun,
	onReVerify,
}: IngestionErrorAlertProps) {
	const { t } = useTranslation("connections");

	if (!latestRun) return null;

	// Only show for failed runs with an error message
	if (latestRun.status !== "failed" || !latestRun.error_message) return null;

	// Skip tickets_below_threshold — handled by TicketGroups component
	if (latestRun.error_message === "tickets_below_threshold") return null;

	// Credential/permission error
	if (isCredentialError(latestRun.error_message)) {
		return (
			<StatusAlert
				variant="error"
				title={t("syncError.credentialFailedTitle")}
				action={
					onReVerify ? (
						<Button size="sm" variant="outline" onClick={onReVerify}>
							{t("syncError.reVerifyCredentials")}
						</Button>
					) : undefined
				}
			>
				<p>{latestRun.error_message}</p>
			</StatusAlert>
		);
	}

	// Generic ingestion failure
	return (
		<StatusAlert variant="error" title={t("syncError.ingestionFailedTitle")}>
			<p>{latestRun.error_message}</p>
		</StatusAlert>
	);
}
