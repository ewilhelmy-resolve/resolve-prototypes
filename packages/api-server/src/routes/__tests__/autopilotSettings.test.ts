import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock AutopilotSettingsService
vi.mock("../../services/AutopilotSettingsService.js", () => {
	const getOrCreate = vi.fn();
	const update = vi.fn();

	return {
		AutopilotSettingsService: class MockService {
			getOrCreate = getOrCreate;
			update = update;
		},
	};
});

// Mock kysely db for audit log
vi.mock("../../config/kysely.js", () => {
	const execute = vi.fn().mockResolvedValue(undefined);
	const values = vi.fn().mockReturnValue({ execute });
	const insertInto = vi.fn().mockReturnValue({ values });

	return {
		db: { insertInto },
	};
});

// Mock requireRole to pass through for most tests
vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((_req: any, _res: any, next: any) => next()),
	requireRole: (roles: string[]) => {
		return (req: any, res: any, next: any) => {
			const role = req.user?.role ?? "admin";
			if (!roles.includes(role)) {
				return res.status(403).json({
					error: `Permission denied. Required role: ${roles.join(" or ")}`,
					code: "INSUFFICIENT_PERMISSIONS",
				});
			}
			next();
		};
	},
}));

import type { Mock } from "vitest";
import { AutopilotSettingsService } from "../../services/AutopilotSettingsService.js";
import autopilotSettingsRoutes from "../autopilotSettings.js";

const mockSettings = {
	id: "settings-123",
	organization_id: "test-org-id",
	cost_per_ticket: 30,
	avg_time_per_ticket_minutes: 12,
	updated_by: null,
	created_at: new Date("2025-01-01"),
	updated_at: new Date("2025-01-01"),
};

describe("Autopilot Settings Routes", () => {
	let app: express.Application;
	let mockGetOrCreate: Mock;
	let mockUpdate: Mock;

	function createApp(userOverrides: Record<string, unknown> = {}) {
		const a = express();
		a.use(express.json());
		a.use((req, _res, next) => {
			(req as any).user = {
				id: "test-user-id",
				activeOrganizationId: "test-org-id",
				email: "test@example.com",
				role: "admin",
				...userOverrides,
			};
			(req as any).log = {
				error: vi.fn(),
				info: vi.fn(),
			};
			next();
		});
		a.use("/api/autopilot-settings", autopilotSettingsRoutes);
		return a;
	}

	beforeEach(() => {
		app = createApp();
		const serviceInstance = new AutopilotSettingsService();
		mockGetOrCreate = serviceInstance.getOrCreate as Mock;
		mockUpdate = serviceInstance.update as Mock;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ========================================================================
	// GET /api/autopilot-settings
	// ========================================================================

	describe("GET /api/autopilot-settings", () => {
		it("should return 200 with settings", async () => {
			mockGetOrCreate.mockResolvedValueOnce(mockSettings);

			const response = await request(app).get("/api/autopilot-settings");

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				id: "settings-123",
				cost_per_ticket: 30,
				avg_time_per_ticket_minutes: 12,
			});
			expect(mockGetOrCreate).toHaveBeenCalledWith("test-org-id");
		});

		it("should return 500 on service error", async () => {
			mockGetOrCreate.mockRejectedValueOnce(new Error("DB error"));

			const response = await request(app).get("/api/autopilot-settings");

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Failed to fetch autopilot settings");
		});
	});

	// ========================================================================
	// PATCH /api/autopilot-settings
	// ========================================================================

	describe("PATCH /api/autopilot-settings", () => {
		it("should return 200 on valid update", async () => {
			mockGetOrCreate.mockResolvedValueOnce(mockSettings);
			const updated = {
				...mockSettings,
				cost_per_ticket: 50,
				updated_by: "test-user-id",
			};
			mockUpdate.mockResolvedValueOnce(updated);

			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({ cost_per_ticket: 50 });

			expect(response.status).toBe(200);
			expect(response.body.data.cost_per_ticket).toBe(50);
			expect(mockUpdate).toHaveBeenCalledWith(
				"test-org-id",
				{ cost_per_ticket: 50 },
				"test-user-id",
			);
		});

		it("should return 200 when updating both fields", async () => {
			mockGetOrCreate.mockResolvedValueOnce(mockSettings);
			const updated = {
				...mockSettings,
				cost_per_ticket: 45,
				avg_time_per_ticket_minutes: 20,
				updated_by: "test-user-id",
			};
			mockUpdate.mockResolvedValueOnce(updated);

			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({ cost_per_ticket: 45, avg_time_per_ticket_minutes: 20 });

			expect(response.status).toBe(200);
			expect(response.body.data.cost_per_ticket).toBe(45);
			expect(response.body.data.avg_time_per_ticket_minutes).toBe(20);
		});

		it("should return 400 on empty body", async () => {
			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Validation error");
		});

		it("should return 400 on negative cost", async () => {
			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({ cost_per_ticket: -5 });

			expect(response.status).toBe(400);
		});

		it("should return 400 on zero time", async () => {
			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({ avg_time_per_ticket_minutes: 0 });

			expect(response.status).toBe(400);
		});

		it("should return 403 for non-admin user", async () => {
			const memberApp = createApp({ role: "member" });

			const response = await request(memberApp)
				.patch("/api/autopilot-settings")
				.send({ cost_per_ticket: 50 });

			expect(response.status).toBe(403);
		});

		it("should return 500 on service error", async () => {
			mockGetOrCreate.mockResolvedValueOnce(mockSettings);
			mockUpdate.mockRejectedValueOnce(new Error("DB error"));

			const response = await request(app)
				.patch("/api/autopilot-settings")
				.send({ cost_per_ticket: 50 });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Failed to update autopilot settings");
		});
	});
});
