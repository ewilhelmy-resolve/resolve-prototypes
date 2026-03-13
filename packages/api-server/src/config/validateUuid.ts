const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a value is a well-formed UUID.
 * Used to prevent SQL injection in SET LOCAL commands where
 * parameterised queries are not supported by PostgreSQL.
 */
export function assertUuid(value: string, label: string): void {
	if (!UUID_RE.test(value)) {
		throw new Error(`Invalid ${label}: must be a valid UUID`);
	}
}
