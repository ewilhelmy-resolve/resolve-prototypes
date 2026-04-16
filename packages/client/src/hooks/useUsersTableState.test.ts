import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUsersTableState } from "./useUsersTableState";

describe("useUsersTableState", () => {
	describe("SET_SEARCH_QUERY reducer guard", () => {
		it("does not reset page when searchQuery has not changed", () => {
			const { result } = renderHook(() => useUsersTableState());

			act(() => {
				result.current.setPage(3);
			});
			expect(result.current.page).toBe(3);

			// Dispatch setSearchQuery with the same value (empty string, the default)
			act(() => {
				result.current.setSearchQuery("");
			});

			// Page should remain 3, not reset to 0
			expect(result.current.page).toBe(3);
		});

		it("resets page to 0 when searchQuery actually changes", () => {
			const { result } = renderHook(() => useUsersTableState());

			act(() => {
				result.current.setPage(3);
			});
			expect(result.current.page).toBe(3);

			act(() => {
				result.current.setSearchQuery("alice");
			});

			expect(result.current.page).toBe(0);
			expect(result.current.searchQuery).toBe("alice");
		});
	});

	describe("setter reference stability", () => {
		it("setSearchQuery maintains stable reference across re-renders", () => {
			const { result } = renderHook(() => useUsersTableState());

			const firstRef = result.current.setSearchQuery;

			act(() => {
				result.current.setPage(1);
			});

			expect(result.current.setSearchQuery).toBe(firstRef);
		});

		it("setPage maintains stable reference across re-renders", () => {
			const { result } = renderHook(() => useUsersTableState());

			const firstRef = result.current.setPage;

			act(() => {
				result.current.setSearchInput("test");
			});

			expect(result.current.setPage).toBe(firstRef);
		});

		it("setSearchInput maintains stable reference across re-renders", () => {
			const { result } = renderHook(() => useUsersTableState());

			const firstRef = result.current.setSearchInput;

			act(() => {
				result.current.setPage(2);
			});

			expect(result.current.setSearchInput).toBe(firstRef);
		});

		it("setStatusFilter maintains stable reference across re-renders", () => {
			const { result } = renderHook(() => useUsersTableState());

			const firstRef = result.current.setStatusFilter;

			act(() => {
				result.current.setPage(1);
			});

			expect(result.current.setStatusFilter).toBe(firstRef);
		});
	});

	describe("pagination with debounce interaction", () => {
		it("page is preserved when setSearchQuery is called with unchanged value after setPage", () => {
			const { result } = renderHook(() => useUsersTableState());

			act(() => {
				result.current.setPage(1);
			});
			expect(result.current.page).toBe(1);

			// Simulates the debounce firing with same empty query
			act(() => {
				result.current.setSearchQuery("");
			});

			expect(result.current.page).toBe(1);
		});

		it("page is preserved across multiple navigations with no-op search dispatches", () => {
			const { result } = renderHook(() => useUsersTableState());

			act(() => {
				result.current.setPage(2);
			});
			expect(result.current.page).toBe(2);

			act(() => {
				result.current.setSearchQuery("");
			});
			expect(result.current.page).toBe(2);

			act(() => {
				result.current.setPage(3);
			});
			expect(result.current.page).toBe(3);

			act(() => {
				result.current.setSearchQuery("");
			});
			expect(result.current.page).toBe(3);
		});
	});
});
