import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	shareApi: {
		enable: vi.fn(),
		disable: vi.fn(),
		enableFromSession: vi.fn(),
		disableFromSession: vi.fn(),
	},
}));

import { shareApi } from "@/services/api";
import {
	useDisableShare,
	useDisableShareFromSession,
	useEnableShare,
	useEnableShareFromSession,
} from "./useShareConversation";

const mockedShareApi = vi.mocked(shareApi);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("useEnableShare", () => {
	beforeEach(() => vi.clearAllMocks());

	it("calls shareApi.enable with conversationId and returns response", async () => {
		const response = {
			shareUrl: "https://app.test/share/abc123",
			shareId: "abc123",
		};
		mockedShareApi.enable.mockResolvedValueOnce(response);

		const { result } = renderHook(() => useEnableShare(), {
			wrapper: createWrapper(),
		});

		let data: any;
		await act(async () => {
			data = await result.current.mutateAsync("conv-1");
		});

		expect(mockedShareApi.enable).toHaveBeenCalledWith("conv-1");
		expect(data).toEqual(response);
	});

	it("propagates error on failure", async () => {
		mockedShareApi.enable.mockRejectedValueOnce(new Error("forbidden"));

		const { result } = renderHook(() => useEnableShare(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync("conv-1");
			} catch {
				// expected
			}
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error);
		});
		expect((result.current.error as Error).message).toBe("forbidden");
	});
});

describe("useDisableShare", () => {
	beforeEach(() => vi.clearAllMocks());

	it("calls shareApi.disable with conversationId and returns response", async () => {
		const response = { success: true as const };
		mockedShareApi.disable.mockResolvedValueOnce(response);

		const { result } = renderHook(() => useDisableShare(), {
			wrapper: createWrapper(),
		});

		let data: any;
		await act(async () => {
			data = await result.current.mutateAsync("conv-2");
		});

		expect(mockedShareApi.disable).toHaveBeenCalledWith("conv-2");
		expect(data).toEqual({ success: true });
	});

	it("propagates error on failure", async () => {
		mockedShareApi.disable.mockRejectedValueOnce(new Error("not found"));

		const { result } = renderHook(() => useDisableShare(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync("conv-2");
			} catch {
				// expected
			}
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error);
		});
		expect((result.current.error as Error).message).toBe("not found");
	});
});

describe("useEnableShareFromSession", () => {
	beforeEach(() => vi.clearAllMocks());

	it("calls shareApi.enableFromSession with sessionKey and returns response", async () => {
		const response = {
			shareUrl: "https://app.test/share/session-abc",
			shareId: "session-abc",
		};
		mockedShareApi.enableFromSession.mockResolvedValueOnce(response);

		const { result } = renderHook(() => useEnableShareFromSession(), {
			wrapper: createWrapper(),
		});

		let data: any;
		await act(async () => {
			data = await result.current.mutateAsync("valkey-key-1");
		});

		expect(mockedShareApi.enableFromSession).toHaveBeenCalledWith(
			"valkey-key-1",
		);
		expect(data).toEqual(response);
	});

	it("propagates error on failure", async () => {
		mockedShareApi.enableFromSession.mockRejectedValueOnce(
			new Error("session expired"),
		);

		const { result } = renderHook(() => useEnableShareFromSession(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync("valkey-key-1");
			} catch {
				// expected
			}
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error);
		});
		expect((result.current.error as Error).message).toBe("session expired");
	});
});

describe("useDisableShareFromSession", () => {
	beforeEach(() => vi.clearAllMocks());

	it("calls shareApi.disableFromSession with sessionKey and returns response", async () => {
		const response = { success: true as const };
		mockedShareApi.disableFromSession.mockResolvedValueOnce(response);

		const { result } = renderHook(() => useDisableShareFromSession(), {
			wrapper: createWrapper(),
		});

		let data: any;
		await act(async () => {
			data = await result.current.mutateAsync("valkey-key-2");
		});

		expect(mockedShareApi.disableFromSession).toHaveBeenCalledWith(
			"valkey-key-2",
		);
		expect(data).toEqual({ success: true });
	});

	it("propagates error on failure", async () => {
		mockedShareApi.disableFromSession.mockRejectedValueOnce(
			new Error("bad session"),
		);

		const { result } = renderHook(() => useDisableShareFromSession(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync("valkey-key-2");
			} catch {
				// expected
			}
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error);
		});
		expect((result.current.error as Error).message).toBe("bad session");
	});
});
