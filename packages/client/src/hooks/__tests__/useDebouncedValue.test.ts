import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../useDebouncedValue";

describe("useDebouncedValue", () => {
	it("returns initial value immediately", () => {
		const { result } = renderHook(() => useDebouncedValue("hello", 300));
		expect(result.current).toBe("hello");
	});

	it("does not update immediately on value change", () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: "hello" } },
		);

		rerender({ value: "world" });
		expect(result.current).toBe("hello");
	});

	it("updates after the debounce delay", () => {
		vi.useFakeTimers();
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: "hello" } },
		);

		rerender({ value: "world" });
		expect(result.current).toBe("hello");

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(result.current).toBe("world");

		vi.useRealTimers();
	});

	it("resets timer on rapid changes", () => {
		vi.useFakeTimers();
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: "a" } },
		);

		rerender({ value: "ab" });
		act(() => {
			vi.advanceTimersByTime(200);
		});

		rerender({ value: "abc" });
		act(() => {
			vi.advanceTimersByTime(200);
		});
		// Only 200ms since last change — not yet
		expect(result.current).toBe("a");

		act(() => {
			vi.advanceTimersByTime(100);
		});
		// Now 300ms since last change
		expect(result.current).toBe("abc");

		vi.useRealTimers();
	});
});
