import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useClickOutside } from "../useClickOutside";

function setup() {
	const handler = vi.fn();
	const container = document.createElement("div");
	document.body.appendChild(container);

	const { unmount } = renderHook(() => {
		const ref = useRef<HTMLDivElement>(container);
		useClickOutside(ref, handler);
	});

	return { handler, container, unmount };
}

describe("useClickOutside", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("calls handler when clicking outside the ref element", () => {
		const { handler } = setup();

		const outside = document.createElement("div");
		document.body.appendChild(outside);
		outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("does not call handler when clicking inside the ref element", () => {
		const { handler, container } = setup();

		container.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(handler).not.toHaveBeenCalled();
	});

	it("does not call handler after unmount", () => {
		const { handler, unmount } = setup();
		unmount();

		const outside = document.createElement("div");
		document.body.appendChild(outside);
		outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(handler).not.toHaveBeenCalled();
	});
});
