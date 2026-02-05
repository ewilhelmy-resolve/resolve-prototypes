import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mlModelRoutes from "../mlModels.js";

// Mock MlModelService
vi.mock("../../services/MlModelService.js", () => {
	const getActiveModel = vi.fn();

	return {
		MlModelService: class MockMlModelService {
			getActiveModel = getActiveModel;
		},
	};
});

import type { Mock } from "vitest";
import { MlModelService } from "../../services/MlModelService.js";

describe("ML Models Routes", () => {
	let app: express.Application;
	let mockGetActiveModel: Mock;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		// Simulate authenticated request
		app.use((req, _res, next) => {
			(req as any).user = {
				id: "test-user-id",
				activeOrganizationId: "test-org-id",
				email: "test@example.com",
			};
			(req as any).log = {
				error: vi.fn(),
				info: vi.fn(),
			};
			next();
		});
		app.use("/api/ml-models", mlModelRoutes);

		// Get mock function from mocked service
		const serviceInstance = new MlModelService();
		mockGetActiveModel = serviceInstance.getActiveModel as Mock;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("GET /api/ml-models/active", () => {
		it("should return 200 with active model data", async () => {
			const mockModel = {
				id: "model-123",
				organization_id: "test-org-id",
				model_name: "test-model",
				external_model_id: "ext-456",
				active: true,
				metadata: { training_state: "complete" },
				training_start_date: "2025-01-01T00:00:00Z",
				training_end_date: "2025-01-02T00:00:00Z",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-02T00:00:00Z",
			};

			mockGetActiveModel.mockResolvedValueOnce(mockModel);

			const response = await request(app).get("/api/ml-models/active");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: mockModel });
		});

		it("should return 200 with null data when no active model", async () => {
			mockGetActiveModel.mockResolvedValueOnce(null);

			const response = await request(app).get("/api/ml-models/active");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: null });
		});

		it("should return model with in_progress training state", async () => {
			const mockModel = {
				id: "model-123",
				organization_id: "test-org-id",
				model_name: "training-model",
				external_model_id: "ext-456",
				active: true,
				metadata: { training_state: "in_progress" },
				training_start_date: "2025-01-27T00:00:00Z",
				training_end_date: null,
				created_at: "2025-01-27T00:00:00Z",
				updated_at: "2025-01-27T00:00:00Z",
			};

			mockGetActiveModel.mockResolvedValueOnce(mockModel);

			const response = await request(app).get("/api/ml-models/active");

			expect(response.status).toBe(200);
			expect(response.body.data.metadata.training_state).toBe("in_progress");
		});

		it("should return 500 on service error", async () => {
			mockGetActiveModel.mockRejectedValueOnce(new Error("Database error"));

			const response = await request(app).get("/api/ml-models/active");

			expect(response.status).toBe(500);
			expect(response.body).toEqual({ error: "Failed to fetch active model" });
		});
	});
});
