import { ITSM_SOURCE_TYPES } from "@/constants/connectionSources";
import { useDataSources, useLatestIngestionRun } from "@/hooks/useDataSources";

/**
 * Checks if any ITSM data source has an active ingestion run (pending/running).
 * Used by ClustersPage to show loading state during ticket import.
 */
export function useIsIngesting() {
	const { data: dataSources } = useDataSources();

	const itsmConnection = dataSources?.find(
		(ds) =>
			(ITSM_SOURCE_TYPES as readonly string[]).includes(ds.type) && ds.enabled,
	);

	const { data: latestRun } = useLatestIngestionRun(itsmConnection?.id);

	const isIngesting =
		latestRun?.status === "pending" || latestRun?.status === "running";

	const isBelowThreshold =
		latestRun?.status === "failed" &&
		latestRun?.error_message === "tickets_below_threshold";

	return { isIngesting, latestRun, isBelowThreshold };
}
