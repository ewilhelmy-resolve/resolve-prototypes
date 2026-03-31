import { useTranslation } from "react-i18next";
import { StatusAlert } from "@/components/custom/status-alert";
import { Button } from "@/components/ui/button";
import type { IngestionRun } from "@/types/dataSource";
import { credentialErrorI18nKey, isCredentialIngestionError } from "./utils";

interface IngestionErrorAlertProps {
	/** Latest ingestion run with status and error fields */
	latestRun: IngestionRun | undefined | null;
	/** Callback to trigger re-verification (switches to credential form) */
	onReVerify?: () => void;
	/** Last successful verification timestamp — suppresses stale credential errors */
	lastVerificationAt?: string | null;
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
	lastVerificationAt,
}: IngestionErrorAlertProps) {
	const { t } = useTranslation("connections");

	if (!latestRun) return null;

	// Only show for failed runs with an error message
	if (latestRun.status !== "failed" || !latestRun.error_message) return null;

	// Skip tickets_below_threshold — handled by TicketGroups component
	if (latestRun.error_message === "tickets_below_threshold") return null;

	// Credential/permission error (checks error_message code, then keyword fallback)
	if (isCredentialIngestionError(latestRun)) {
		// Suppress stale credential errors if credentials were re-verified after the failure
		if (
			lastVerificationAt &&
			latestRun.updated_at &&
			new Date(lastVerificationAt) > new Date(latestRun.updated_at)
		) {
			return null;
		}

		// When error_message is a code, show translated description; otherwise show as-is
		const i18nKey = credentialErrorI18nKey(latestRun.error_message);
		const description = i18nKey ? t(i18nKey) : latestRun.error_message;

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
				<p>{description}</p>
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
