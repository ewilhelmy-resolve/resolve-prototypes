import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing route
vi.mock("../../config/logger.js", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../docs/openapi.js", async () => {
	const { extendZodWithOpenApi } = await import(
		"@asteasolutions/zod-to-openapi"
	);
	const { z } = await import("zod");
	extendZodWithOpenApi(z);
	return {
		z,
		registry: { registerPath: vi.fn(), register: vi.fn() },
	};
});

vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((_req, _res, next) => next()),
}));

vi.mock("../../repositories/AuthRepository.js", () => ({
	authRepository: {
		getUserByEmail: vi.fn(),
		pendingUserExistsByEmail: vi.fn(),
		deletePendingUserByEmail: vi.fn(),
		createPendingUser: vi.fn(),
	},
}));

vi.mock("../../services/sessionService.js", () => ({
	getSessionService: vi.fn(() => ({
		createSession: vi.fn(),
		getSession: vi.fn(),
		destroySession: vi.fn(),
		destroyAllUserSessions: vi.fn(),
	})),
}));

vi.mock("../../services/WebhookService.js", () => ({
	WebhookService: class {
		sendGenericEvent = vi.fn().mockResolvedValue({ ok: true });
	},
}));

import authRoutes from "../auth.js";

describe("POST /auth/signup - validation", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/auth", authRoutes);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should reject invalid email with structured Zod error details", async () => {
		const response = await request(app).post("/auth/signup").send({
			firstName: "John",
			lastName: "Doe",
			email: "not-an-email",
			company: "Acme",
			password: "secret123",
		});

		expect(response.status).toBe(400);
		// Bug: manual validation returns { error: string } instead of structured Zod details
		expect(response.body).toHaveProperty("details");
		expect(response.body.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.arrayContaining(["email"]),
				}),
			]),
		);
	});

	it("should reject missing fields with structured Zod error details", async () => {
		const response = await request(app).post("/auth/signup").send({
			firstName: "John",
			// missing lastName, email, company, password
		});

		expect(response.status).toBe(400);
		// Bug: manual validation returns a flat string error, not field-level details
		expect(response.body).toHaveProperty("details");
	});

	it("should use SignupRequestSchema and validate tosAcceptedAt format", async () => {
		const response = await request(app).post("/auth/signup").send({
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			company: "Acme",
			password: "secret123",
			tosAcceptedAt: "not-a-datetime",
		});

		expect(response.status).toBe(400);
		// Bug: manual validation ignores tosAcceptedAt entirely — no format check
		expect(response.body).toHaveProperty("details");
		expect(response.body.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.arrayContaining(["tosAcceptedAt"]),
				}),
			]),
		);
	});
});
