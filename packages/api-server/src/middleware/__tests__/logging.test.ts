import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// pino-http needs a real-ish logger with .levels; mock the whole module to avoid it
vi.mock("pino-http", () => ({ default: vi.fn(() => vi.fn()) }));

vi.mock("../../config/logger.js", () => ({
	createContextLogger: vi.fn(),
	generateCorrelationId: vi.fn(() => "test-corr-id"),
	logger: { child: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { createContextLogger } from "../../config/logger.js";
import { addUserContextToLogs, errorLoggingMiddleware } from "../logging.js";

describe("addUserContextToLogs – email PII", () => {
	const mockChildInfo = vi.fn();
	const mockChildLogger = {
		info: mockChildInfo,
		error: vi.fn(),
		bindings: vi.fn(() => ({})),
	};

	const makeReq = () => ({
		log: {
			bindings: vi.fn(() => ({ reqId: "req-1" })),
			info: vi.fn(),
		},
		user: {
			id: "user-1",
			activeOrganizationId: "org-1",
			email: "user@example.com",
		},
	});

	beforeEach(() => {
		vi.mocked(createContextLogger).mockReturnValue(mockChildLogger as any);
		vi.clearAllMocks();
		vi.mocked(createContextLogger).mockReturnValue(mockChildLogger as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("does NOT include email in createContextLogger call in production", () => {
		const orig = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const req = makeReq() as any;
			addUserContextToLogs(req, {} as any, vi.fn());

			expect(createContextLogger).toHaveBeenCalledWith(
				expect.anything(),
				"req-1",
				expect.not.objectContaining({ email: expect.any(String) }),
			);
		} finally {
			process.env.NODE_ENV = orig;
		}
	});

	it("does NOT log userEmail in 'User authenticated' info call in production", () => {
		const orig = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const req = makeReq() as any;
			addUserContextToLogs(req, {} as any, vi.fn());

			expect(mockChildInfo).not.toHaveBeenCalledWith(
				expect.objectContaining({ userEmail: expect.any(String) }),
				expect.any(String),
			);
		} finally {
			process.env.NODE_ENV = orig;
		}
	});

	it("includes email in createContextLogger call in development", () => {
		const orig = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";
		try {
			const req = makeReq() as any;
			addUserContextToLogs(req, {} as any, vi.fn());

			expect(createContextLogger).toHaveBeenCalledWith(
				expect.anything(),
				"req-1",
				expect.objectContaining({ email: "user@example.com" }),
			);
		} finally {
			process.env.NODE_ENV = orig;
		}
	});

	it("calls next()", () => {
		const req = makeReq() as any;
		const next = vi.fn();
		addUserContextToLogs(req, {} as any, next);
		expect(next).toHaveBeenCalled();
	});
});

describe("errorLoggingMiddleware – email PII", () => {
	afterEach(() => vi.restoreAllMocks());

	it("does NOT include userEmail in error context in production", () => {
		const orig = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const mockError = vi.fn();
			const req = {
				log: { error: mockError, bindings: vi.fn(() => ({})) },
				method: "GET",
				url: "/test",
				params: {},
				query: {},
				headers: {},
				body: undefined,
				user: {
					id: "user-1",
					activeOrganizationId: "org-1",
					email: "user@example.com",
				},
			} as any;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
				statusCode: 500,
			} as any;

			errorLoggingMiddleware(new Error("test error"), req, res, vi.fn());

			expect(mockError).toHaveBeenCalledWith(
				expect.not.objectContaining({
					user: expect.objectContaining({
						userEmail: expect.any(String),
					}),
				}),
				expect.any(String),
			);
		} finally {
			process.env.NODE_ENV = orig;
		}
	});
});
