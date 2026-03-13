/**
 * CLIEN-61: SQL Injection in RLS SET commands
 *
 * Validates that withOrgContext and withKyselyOrgContext reject
 * non-UUID values to prevent SQL injection via SET LOCAL.
 */

import { describe, expect, it } from "vitest";
import { assertUuid } from "../validateUuid.js";

describe("assertUuid – RLS injection guard", () => {
	const valid = [
		"550e8400-e29b-41d4-a716-446655440000",
		"00000000-0000-0000-0000-000000000000",
		"FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
	];

	for (const uuid of valid) {
		it(`accepts valid UUID: ${uuid}`, () => {
			expect(() => assertUuid(uuid, "userId")).not.toThrow();
		});
	}

	const injections = [
		// Classic SQL injection payloads
		"'; DROP TABLE users; --",
		"' OR '1'='1",
		"a]); DROP TABLE rag_conversations;--",
		// Almost-UUID with trailing injection
		"550e8400-e29b-41d4-a716-446655440000'; --",
		// Empty / whitespace
		"",
		" ",
		// Non-hex chars in UUID positions
		"zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
		// Missing segments
		"550e8400-e29b-41d4",
		// Extra chars
		"550e8400-e29b-41d4-a716-446655440000-extra",
	];

	for (const payload of injections) {
		it(`rejects injection payload: ${JSON.stringify(payload)}`, () => {
			expect(() => assertUuid(payload, "userId")).toThrow(
				"Invalid userId: must be a valid UUID",
			);
		});
	}
});
