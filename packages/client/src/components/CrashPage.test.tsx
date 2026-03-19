import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CrashPage } from "./CrashPage";

describe("CrashPage", () => {
	const defaultProps = {
		title: "Something went wrong",
		description: "An unexpected error occurred. Please try again.",
		actionLabel: "Go Back",
		onAction: vi.fn(),
	};

	it("renders title, description, and action button", () => {
		render(<CrashPage {...defaultProps} />);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(
			screen.getByText("An unexpected error occurred. Please try again."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Go Back" })).toBeInTheDocument();
	});

	it("calls onAction when action button clicked", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		render(<CrashPage {...defaultProps} onAction={onAction} />);
		await user.click(screen.getByRole("button", { name: "Go Back" }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("renders refresh button when onRefresh prop provided", () => {
		render(<CrashPage {...defaultProps} onRefresh={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: "Try Again" }),
		).toBeInTheDocument();
	});

	it("calls onRefresh when refresh button clicked", async () => {
		const user = userEvent.setup();
		const onRefresh = vi.fn();
		render(<CrashPage {...defaultProps} onRefresh={onRefresh} />);
		await user.click(screen.getByRole("button", { name: "Try Again" }));
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it("does NOT render refresh button when onRefresh not provided", () => {
		render(<CrashPage {...defaultProps} />);
		expect(
			screen.queryByRole("button", { name: "Try Again" }),
		).not.toBeInTheDocument();
	});
});
