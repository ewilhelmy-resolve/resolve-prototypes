import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerMock } = vi.hoisted(() => ({
	loggerMock: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock("../../config/logger.js", () => ({
	logger: loggerMock,
}));

import { AgenticService } from "../AgenticService.js";

function makeAxiosError(status: number): Error & Record<string, unknown> {
	const err = new Error(`HTTP ${status}`) as Error & Record<string, unknown>;
	err.isAxiosError = true;
	const config = {
		url: "/agents/metadata/name/Foo",
		method: "get",
		baseURL: "https://llm-service-staging.resolve.io",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": "secret-api-key-value",
			"X-DB-Tenant": "secret-tenant-value",
			Authorization: "Bearer secret-bearer-token",
		},
	};
	err.config = config;
	err.response = { status, statusText: "Bad Gateway", config, data: null };
	return err;
}

function serializeCalls(calls: unknown[][]): string {
	// Include non-enumerable Error props (name/message/stack) explicitly —
	// JSON.stringify skips them otherwise, which would falsely pass tests.
	return JSON.stringify(calls, (_, v) => {
		if (v instanceof Error) {
			return {
				...v,
				name: v.name,
				message: v.message,
				stack: v.stack,
			};
		}
		return v;
	});
}

describe("AgenticService sensitive header redaction", () => {
	let service: AgenticService;

	beforeEach(() => {
		service = new AgenticService();
		vi.clearAllMocks();
	});

	it("redacts X-API-Key / X-DB-Tenant / Authorization from logged errors in getAgentByName", async () => {
		const axiosError = makeAxiosError(502);
		vi.spyOn(
			(service as unknown as { client: { get: () => unknown } }).client,
			"get",
		).mockRejectedValueOnce(axiosError);

		await expect(service.getAgentByName("Foo")).rejects.toBe(axiosError);

		const serialized = serializeCalls(loggerMock.error.mock.calls);
		expect(serialized).not.toContain("secret-api-key-value");
		expect(serialized).not.toContain("secret-tenant-value");
		expect(serialized).not.toContain("secret-bearer-token");
	});

	it("redacts sensitive headers from logged errors in getAgent", async () => {
		const axiosError = makeAxiosError(500);
		vi.spyOn(
			(service as unknown as { client: { get: () => unknown } }).client,
			"get",
		).mockRejectedValueOnce(axiosError);

		await expect(service.getAgent("eid-1")).rejects.toBe(axiosError);

		const serialized = serializeCalls(loggerMock.error.mock.calls);
		expect(serialized).not.toContain("secret-api-key-value");
		expect(serialized).not.toContain("secret-tenant-value");
		expect(serialized).not.toContain("secret-bearer-token");
	});

	it("still rethrows the original axios error unchanged so callers can branch on status", async () => {
		const axiosError = makeAxiosError(500);
		vi.spyOn(
			(service as unknown as { client: { get: () => unknown } }).client,
			"get",
		).mockRejectedValueOnce(axiosError);

		await expect(service.getAgent("eid-1")).rejects.toBe(axiosError);
		// Original error object must be untouched — mutating it would break the
		// 404 branch in callers like getAgentByName / getToolByName.
		expect(
			(axiosError.config as { headers: Record<string, string> }).headers[
				"X-API-Key"
			],
		).toBe("secret-api-key-value");
	});

	it("returns null (does not log) on 404 — sanity check the short-circuit still works", async () => {
		const axiosError = makeAxiosError(404);
		vi.spyOn(
			(service as unknown as { client: { get: () => unknown } }).client,
			"get",
		).mockRejectedValueOnce(axiosError);

		const result = await service.getAgentByName("Missing");
		expect(result).toBeNull();
		expect(loggerMock.error).not.toHaveBeenCalled();
	});
});
