import { beforeEach, describe, expect, it, vi } from "vitest";
import { MlModelService } from "../MlModelService.js";

// Mock Kysely db
const mockExecuteTakeFirst = vi.fn();
vi.mock("../../config/kysely.js", () => ({
	db: {
		selectFrom: () => ({
			select: () => ({
				where: () => ({
					where: () => ({
						limit: () => ({
							executeTakeFirst: mockExecuteTakeFirst,
						}),
					}),
				}),
			}),
		}),
	},
}));

describe("MlModelService", () => {
	let mlModelService: MlModelService;

	beforeEach(() => {
		vi.clearAllMocks();
		mlModelService = new MlModelService();
	});

	describe("getActiveModel", () => {
		const organizationId = "org-123";

		it("should return active model when found", async () => {
			const mockModel = {
				id: "model-456",
				organization_id: organizationId,
				model_name: "test-model",
				external_model_id: "ext-789",
				active: true,
				metadata: { training_state: "complete" },
				training_start_date: new Date("2025-01-01"),
				training_end_date: new Date("2025-01-02"),
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockExecuteTakeFirst.mockResolvedValueOnce(mockModel);

			const result = await mlModelService.getActiveModel(organizationId);

			expect(result).toEqual(mockModel);
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});

		it("should return null when no active model exists", async () => {
			mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

			const result = await mlModelService.getActiveModel(organizationId);

			expect(result).toBeNull();
		});

		it("should return model with in_progress training state", async () => {
			const mockModel = {
				id: "model-456",
				organization_id: organizationId,
				model_name: "training-model",
				external_model_id: "ext-789",
				active: true,
				metadata: { training_state: "in_progress" },
				training_start_date: new Date(),
				training_end_date: null,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockExecuteTakeFirst.mockResolvedValueOnce(mockModel);

			const result = await mlModelService.getActiveModel(organizationId);

			expect(result?.metadata?.training_state).toBe("in_progress");
		});

		it("should return model with null metadata", async () => {
			const mockModel = {
				id: "model-456",
				organization_id: organizationId,
				model_name: "legacy-model",
				external_model_id: "ext-789",
				active: true,
				metadata: null,
				training_start_date: null,
				training_end_date: null,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockExecuteTakeFirst.mockResolvedValueOnce(mockModel);

			const result = await mlModelService.getActiveModel(organizationId);

			expect(result?.metadata).toBeNull();
		});
	});
});
