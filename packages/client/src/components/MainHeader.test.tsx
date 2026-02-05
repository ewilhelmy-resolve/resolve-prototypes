import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainHeader } from "./MainHeader";

describe("MainHeader", () => {
	describe("Title", () => {
		it("renders title as h1", () => {
			render(<MainHeader title="Page Title" />);
			const heading = screen.getByRole("heading", { level: 1 });
			expect(heading).toHaveTextContent("Page Title");
		});
	});

	describe("Description", () => {
		it("renders description when provided", () => {
			render(
				<MainHeader title="Title" description="This is a description" />
			);
			expect(screen.getByText("This is a description")).toBeInTheDocument();
		});

		it("does not render description when not provided", () => {
			const { container } = render(<MainHeader title="Title" />);
			const description = container.querySelector(".text-muted-foreground");
			expect(description).not.toBeInTheDocument();
		});

		it("renders ReactNode description", () => {
			render(
				<MainHeader
					title="Title"
					description={<span data-testid="custom-desc">Custom content</span>}
				/>
			);
			expect(screen.getByTestId("custom-desc")).toBeInTheDocument();
		});
	});

	describe("Action slot", () => {
		it("renders action element when provided", () => {
			render(
				<MainHeader
					title="Title"
					action={<button data-testid="action-btn">Action</button>}
				/>
			);
			expect(screen.getByTestId("action-btn")).toBeInTheDocument();
		});

		it("does not render action wrapper when not provided", () => {
			const { container } = render(<MainHeader title="Title" />);
			const flexContainer = container.querySelector(
				".flex.justify-between.items-center"
			);
			expect(flexContainer?.children.length).toBe(1);
		});
	});

	describe("Stats slot", () => {
		it("renders stats when provided", () => {
			render(
				<MainHeader
					title="Title"
					stats={<div data-testid="stats">Statistics</div>}
				/>
			);
			expect(screen.getByTestId("stats")).toBeInTheDocument();
		});

		it("does not render stats when not provided", () => {
			const { container } = render(<MainHeader title="Title" />);
			const statsWrapper = container.querySelector(".mt-4");
			expect(statsWrapper).not.toBeInTheDocument();
		});
	});

	describe("Full composition", () => {
		it("renders all slots together", () => {
			render(
				<MainHeader
					title="Knowledge Articles"
					description="Manage your knowledge base"
					action={<button>Add Article</button>}
					stats={<div>42 articles</div>}
				/>
			);

			expect(
				screen.getByRole("heading", { name: "Knowledge Articles" })
			).toBeInTheDocument();
			expect(screen.getByText("Manage your knowledge base")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Add Article" })).toBeInTheDocument();
			expect(screen.getByText("42 articles")).toBeInTheDocument();
		});
	});
});
