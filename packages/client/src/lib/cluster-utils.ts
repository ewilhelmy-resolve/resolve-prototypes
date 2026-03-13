import { KB_STATUS_BADGE_STYLES } from "@/lib/constants";
import type { KBStatus } from "@/types/cluster";

/**
 * Build display title from cluster name + subcluster_name
 */
export function getClusterDisplayTitle(
	name: string,
	subclusterName: string | null,
): string {
	return subclusterName ? `${name} - ${subclusterName}` : name;
}

/**
 * Get knowledge status badge style from KB_STATUS_BADGE_STYLES
 */
export function getKnowledgeStatusBadge(kbStatus: KBStatus) {
	return KB_STATUS_BADGE_STYLES[kbStatus] ?? null;
}
