import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
	if (shouldThrow) {
		throw new Error("Test error");
	}
	return <div>Child content</div>;
}

// Wrapper that allows toggling shouldThrow to test reset
function ToggleThrow() {
	const [shouldThrow, setShouldThrow] = useState(true);
	return (
		<ErrorBoundary
			fallback={(_error, reset) => (
				<button
					type="button"
					onClick={() => {
						setShouldThrow(false);
						reset();
					}}
				>
					Try Again
				</button>
			)}
		>
			<ThrowingComponent shouldThrow={shouldThrow} />
		</ErrorBoundary>
	);
}

describe("ErrorBoundary", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("renders children when no error thrown", () => {
		render(
			<ErrorBoundary>
				<div>Child content</div>
			</ErrorBoundary>,
		);
		expect(screen.getByText("Child content")).toBeInTheDocument();
	});

	it("catches render errors and shows default fallback", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Try Again" }),
		).toBeInTheDocument();
	});

	it("accepts custom fallback as ReactNode", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<ErrorBoundary fallback={<div>Custom error UI</div>}>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText("Custom error UI")).toBeInTheDocument();
	});

	it("accepts fallback as render function receiving error and reset", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<ErrorBoundary
				fallback={(error, reset) => (
					<div>
						<p>Error: {error.message}</p>
						<button type="button" onClick={reset}>
							Reset
						</button>
					</div>
				)}
			>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText("Error: Test error")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
	});

	it("resets state on retry click and re-renders children", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const user = userEvent.setup();
		render(<ToggleThrow />);

		// Initially throwing — fallback shown
		expect(
			screen.getByRole("button", { name: "Try Again" }),
		).toBeInTheDocument();

		// Click resets error boundary and flips shouldThrow to false
		await user.click(screen.getByRole("button", { name: "Try Again" }));

		// Children should now render
		expect(screen.getByText("Child content")).toBeInTheDocument();
	});
});
