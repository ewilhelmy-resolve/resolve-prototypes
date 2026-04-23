import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import { AgenticService } from "../AgenticService.js";

describe("AgenticService.assertAgentOrg", () => {
	let service: AgenticService;

	beforeEach(() => {
		service = new AgenticService();
		vi.clearAllMocks();
	});

	it("returns agent when tenant matches orgId", async () => {
		const agent = { eid: "eid-1", name: "Bot", tenant: "org-A" };
		vi.spyOn(service, "getAgent").mockResolvedValue(agent as any);

		const result = await service.assertAgentOrg("eid-1", "org-A");

		expect(result).toEqual(agent);
	});

	it("throws 404 when tenant does not match orgId", async () => {
		const agent = { eid: "eid-1", name: "Bot", tenant: "org-B" };
		vi.spyOn(service, "getAgent").mockResolvedValue(agent as any);

		await expect(
			service.assertAgentOrg("eid-1", "org-A"),
		).rejects.toMatchObject({ response: { status: 404 } });
	});

	it("throws 404 when tenant is null (legacy agent)", async () => {
		const agent = { eid: "eid-1", name: "Bot", tenant: null };
		vi.spyOn(service, "getAgent").mockResolvedValue(agent as any);

		await expect(
			service.assertAgentOrg("eid-1", "org-A"),
		).rejects.toMatchObject({ response: { status: 404 } });
	});

	it("propagates upstream 404 from getAgent", async () => {
		const axiosError: any = new Error("Not Found");
		axiosError.response = { status: 404 };
		vi.spyOn(service, "getAgent").mockRejectedValue(axiosError);

		await expect(
			service.assertAgentOrg("eid-1", "org-A"),
		).rejects.toMatchObject({ response: { status: 404 } });
	});
});
