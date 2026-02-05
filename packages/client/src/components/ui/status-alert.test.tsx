import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusAlert, InfoAlert } from "./status-alert";

describe("StatusAlert", () => {
	describe("Rendering", () => {
		it("renders children content", () => {
			render(<StatusAlert>Alert content</StatusAlert>);
			expect(screen.getByText("Alert content")).toBeInTheDocument();
		});

		it("renders title when provided", () => {
			render(<StatusAlert title="Alert Title">Content</StatusAlert>);
			expect(screen.getByText("Alert Title")).toBeInTheDocument();
		});

		it("renders as alert role", () => {
			render(<StatusAlert>Content</StatusAlert>);
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	describe("Variants", () => {
		it("renders info variant with blue styling", () => {
			render(<StatusAlert variant="info">Info message</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass("bg-blue-50", "border-blue-200", "text-blue-900");
		});

		it("renders warning variant with amber styling", () => {
			render(<StatusAlert variant="warning">Warning message</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass(
				"bg-amber-50",
				"border-amber-200",
				"text-amber-900"
			);
		});

		it("renders error variant with red styling", () => {
			render(<StatusAlert variant="error">Error message</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass("bg-red-50", "border-red-200", "text-red-900");
		});

		it("renders success variant with green styling", () => {
			render(<StatusAlert variant="success">Success message</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass(
				"bg-green-50",
				"border-green-200",
				"text-green-900"
			);
		});

		it("defaults to info variant", () => {
			render(<StatusAlert>Default message</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass("bg-blue-50");
		});
	});

	describe("Props", () => {
		it("applies custom className", () => {
			render(<StatusAlert className="custom-class">Content</StatusAlert>);
			const alert = screen.getByRole("alert");
			expect(alert).toHaveClass("custom-class");
		});

		it("renders icon with custom size", () => {
			render(<StatusAlert iconSize="size-6">Content</StatusAlert>);
			const icon = screen.getByRole("alert").querySelector("svg");
			expect(icon).toHaveClass("size-6");
		});
	});

	describe("Rich content", () => {
		it("renders complex children", () => {
			render(
				<StatusAlert>
					<ul>
						<li>Item 1</li>
						<li>Item 2</li>
					</ul>
				</StatusAlert>
			);
			expect(screen.getByText("Item 1")).toBeInTheDocument();
			expect(screen.getByText("Item 2")).toBeInTheDocument();
		});
	});
});

describe("InfoAlert (deprecated)", () => {
	it("renders as info variant StatusAlert", () => {
		render(<InfoAlert>Info content</InfoAlert>);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveClass("bg-blue-50");
	});

	it("passes className prop", () => {
		render(<InfoAlert className="test-class">Content</InfoAlert>);
		expect(screen.getByRole("alert")).toHaveClass("test-class");
	});
});
