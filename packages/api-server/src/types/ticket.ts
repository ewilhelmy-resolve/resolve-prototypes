/**
 * Custom fields structure for tickets (stored as JSONB)
 * Used during ingestion to track ticket eligibility for cluster assignment
 */
export interface TicketCustomFields {
	/**
	 * Whether the ticket is in a usable state for cluster assignment
	 * Set by ingestion process when evaluating ticket eligibility
	 */
	is_usable?: boolean;
	[key: string]: unknown;
}
