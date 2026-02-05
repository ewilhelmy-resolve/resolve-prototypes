import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatGroup } from "./StatGroup";

describe("StatGroup", () => {
	it("renders children", () => {
		render(
			<StatGroup>
				<div data-testid="child-1">Child 1</div>
				<div data-testid="child-2">Child 2</div>
			</StatGroup>
		);
		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
	});

	it("renders as a grid container", () => {
		const { container } = render(
			<StatGroup>
				<div>Child</div>
			</StatGroup>
		);
		const grid = container.firstChild;
		expect(grid).toHaveClass("grid");
	});

	it("has responsive column classes", () => {
		const { container } = render(
			<StatGroup>
				<div>Child</div>
			</StatGroup>
		);
		const grid = container.firstChild;
		expect(grid).toHaveClass("grid-cols-1", "lg:grid-cols-4");
	});

	it("has gap between items", () => {
		const { container } = render(
			<StatGroup>
				<div>Child</div>
			</StatGroup>
		);
		const grid = container.firstChild;
		expect(grid).toHaveClass("gap-4");
	});

	it("renders multiple StatCard children", () => {
		render(
			<StatGroup>
				<div>Card 1</div>
				<div>Card 2</div>
				<div>Card 3</div>
				<div>Card 4</div>
			</StatGroup>
		);
		expect(screen.getByText("Card 1")).toBeInTheDocument();
		expect(screen.getByText("Card 2")).toBeInTheDocument();
		expect(screen.getByText("Card 3")).toBeInTheDocument();
		expect(screen.getByText("Card 4")).toBeInTheDocument();
	});
});
