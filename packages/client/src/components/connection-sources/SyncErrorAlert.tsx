import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import type { DataSourceConnection } from "@/types/dataSource";

interface SyncErrorAlertProps {
	/** Backend data source connection with sync status fields */
	backendData: DataSourceConnection | undefined;
	/** Callback to trigger re-verification (switches to credential form) */
	onReVerify?: () => void;
}

/**
 * Check if error message indicates a credential/permission issue
 */
function isCredentialError(error: string): boolean {
	const lower = error.toLowerCase();
	return lower.includes("authentication") || lower.includes("permission");
}

/**
 * SyncErrorAlert - Inline alert for data source sync errors and warnings
 *
 * Shows contextual alerts based on last_sync_status and last_sync_error:
 * - Credential/permission failure: error alert with "Re-verify credentials" action
 * - Generic sync failure: error alert with error message
 * - Zero-document warning: warning alert when sync completed but found nothing
 */
export function SyncErrorAlert({
	backendData,
	onReVerify,
}: SyncErrorAlertProps) {
	const { t } = useTranslation("connections");

	if (!backendData) return null;

	const { last_sync_status, last_sync_error, status } = backendData;

	// Don't show alerts while actively syncing or verifying
	if (status === "syncing" || status === "verifying") return null;

	// No error to display
	if (!last_sync_error) return null;

	// Case 1: Sync failed with credential/permission error
	if (last_sync_status === "failed" && isCredentialError(last_sync_error)) {
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
				<p>{last_sync_error}</p>
			</StatusAlert>
		);
	}

	// Case 2: Generic sync failure
	if (last_sync_status === "failed") {
		return (
			<StatusAlert variant="error" title={t("syncError.syncFailedTitle")}>
				<p>{last_sync_error}</p>
			</StatusAlert>
		);
	}

	// Case 3: Sync completed but no documents found
	if (
		last_sync_status === "completed" &&
		last_sync_error === "warning:no_documents_found"
	) {
		return (
			<StatusAlert variant="warning" title={t("syncError.noDocumentsTitle")}>
				<p>{t("syncError.noDocumentsDescription")}</p>
			</StatusAlert>
		);
	}

	return null;
}
