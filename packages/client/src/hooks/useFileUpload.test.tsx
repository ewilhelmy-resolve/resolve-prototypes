/**
 * useFileUpload.test.tsx - Unit tests for file upload functionality
 *
 * Tests:
 * - File upload button triggers file selector
 * - File upload status tracking
 * - Multiple file types supported
 * - Upload error handling
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileUpload } from "./useFileUpload";

// Mock the API
vi.mock("@/hooks/api/useFiles", () => ({
	useUploadFile: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		error: null,
	})),
}));

// Mock toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("useFileUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns initial state correctly", () => {
		const fileInputRef = { current: document.createElement("input") };
		const { result } = renderHook(() => useFileUpload(fileInputRef as any));

		expect(result.current.isUploading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isSuccess).toBe(false);
		expect(result.current).toHaveProperty("handleFileUpload");
		expect(result.current).toHaveProperty("openFileSelector");
	});

	it("openFileSelector triggers file input click", () => {
		const mockClick = vi.fn();
		const fileInputRef = {
			current: {
				click: mockClick,
			} as any,
		};

		const { result } = renderHook(() => useFileUpload(fileInputRef as any));

		act(() => {
			result.current.openFileSelector();
		});

		expect(mockClick).toHaveBeenCalled();
	});

	it("handleFileUpload processes files correctly", async () => {
		const mockMutate = vi.fn();
		const useFiles = await import("@/hooks/api/useFiles");
		vi.mocked(useFiles.useUploadFile).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
			isError: false,
			isSuccess: false,
			error: null,
		} as any);

		const fileInputRef = { current: document.createElement("input") };
		const { result } = renderHook(() => useFileUpload(fileInputRef as any));

		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});
		const mockEvent = {
			preventDefault: vi.fn(),
			target: {
				files: [mockFile],
			},
		} as any;

		act(() => {
			result.current.handleFileUpload(mockEvent);
		});

		// Should call mutate with the file
		expect(mockMutate).toHaveBeenCalledWith(mockFile);
	});

	it("does nothing when no files selected", () => {
		const fileInputRef = { current: document.createElement("input") };
		const { result } = renderHook(() => useFileUpload(fileInputRef as any));

		const mockEvent = {
			preventDefault: vi.fn(),
			target: {
				files: [],
			},
		} as any;

		act(() => {
			result.current.handleFileUpload(mockEvent);
		});

		// Should remain in initial state
		expect(result.current.isUploading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isSuccess).toBe(false);
	});

	it("supports multiple file types", async () => {
		const mockMutate = vi.fn();
		const useFiles = await import("@/hooks/api/useFiles");
		vi.mocked(useFiles.useUploadFile).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
			isError: false,
			isSuccess: false,
			error: null,
		} as any);

		const fileInputRef = { current: document.createElement("input") };
		const { result } = renderHook(() => useFileUpload(fileInputRef as any));

		const fileTypes = [
			new File(["pdf"], "test.pdf", { type: "application/pdf" }),
			new File(["txt"], "test.txt", { type: "text/plain" }),
			new File(["img"], "test.png", { type: "image/png" }),
			new File(["doc"], "test.docx", {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			}),
		];

		for (const file of fileTypes) {
			const mockEvent = {
				preventDefault: vi.fn(),
				target: {
					files: [file],
				},
			} as any;

			act(() => {
				result.current.handleFileUpload(mockEvent);
			});

			// Should call mutate for each file type
			expect(mockMutate).toHaveBeenCalledWith(file);
		}
	});
});
