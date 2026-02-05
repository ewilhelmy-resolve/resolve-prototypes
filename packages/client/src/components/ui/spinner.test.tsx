import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./spinner";

describe("Spinner", () => {
	it("renders with status role", () => {
		render(<Spinner />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has Loading aria-label", () => {
		render(<Spinner />);
		expect(screen.getByLabelText("states.loading")).toBeInTheDocument();
	});

	it("applies default size class", () => {
		render(<Spinner data-testid="spinner" />);
		const spinner = screen.getByTestId("spinner");
		expect(spinner).toHaveClass("size-4");
	});

	it("applies custom className", () => {
		render(<Spinner className="size-8 text-blue-500" data-testid="spinner" />);
		const spinner = screen.getByTestId("spinner");
		expect(spinner).toHaveClass("size-8", "text-blue-500");
	});

	it("has animate-spin class", () => {
		render(<Spinner data-testid="spinner" />);
		const spinner = screen.getByTestId("spinner");
		expect(spinner).toHaveClass("animate-spin");
	});

	it("forwards additional props", () => {
		render(<Spinner data-testid="spinner" aria-hidden="true" />);
		const spinner = screen.getByTestId("spinner");
		expect(spinner).toHaveAttribute("aria-hidden", "true");
	});
});
