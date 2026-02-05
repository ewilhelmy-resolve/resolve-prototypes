import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
	describe("Rendering", () => {
		it("renders value as h3 heading", () => {
			render(<StatCard value={42} label="Total" />);
			const heading = screen.getByRole("heading", { level: 3 });
			expect(heading).toHaveTextContent("42");
		});

		it("renders label text", () => {
			render(<StatCard value={42} label="Total Documents" />);
			expect(screen.getByText("Total Documents")).toBeInTheDocument();
		});

		it("renders string value", () => {
			render(<StatCard value="N/A" label="Status" />);
			expect(screen.getByRole("heading")).toHaveTextContent("N/A");
		});

		it("renders ReactNode value", () => {
			render(
				<StatCard
					value={<span data-testid="custom-value">$1,234</span>}
					label="Revenue"
				/>,
			);
			expect(screen.getByTestId("custom-value")).toBeInTheDocument();
		});
	});

	describe("Loading state", () => {
		it("renders skeleton instead of value when loading", () => {
			const { container } = render(
				<StatCard value={42} label="Total" loading={true} />,
			);
			// Should not render the heading with value
			expect(screen.queryByRole("heading")).not.toBeInTheDocument();
			// Should render skeleton
			const skeleton = container.querySelector('[data-slot="skeleton"]');
			expect(skeleton).toBeInTheDocument();
		});

		it("still renders label when loading", () => {
			render(<StatCard value={42} label="Total Documents" loading={true} />);
			expect(screen.getByText("Total Documents")).toBeInTheDocument();
		});

		it("does not render badge when loading", () => {
			render(
				<StatCard
					value={10}
					label="Processing"
					badge={<span data-testid="badge">Active</span>}
					loading={true}
				/>,
			);
			expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
		});

		it("renders value when not loading", () => {
			render(<StatCard value={42} label="Total" loading={false} />);
			expect(screen.getByRole("heading")).toHaveTextContent("42");
		});
	});

	describe("Badge slot", () => {
		it("renders badge when provided", () => {
			render(
				<StatCard
					value={10}
					label="Processing"
					badge={<span data-testid="badge">Active</span>}
				/>,
			);
			expect(screen.getByTestId("badge")).toBeInTheDocument();
		});

		it("does not render badge wrapper when not provided", () => {
			const { container } = render(<StatCard value={10} label="Total" />);
			const valueRow = container.querySelector(".flex.items-center.gap-3");
			// Only the value heading should be rendered when no badge
			expect(valueRow?.children.length).toBe(1);
		});
	});

	describe("Styling", () => {
		it("renders as a Card component", () => {
			const { container } = render(<StatCard value={10} label="Total" />);
			const card = container.firstChild;
			expect(card).toHaveClass("border", "border-border", "bg-popover");
		});

		it("value has correct text styling", () => {
			render(<StatCard value={10} label="Total" />);
			const heading = screen.getByRole("heading");
			expect(heading).toHaveClass("text-2xl", "font-normal", "text-foreground");
		});

		it("label has muted styling", () => {
			render(<StatCard value={10} label="Total Items" />);
			const label = screen.getByText("Total Items");
			expect(label).toHaveClass("text-sm", "text-muted-foreground");
		});
	});
});
